// E2E Test-Only Auth Endpoint
// Bypasses the rate-limited signIn server action so Playwright globalSetup
// can establish authenticated sessions without accumulating rate-limit counts
// across multiple test runs (the in-memory limiter persists while reuseExistingServer is true).
//
// SECURITY: This endpoint is ONLY active when SUPABASE_E2E_ALLOW_REMOTE=true.
// That env var must never be set in production. Any request without it gets 403.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // Hard gate — never available in production, regardless of env vars
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Only allowed when explicitly opted into E2E remote testing
  if (process.env.SUPABASE_E2E_ALLOW_REMOTE !== 'true') {
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

  // Use the standard SSR server client — it handles cookie setting automatically
  const supabase = createServerClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.session) {
    return NextResponse.json({ error: error?.message ?? 'Sign-in failed' }, { status: 401 })
  }

  // Cookies are set on the response via the SSR client's setAll handler.
  // Playwright captures Set-Cookie headers from page.request.post() responses.
  return NextResponse.json({ ok: true, userId: data.user.id })
}
