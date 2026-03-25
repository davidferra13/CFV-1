// E2E Test-Only Auth Endpoint
// Bypasses the rate-limited signIn server action so Playwright globalSetup
// can establish authenticated sessions without accumulating rate-limit counts
// across multiple test runs (the in-memory limiter persists while reuseExistingServer is true).
//
// SECURITY: This endpoint is ONLY active when E2E_ALLOW_TEST_AUTH=true.
// That env var must never be set in production. Any request without it gets 403.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authUsers } from '@/lib/db/schema/auth'
import { userRoles, clients } from '@/lib/db/schema/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { encode } from 'next-auth/jwt'

export async function POST(req: NextRequest) {
  // Hard gate - never available in production, regardless of env vars
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Only allowed when explicitly opted into E2E testing
  // Accept both old and new env var names for backward compatibility
  if (
    process.env.E2E_ALLOW_TEST_AUTH !== 'true' &&
    process.env.DATABASE_E2E_ALLOW_REMOTE !== 'true'
  ) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  let email: string, password: string
  try {
    const body = await req.json()
    email = body.email
    password = body.password
    if (!email || !password) throw new Error('Missing credentials')
  } catch {
    return new NextResponse('Bad Request', { status: 400 })
  }

  try {
    // Verify credentials directly
    const [user] = await db
      .select({
        id: authUsers.id,
        email: authUsers.email,
        encryptedPassword: authUsers.encryptedPassword,
      })
      .from(authUsers)
      .where(eq(authUsers.email, email.trim().toLowerCase()))
      .limit(1)

    if (!user?.encryptedPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.encryptedPassword)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Create Auth.js session token directly for E2E testing
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
    if (!secret) {
      return NextResponse.json({ error: 'Auth secret not configured' }, { status: 500 })
    }

    const cookieName =
      (process.env.NODE_ENV as string) === 'production'
        ? '__Secure-authjs.session-token'
        : 'authjs.session-token'

    // Resolve role and tenant for the user
    let role = ''
    let entityId = ''
    let tenantId: string | null = null

    const [roleRow] = await db
      .select({ role: userRoles.role, entityId: userRoles.entityId })
      .from(userRoles)
      .where(eq(userRoles.authUserId, user.id))
      .limit(1)

    if (roleRow) {
      role = roleRow.role
      entityId = roleRow.entityId
      if (roleRow.role === 'chef') {
        tenantId = roleRow.entityId
      } else if (roleRow.role === 'client') {
        const [clientRow] = await db
          .select({ tenantId: clients.tenantId })
          .from(clients)
          .where(eq(clients.id, roleRow.entityId))
          .limit(1)
        tenantId = clientRow?.tenantId ?? null
      }
    }

    const token = await encode({
      token: {
        userId: user.id,
        email: user.email ?? email,
        role,
        entityId,
        tenantId,
      },
      secret,
      salt: cookieName,
    } as any)

    // Set the Auth.js session cookie
    const response = NextResponse.json({ ok: true, userId: user.id })

    response.cookies.set(cookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: (process.env.NODE_ENV as string) === 'production',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return response
  } catch (err: any) {
    console.error('[e2e/auth] Error:', err?.message, err?.stack)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
