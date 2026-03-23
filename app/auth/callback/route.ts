// Auth callback handler (legacy compatibility)
// Auth.js handles OAuth callbacks at /api/auth/callback/[provider]
// This route exists for backward compatibility with old links and password reset flows.

import { NextResponse } from 'next/server'

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
  const next = safeRedirectPath(searchParams.get('next'))
  const token = searchParams.get('token')

  // Password reset token flow - redirect to reset page with token
  if (token && next === '/auth/reset-password') {
    return NextResponse.redirect(`${origin}/auth/reset-password?token=${encodeURIComponent(token)}`)
  }

  // For any other callback, redirect to the intended destination or signin
  if (next && next !== '/') {
    return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/auth/signin`)
}
