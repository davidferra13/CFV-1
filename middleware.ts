// Root Middleware - Layer 1 of Defense in Depth
// Enforces authentication and role-based routing BEFORE any page loads
// No "flash of wrong portal" - blocks at network level

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { signRoleCookie, verifyRoleCookie } from '@/lib/auth/signed-cookie'

/** Generate a short, URL-safe correlation ID for request tracing. */
function generateRequestId(): string {
  // crypto.randomUUID() is available in the Edge Runtime (middleware)
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16)
}

// Routes that require chef role (route groups don't create URL segments)
const chefPaths = [
  '/dashboard',
  '/queue',
  '/leads',
  '/clients',
  '/events',
  '/financials',
  '/menus',
  '/inquiries',
  '/quotes',
  '/expenses',
  '/schedule',
  '/settings',
  '/aar',
  '/recipes',
  '/loyalty',
  '/import',
  '/chat',
  '/network',
  '/onboarding',
]
// Routes that require client role
const clientPaths = [
  '/my-events',
  '/my-quotes',
  '/my-chat',
  '/my-profile',
  '/my-rewards',
  '/book-now',
]
// Routes that require staff role
const staffPaths = [
  '/staff-dashboard',
  '/staff-station',
  '/staff-recipes',
  '/staff-schedule',
  '/staff-tasks',
]
// Paths that skip all auth processing
const skipAuthPaths = [
  '/pricing',
  '/contact',
  '/privacy',
  '/terms',
  '/unauthorized',
  '/share',
  '/view',
  '/event',
  '/chef',
  '/cannabis/public',
  '/partner-signup',
  '/chefs',
  '/survey',
  '/book',
  '/embed',
  '/demo',
  '/staff-login',
  '/reactivate-account',
  '/kiosk',
  '/beta',
  '/hub',
]
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
    pathname.startsWith('/api/e2e') ||
    pathname.startsWith('/api/remy/public') ||
    pathname.startsWith('/api/remy/landing') ||
    pathname.startsWith('/api/ollama-status') ||
    pathname.startsWith('/api/ai/health') ||
    pathname.startsWith('/api/ai/monitor') ||
    pathname.startsWith('/api/embed') ||
    pathname.startsWith('/api/demo') ||
    pathname.startsWith('/api/monitoring') ||
    pathname.startsWith('/api/inngest') ||
    pathname.startsWith('/api/kiosk') ||
    pathname.startsWith('/api/feeds')
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
  //
  // X-Request-ID: correlation ID for distributed tracing and log correlation.
  // Reuses the incoming header if already set (e.g. by a proxy/load balancer).
  const requestId = request.headers.get('x-request-id') ?? generateRequestId()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  requestHeaders.set('x-request-id', requestId)

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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = sessionOnly ? { ...options, maxAge: undefined } : options
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
  // HMAC-signed to prevent client-side tampering.
  const roleCookieName = 'chefflow-role-cache'
  const rawCachedRole = request.cookies.get(roleCookieName)?.value
  const cachedRole = rawCachedRole ? await verifyRoleCookie(rawCachedRole) : null
  const roleIsKnown = cachedRole === 'chef' || cachedRole === 'client' || cachedRole === 'staff'

  // Helper: write the HMAC-signed role cookie onto a response, mirroring the sessionOnly flag.
  async function setRoleCookie(res: NextResponse, role: string) {
    const signedValue = await signRoleCookie(role)
    res.cookies.set(roleCookieName, signedValue, {
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
      if (landingRole) await setRoleCookie(response, landingRole)
    }
    if (landingRole === 'client') {
      return redirectWithCookies(new URL('/my-events', request.url), response)
    }
    if (landingRole === 'staff') {
      return redirectWithCookies(new URL('/staff-dashboard', request.url), response)
    }
    if (landingRole === 'partner') {
      return redirectWithCookies(new URL('/partner/dashboard', request.url), response)
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
    if (roleData) await setRoleCookie(response, roleData.role)
  }

  if (!roleData) {
    // No role found for an authenticated user.
    // Redirect them to the role selection page, unless they are already there.
    if (pathname !== '/auth/role-selection') {
      return redirectWithCookies(new URL('/auth/role-selection', request.url), response)
    }
    return response
  }

  // Admin paths — defense-in-depth: check admin email list in middleware AND layout
  const isAdminRoute = adminPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )
  if (isAdminRoute) {
    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
    if (
      adminEmails.length === 0 ||
      !user.email ||
      !adminEmails.includes(user.email.toLowerCase())
    ) {
      return redirectWithCookies(new URL('/unauthorized', request.url), response)
    }
    return response
  }

  // Enforce role-based routing using actual URL paths
  const isChefRoute = chefPaths.some((path) => pathname === path || pathname.startsWith(path + '/'))
  const isClientRoute = clientPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )

  if (isChefRoute && roleData.role !== 'chef') {
    return redirectWithCookies(new URL('/my-events', request.url), response)
  }

  if (isClientRoute && roleData.role !== 'client') {
    return redirectWithCookies(new URL('/dashboard', request.url), response)
  }

  // Enforce staff-only routes
  const isStaffRoute = staffPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )

  if (isStaffRoute && roleData.role !== 'staff') {
    // Non-staff users trying to access staff pages get redirected to their home
    if (roleData.role === 'client') {
      return redirectWithCookies(new URL('/my-events', request.url), response)
    }
    return redirectWithCookies(new URL('/dashboard', request.url), response)
  }

  // Propagate the correlation ID on every response so clients can include it in support requests
  response.headers.set('x-request-id', requestId)
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
