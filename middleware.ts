import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
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

type PendingCookie = {
  name: string
  value: string
  options?: Record<string, unknown>
}

const roleCookieName = 'chefflow-role-cache'

function applyPendingCookies(
  response: NextResponse,
  pendingCookies: Map<string, PendingCookie>
): NextResponse {
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as any)
  })
  return response
}

function nextWithState(
  requestHeaders: Headers,
  pendingCookies: Map<string, PendingCookie>
): NextResponse {
  return applyPendingCookies(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }),
    pendingCookies
  )
}

function redirectWithState(url: URL, pendingCookies: Map<string, PendingCookie>): NextResponse {
  return applyPendingCookies(NextResponse.redirect(url), pendingCookies)
}

function jsonWithState(
  body: Record<string, unknown>,
  status: number,
  pendingCookies: Map<string, PendingCookie>
): NextResponse {
  return applyPendingCookies(NextResponse.json(body, { status }), pendingCookies)
}

function queueCookie(
  pendingCookies: Map<string, PendingCookie>,
  sessionOnly: boolean,
  name: string,
  value: string,
  options?: Record<string, unknown>
): void {
  pendingCookies.set(name, {
    name,
    value,
    options: sessionOnly && options ? { ...options, maxAge: undefined } : options,
  })
}

function setRoleCookie(
  pendingCookies: Map<string, PendingCookie>,
  sessionOnly: boolean,
  role: string
): void {
  queueCookie(pendingCookies, sessionOnly, roleCookieName, role, {
    maxAge: sessionOnly ? undefined : 300,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

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

export async function middleware(request: NextRequest) {
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

  const pendingCookies = new Map<string, PendingCookie>()
  const sessionOnly = request.cookies.get('chefflow-session-only')?.value === '1'

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            queueCookie(
              pendingCookies,
              sessionOnly,
              name,
              value,
              options as Record<string, unknown>
            )
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (pathname === '/') {
      return nextWithState(requestHeaders, pendingCookies)
    }

    if (pathname.startsWith('/api/')) {
      return jsonWithState({ error: 'Authentication required' }, 401, pendingCookies)
    }

    const redirectUrl = new URL('/auth/signin', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return redirectWithState(redirectUrl, pendingCookies)
  }

  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role, entity_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (roleError) {
    console.error('[middleware] Failed to resolve user role:', roleError)
  }

  if (!roleData) {
    return redirectWithState(new URL('/unauthorized', request.url), pendingCookies)
  }

  setRoleCookie(pendingCookies, sessionOnly, roleData.role)

  let tenantId: string | null = null
  if (roleData.role === 'chef') {
    tenantId = roleData.entity_id
  } else if (roleData.role === 'client') {
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('tenant_id')
      .eq('id', roleData.entity_id)
      .maybeSingle()

    if (clientError) {
      console.error('[middleware] Failed to resolve client tenant:', clientError)
    }

    tenantId = clientData?.tenant_id ?? null
  }

  if (roleData.role === 'chef' || roleData.role === 'client') {
    setRequestAuthContext(requestHeaders, {
      userId: user.id,
      email: user.email ?? '',
      role: roleData.role,
      entityId: roleData.entity_id,
      tenantId,
    })
  }

  if (pathname === '/') {
    return redirectWithState(
      new URL(getHomePathForRole(roleData.role), request.url),
      pendingCookies
    )
  }

  if (isChefRoutePath(pathname) && roleData.role !== 'chef') {
    return redirectWithState(
      new URL(getHomePathForRole(roleData.role), request.url),
      pendingCookies
    )
  }

  if (isClientRoutePath(pathname) && roleData.role !== 'client') {
    return redirectWithState(
      new URL(getHomePathForRole(roleData.role), request.url),
      pendingCookies
    )
  }

  if (isStaffRoutePath(pathname) && roleData.role !== 'staff') {
    return redirectWithState(
      new URL(getHomePathForRole(roleData.role), request.url),
      pendingCookies
    )
  }

  return nextWithState(requestHeaders, pendingCookies)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|sw.js|inbox-sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
