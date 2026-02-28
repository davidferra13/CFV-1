// Auth callback handler
// Exchanges auth code for a Supabase session (OAuth, password recovery, etc.)

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/** Validate redirect path to prevent open redirect attacks */
function safeRedirectPath(raw: string | null): string {
  if (!raw) return '/'
  try {
    const url = new URL(raw, 'http://localhost')
    if (url.origin !== 'http://localhost') return '/'
    return url.pathname + url.search
  } catch {
    return '/'
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeRedirectPath(searchParams.get('next'))

  if (code) {
    const supabase: any = createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Auth failed — determine appropriate error message based on intended flow
  const isPasswordReset = next === '/auth/reset-password'
  const errorMessage = isPasswordReset
    ? 'Password reset link is invalid or has expired. Please request a new one.'
    : 'Authentication failed. Please try again.'

  const redirectPath = isPasswordReset ? '/auth/forgot-password' : '/auth/signin'
  return NextResponse.redirect(`${origin}${redirectPath}?error=${encodeURIComponent(errorMessage)}`)
}
