// CSRF Origin validation for API routes
//
// Next.js Server Actions are auto-CSRF-protected. API routes are NOT.
// This helper validates that POST/PUT/PATCH/DELETE requests to session-based
// API routes originate from the same site, blocking cross-origin form attacks.

import { type NextRequest, NextResponse } from 'next/server'

/**
 * Validates that a request's Origin (or Referer) header matches the app's host.
 * Returns null if the request is safe, or a 403 NextResponse if cross-origin.
 *
 * Usage:
 *   const csrfError = verifyCsrfOrigin(request)
 *   if (csrfError) return csrfError
 */
export function verifyCsrfOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const host = request.headers.get('host')

  // If no origin or referer, allow (some browsers strip these for same-origin requests,
  // and server-to-server calls won't have them). The SameSite=Lax cookie setting
  // already blocks most cross-site POST attacks.
  if (!origin && !referer) return null

  // Build list of allowed origins from the Host header
  const allowedHosts: string[] = []
  if (host) {
    allowedHosts.push(host.split(':')[0]) // strip port
  }
  // Always allow localhost variants for development
  allowedHosts.push('localhost', '127.0.0.1')
  // Allow known production/beta hosts
  allowedHosts.push('app.cheflowhq.com', 'beta.cheflowhq.com', 'cheflowhq.com')

  // Check Origin header
  if (origin) {
    try {
      const originHost = new URL(origin).hostname
      if (allowedHosts.includes(originHost)) return null
    } catch {
      // Invalid origin URL - block
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fallback to Referer header
  if (referer) {
    try {
      const refererHost = new URL(referer).hostname
      if (allowedHosts.includes(refererHost)) return null
    } catch {
      // Invalid referer URL - block
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return null
}
