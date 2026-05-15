import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/auth/clear
 * Nukes all auth cookies and redirects to signin.
 * Fixes ERR_TOO_MANY_REDIRECTS caused by stale/corrupt session cookies.
 */
export async function GET(request: NextRequest) {
  const url = new URL('/auth/signin', request.url)
  const response = NextResponse.redirect(url)

  // Clear every known auth cookie variant (secure + non-secure prefixes)
  const cookieNames = [
    'authjs.session-token',
    'authjs.csrf-token',
    'authjs.callback-url',
    '__Secure-authjs.session-token',
    '__Secure-authjs.csrf-token',
    '__Secure-authjs.callback-url',
    '__Host-authjs.csrf-token',
    'chefflow-role-cache',
    'chefflow-session-only',
  ]

  for (const name of cookieNames) {
    response.cookies.set(name, '', { maxAge: 0, path: '/' })
  }

  return response
}
