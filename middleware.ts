// Root Middleware - Layer 1 of Defense in Depth
// Enforces authentication and role-based routing BEFORE any page loads
// No "flash of wrong portal" - blocks at network level

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require chef role (route groups don't create URL segments)
const chefPaths = [
  '/dashboard', '/queue', '/leads', '/clients', '/events', '/financials', '/menus',
  '/inquiries', '/quotes', '/expenses', '/schedule', '/settings',
  '/aar', '/recipes', '/loyalty', '/import', '/chat', '/network', '/onboarding',
]
// Routes that require client role
const clientPaths = ['/my-events', '/my-quotes', '/my-chat', '/my-profile', '/my-rewards', '/book-now']
// Paths that skip all auth processing
const skipAuthPaths = ['/pricing', '/contact', '/privacy', '/terms', '/unauthorized', '/share', '/chef', '/partner-signup', '/chefs', '/survey']
// Admin paths — require authentication but not a specific role (email check is in layout)
const adminPaths = ['/admin']

/**
 * Copy Supabase session cookies from the internal response onto a redirect response.
 * This ensures token refreshes performed by getUser() are not lost on redirects.
 */
function redirectWithCookies(url: URL, sourceResponse: NextResponse): NextResponse {
  const redirectResponse = NextResponse.redirect(url)
  sourceResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
    redirectResponse.cookies.set(name, value, options)
  })
  return redirectResponse
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Auth pages, webhooks, and Google/Gmail API routes - no processing needed
  // /api/e2e/* endpoints establish test sessions — they must be reachable unauthenticated
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/gmail') ||
    pathname.startsWith('/api/scheduled') ||
    pathname.startsWith('/api/e2e')
  ) {
    return NextResponse.next()
  }

  // Static public pages + /unauthorized - no auth check needed
  // /share paths use startsWith to allow /share/[token] subpaths
  if (skipAuthPaths.some((path) => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next()
  }

  // Build request headers with current pathname so server components can read it
  // without an additional DB call or breaking the App Router server component model.
  // Used by app/(chef)/layout.tsx for the onboarding gate.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  // Create Supabase client for middleware with getAll/setAll cookie API
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // When "Stay signed in" was unchecked, a session-only marker cookie is set.
  // We strip maxAge from Supabase auth cookies so they expire when the browser closes.
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = sessionOnly
              ? { ...options, maxAge: undefined }
              : options
            response.cookies.set(name, value, cookieOptions)
          })
        },
      },
    }
  )

  // Get authenticated user (also refreshes session if token is expired)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Role cache cookie — avoids a DB round-trip on every navigation.
  // The layout's requireChef() / requireClient() remain the authoritative security check.
  const roleCookieName = 'chefflow-role-cache'
  const cachedRole = request.cookies.get(roleCookieName)?.value
  const roleIsKnown = cachedRole === 'chef' || cachedRole === 'client'

  // Helper: write the role cookie onto a response, mirroring the sessionOnly flag.
  function setRoleCookie(res: NextResponse, role: string) {
    res.cookies.set(roleCookieName, role, {
      maxAge: sessionOnly ? undefined : 300, // 5 min persistent, or session-scoped
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })
  }

  // Landing page: show public page if not logged in, redirect to dashboard if logged in
  if (pathname === '/') {
    if (!user) {
      return response
    }
    // Authenticated user on landing page — use cached role if available
    let landingRole = roleIsKnown ? cachedRole : undefined
    if (!landingRole) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('auth_user_id', user.id)
        .single()
      landingRole = roleData?.role
      if (landingRole) setRoleCookie(response, landingRole)
    }
    if (landingRole === 'client') {
      return redirectWithCookies(new URL('/my-events', request.url), response)
    }
    return redirectWithCookies(new URL('/dashboard', request.url), response)
  }

  // All remaining routes require authentication
  if (!user) {
    const redirectUrl = new URL('/auth/signin', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return redirectWithCookies(redirectUrl, response)
  }

  // Get user role — served from cookie cache when fresh, DB otherwise
  let roleData: { role: string } | null = null
  if (roleIsKnown) {
    roleData = { role: cachedRole }
  } else {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()
    roleData = data
    if (roleData) setRoleCookie(response, roleData.role)
  }

  if (!roleData) {
    // No role found - send to unauthorized (which is in skipAuthPaths to avoid loops)
    return redirectWithCookies(new URL('/unauthorized', request.url), response)
  }

  // Admin paths — any authenticated user can reach /admin; the layout enforces the email check
  const isAdminRoute = adminPaths.some((path) => pathname === path || pathname.startsWith(path + '/'))
  if (isAdminRoute) {
    return response
  }

  // Enforce role-based routing using actual URL paths
  const isChefRoute = chefPaths.some((path) => pathname === path || pathname.startsWith(path + '/'))
  const isClientRoute = clientPaths.some((path) => pathname === path || pathname.startsWith(path + '/'))

  if (isChefRoute && roleData.role !== 'chef') {
    return redirectWithCookies(new URL('/my-events', request.url), response)
  }

  if (isClientRoute && roleData.role !== 'client') {
    return redirectWithCookies(new URL('/dashboard', request.url), response)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
