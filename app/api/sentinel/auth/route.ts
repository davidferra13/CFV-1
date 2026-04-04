// Sentinel Auth Endpoint - Production-safe, secret-gated
// Unlike /api/e2e/auth (dev-only), this works in production for the Pi monitor.
// Gated by SENTINEL_SECRET header to prevent unauthorized access.
//
// Usage: POST /api/sentinel/auth
//   Headers: { "x-sentinel-secret": "<SENTINEL_SECRET>" }
//   Body:    { "email": "...", "password": "..." }
//   Returns: Set-Cookie with Auth.js session token

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { checkRateLimit } from '@/lib/rateLimit'
import { db } from '@/lib/db'
import { authUsers } from '@/lib/db/schema/auth'
import { userRoles, clients } from '@/lib/db/schema/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { encode } from 'next-auth/jwt'

export async function POST(req: NextRequest) {
  // Gate: require SENTINEL_SECRET
  const secret = process.env.SENTINEL_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'SENTINEL_SECRET not configured on server' }, { status: 503 })
  }

  const provided = req.headers.get('x-sentinel-secret')
  if (
    !provided ||
    provided.length !== secret.length ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(secret))
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Rate limit: 5 attempts per 15 minutes per IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  try {
    await checkRateLimit(`sentinel-auth:${ip}`, 5, 15 * 60 * 1000)
  } catch {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })
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
    // Verify credentials
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

    // Create Auth.js session token
    const authSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
    if (!authSecret) {
      return NextResponse.json({ error: 'Auth secret not configured' }, { status: 500 })
    }

    const useSecure =
      process.env.NEXTAUTH_URL?.startsWith('https') || process.env.AUTH_URL?.startsWith('https')
    const cookieName = useSecure ? '__Secure-authjs.session-token' : 'authjs.session-token'

    // Resolve role and tenant
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
      secret: authSecret,
      salt: cookieName,
    } as any)

    const response = NextResponse.json({ ok: true, userId: user.id })

    response.cookies.set(cookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: !!useSecure,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return response
  } catch (err: any) {
    console.error('[sentinel/auth] Internal error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
