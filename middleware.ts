import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  isApiSkipAuthPath,
  isPublicAssetPath,
  isChefRoutePath,
  isClientRoutePath,
  isPublicUnauthenticatedPath,
  isStaffRoutePath,
} from '@/lib/auth/route-policy'
import {
  setPathnameHeader,
  setRequestAuthContext,
  stripInternalRequestHeaders,
} from '@/lib/auth/request-auth-context'

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
 * Auth.js v5 middleware wrapper.
 * The auth() function decodes the JWT from the session cookie and attaches
 * the session to request.auth. No DB query per request - role/tenant are
 * cached in the JWT from login time.
 */
export default auth(async (request) => {
  const { pathname } = request.nextUrl

  if (isPublicAssetPath(pathname)) {
    return NextResponse.next()
  }

  if (isApiSkipAuthPath(pathname)) {
    return NextResponse.next()
  }

  if (isPublicUnauthenticatedPath(pathname)) {
    return NextResponse.next()
  }

  const requestHeaders = new Headers(request.headers)
  stripInternalRequestHeaders(requestHeaders)
  setPathnameHeader(requestHeaders, pathname)
  setRequestAuthContext(requestHeaders, null)

  // Auth.js attaches the decoded JWT session to request.auth
  const session = request.auth

  if (!session?.user) {
    if (pathname === '/') {
      return NextResponse.next({ request: { headers: requestHeaders } })
    }

    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const redirectUrl = new URL('/auth/signin', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  const { user } = session
  const role = user.role
  const entityId = user.entityId
  const tenantId = user.tenantId ?? null

  if (!role || !entityId) {
    // Authenticated but no role (new OAuth user) - send to role selection
    if (pathname !== '/auth/role-selection' && !pathname.startsWith('/api/auth')) {
      return NextResponse.redirect(new URL('/auth/role-selection', request.url))
    }
    return NextResponse.next({ request: { headers: requestHeaders } })
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

  // Set role cookie for client-side access
  const sessionOnly = request.cookies.get('chefflow-session-only')?.value === '1'
  response.cookies.set(roleCookieName, role, {
    maxAge: sessionOnly ? undefined : 300,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })

  // Route-level access control
  if (pathname === '/') {
    return NextResponse.redirect(new URL(getHomePathForRole(role), request.url))
  }

  if (isChefRoutePath(pathname) && role !== 'chef') {
    return NextResponse.redirect(new URL(getHomePathForRole(role), request.url))
  }

  if (isClientRoutePath(pathname) && role !== 'client') {
    return NextResponse.redirect(new URL(getHomePathForRole(role), request.url))
  }

  if (isStaffRoutePath(pathname) && role !== 'staff') {
    return NextResponse.redirect(new URL(getHomePathForRole(role), request.url))
  }

  return response
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|sw.js|inbox-sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
