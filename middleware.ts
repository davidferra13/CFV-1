import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import {
  isApiSkipAuthPath,
  isPublicAssetPath,
  isPublicUnauthenticatedPath,
  getRoutePolicyDecisionForRole,
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
const staleRouteRedirects: Record<string, string> = {
  '/food-directory': '/ingredients',
  '/operators': '/for-operators',
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

function getStaleRouteRedirectPath(pathname: string): string | null {
  const normalized =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname

  return staleRouteRedirects[normalized] ?? null
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

  const staleRedirectPath = getStaleRouteRedirectPath(pathname)
  if (staleRedirectPath) {
    const redirectUrl = buildRedirectUrl(request, staleRedirectPath)
    redirectUrl.search = request.nextUrl.search
    const response = NextResponse.redirect(redirectUrl, 308)
    response.headers.set('X-ChefFlow-Recovery-Redirect', pathname)
    return withRequestId(response, requestId)
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

  // Multi-role: propagate auth headers for all human roles
  const propagatableRoles = ['chef', 'client', 'partner', 'staff', 'vendor', 'guest']
  if (role && propagatableRoles.includes(role)) {
    setRequestAuthContext(requestHeaders, {
      userId: user.id,
      email: user.email ?? '',
      role: role as import('@/lib/auth/request-auth-context').PortalRole,
      entityId,
      tenantId,
      activeRoleId: ((user as Record<string, unknown>).activeRoleId as string) ?? '',
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
  // Note: authenticated users may freely visit any public path, including '/'.
  // The public discovery experience is available to all roles.
  if (isPublicUnauthenticatedPath(pathname)) {
    return withRequestId(NextResponse.next({ request: { headers: requestHeaders } }), requestId)
  }

  const routeDecision = getRoutePolicyDecisionForRole(pathname, role)
  if (!routeDecision.allowed && routeDecision.recoveryPath) {
    return withRequestId(
      NextResponse.redirect(buildRedirectUrl(request, routeDecision.recoveryPath)),
      requestId
    )
  }

  return response
})

export const config = {
  matcher: [
    ...(process.env.NODE_ENV === 'production'
      ? [
          '/((?!api/(?:auth|webhooks|build-version|gmail|scheduled|remy/client|remy/stream|remy/public|remy/landing|ollama-status|health|ai/health|ai/monitor|documents|embed|monitoring|inngest|kiosk|feeds|v2|storage|realtime|book|cron|discovery|sentinel|openclaw/webhook|ingredients|calling|llm-txt)|_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|sw.js|inbox-sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html)$).*)',
        ]
      : [
          '/((?!api/(?:auth|webhooks|build-version|gmail|scheduled|e2e|remy/client|remy/stream|remy/public|remy/landing|ollama-status|health|ai/health|ai/monitor|documents|embed|demo|monitoring|inngest|kiosk|feeds|v2|storage|realtime|book|cron|discovery|sentinel|openclaw/webhook|ingredients|calling|llm-txt)|_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|sw.js|inbox-sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html)$).*)',
        ]),
  ],
}
