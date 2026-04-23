import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import {
  isApiSkipAuthPath,
  isPublicAssetPath,
  isChefRoutePath,
  isClientRoutePath,
  isPublicUnauthenticatedPath,
  isStaffRoutePath,
  isPartnerRoutePath,
} from '@/lib/auth/route-policy'
import { isKnowledgeIngredientPubliclyIndexable } from '@/lib/openclaw/public-ingredient-publish'
import {
  setPathnameHeader,
  setRequestAuthContext,
  stripInternalRequestHeaders,
} from '@/lib/auth/request-auth-context'
import { resolveAuthCookieOptions } from '@/lib/auth/request-origin'

/** Attach correlation ID to a response. Used on every exit path except static assets. */
function withRequestId(response: NextResponse, requestId: string): NextResponse {
  response.headers.set('X-Request-ID', requestId)
  return response
}

const roleCookieName = 'chefflow-role-cache'

function getHomePathForRole(role: string | null | undefined): string {
  switch (role) {
    case 'client':
      return '/my-events'
    case 'staff':
      return '/staff-dashboard'
    case 'partner':
      return '/partner/dashboard'
    default:
      return '/dashboard'
  }
}

/**
 * Build a redirect URL that preserves the client-facing origin.
 * Behind Cloudflare Tunnel, request.url is http://localhost:3100 but
 * the user's browser is on https://app.cheflowhq.com. We use the
 * Host header (which the tunnel preserves) to construct the correct URL.
 */
function buildRedirectUrl(request: NextRequest, path: string): URL {
  const proto =
    request.headers.get('x-forwarded-proto') || (request.url.startsWith('https') ? 'https' : 'http')
  const host = request.headers.get('host') || new URL(request.url).host
  return new URL(path, `${proto}://${host}`)
}

function getBlockedIngredientSlug(pathname: string): string | null {
  if (!pathname.startsWith('/ingredient/')) {
    return null
  }

  const slug = pathname.slice('/ingredient/'.length).split('/')[0]?.trim().toLowerCase()
  if (!slug) {
    return null
  }

  return isKnowledgeIngredientPubliclyIndexable({ slug }) ? null : slug
}

/**
 * Auth.js v5 middleware wrapper.
 * The auth() function decodes the JWT from the session cookie and attaches
 * the session to request.auth. No DB query per request - role/tenant are
 * cached in the JWT from login time.
 */
export default auth(async (request) => {
  // Generate a unique correlation ID for this request. Set on request headers so
  // server components/actions can read it via headers().get('x-request-id'), and
  // set on response headers so it's visible in browser DevTools.
  const requestId = crypto.randomUUID()

  const { pathname } = request.nextUrl
  const blockedIngredientSlug = getBlockedIngredientSlug(pathname)
  const { useSecureCookies } = resolveAuthCookieOptions({
    requestOrigin: request.nextUrl.origin,
    forwardedProto: request.headers.get('x-forwarded-proto'),
    forwardedHost: request.headers.get('x-forwarded-host'),
    host: request.headers.get('host'),
  })

  if (isPublicAssetPath(pathname)) {
    return NextResponse.next()
  }

  if (blockedIngredientSlug) {
    const response = new NextResponse('Ingredient not found', {
      status: 404,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'x-robots-tag': 'noindex, nofollow',
      },
    })
    return withRequestId(response, requestId)
  }

  // Strip internal auth headers on public and skip-auth paths so spoofed
  // x-cf-* values never reach downstream helpers like getCurrentUser().
  // Restore x-pathname so layout-level surface governance and request
  // observability can still classify the active route honestly.
  if (isApiSkipAuthPath(pathname)) {
    const sanitized = new Headers(request.headers)
    stripInternalRequestHeaders(sanitized)
    sanitized.set('x-request-id', requestId)
    setPathnameHeader(sanitized, pathname)
    return withRequestId(NextResponse.next({ request: { headers: sanitized } }), requestId)
  }

  if (isPublicUnauthenticatedPath(pathname)) {
    const sanitized = new Headers(request.headers)
    stripInternalRequestHeaders(sanitized)
    sanitized.set('x-request-id', requestId)
    setPathnameHeader(sanitized, pathname)
    return withRequestId(NextResponse.next({ request: { headers: sanitized } }), requestId)
  }

  const requestHeaders = new Headers(request.headers)
  stripInternalRequestHeaders(requestHeaders)
  requestHeaders.set('x-request-id', requestId)
  setPathnameHeader(requestHeaders, pathname)
  setRequestAuthContext(requestHeaders, null)

  // Auth.js attaches the decoded JWT session to request.auth
  const session = request.auth

  if (!session?.user) {
    if (pathname === '/') {
      return withRequestId(NextResponse.next({ request: { headers: requestHeaders } }), requestId)
    }

    if (pathname.startsWith('/api/')) {
      const r = NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return withRequestId(r, requestId)
    }

    const redirectUrl = buildRedirectUrl(request, '/auth/signin')
    redirectUrl.searchParams.set('redirect', pathname)
    return withRequestId(NextResponse.redirect(redirectUrl), requestId)
  }

  const { user } = session
  const role = user.role
  const entityId = user.entityId
  const tenantId = user.tenantId ?? null

  if (!role || !entityId) {
    // Authenticated but no role (new OAuth user) - send to role selection
    if (pathname !== '/auth/role-selection' && !pathname.startsWith('/api/auth')) {
      return withRequestId(
        NextResponse.redirect(buildRedirectUrl(request, '/auth/role-selection')),
        requestId
      )
    }
    return withRequestId(NextResponse.next({ request: { headers: requestHeaders } }), requestId)
  }

  // Set auth context headers for downstream server components/actions
  if (role === 'chef' || role === 'client') {
    setRequestAuthContext(requestHeaders, {
      userId: user.id,
      email: user.email ?? '',
      role: role as 'chef' | 'client',
      entityId,
      tenantId,
    })
  }

  // Build response with auth context headers
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('X-Request-ID', requestId)

  // Set role cookie for client-side access
  const sessionOnly = request.cookies.get('chefflow-session-only')?.value === '1'
  response.cookies.set(roleCookieName, role, {
    maxAge: sessionOnly ? undefined : 300,
    httpOnly: true,
    secure: useSecureCookies,
    sameSite: 'lax',
    path: '/',
  })

  // Route-level access control
  if (pathname === '/') {
    return withRequestId(
      NextResponse.redirect(buildRedirectUrl(request, getHomePathForRole(role))),
      requestId
    )
  }

  if (isChefRoutePath(pathname) && role !== 'chef') {
    return withRequestId(
      NextResponse.redirect(buildRedirectUrl(request, getHomePathForRole(role))),
      requestId
    )
  }

  if (isClientRoutePath(pathname) && role !== 'client') {
    return withRequestId(
      NextResponse.redirect(buildRedirectUrl(request, getHomePathForRole(role))),
      requestId
    )
  }

  if (isStaffRoutePath(pathname) && role !== 'staff') {
    return withRequestId(
      NextResponse.redirect(buildRedirectUrl(request, getHomePathForRole(role))),
      requestId
    )
  }

  if (isPartnerRoutePath(pathname) && role !== 'partner') {
    return withRequestId(
      NextResponse.redirect(buildRedirectUrl(request, getHomePathForRole(role))),
      requestId
    )
  }

  return response
})

export const config = {
  matcher: [
    '/((?!api/(?:auth|webhooks|build-version|gmail|scheduled|e2e|remy/client|remy/stream|remy/public|remy/landing|ollama-status|health|ai/health|ai/monitor|documents|embed|demo|monitoring|inngest|kiosk|feeds|v2|storage|realtime|book|cron|sentinel|openclaw/webhook|ingredients|calling)|_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|sw.js|inbox-sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html)$).*)',
  ],
}
