// Root Middleware - Layer 1 of Defense in Depth
// Enforces authentication and role-based routing BEFORE any page loads
// No "flash of wrong portal" - blocks at network level

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes - no auth required
  const publicPaths = ['/', '/pricing', '/contact']
  const authPaths = ['/auth']

  if (publicPaths.some((path) => pathname === path)) {
    return NextResponse.next()
  }

  if (authPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Exclude API webhooks from auth check (they use signature verification)
  if (pathname.startsWith('/api/webhooks')) {
    return NextResponse.next()
  }

  // Create Supabase client for middleware
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes require authentication
  if (!user) {
    const redirectUrl = new URL('/auth/signin', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Get user role from authoritative source
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!roleData) {
    // User has no role - redirect to error
    return NextResponse.redirect(new URL('/auth/error', request.url))
  }

  // Enforce role-based routing (no cross-portal access)
  if (pathname.startsWith('/chef') && roleData.role !== 'chef') {
    // Client trying to access chef portal - redirect to client portal
    return NextResponse.redirect(new URL('/client/my-events', request.url))
  }

  if (pathname.startsWith('/client') && roleData.role !== 'client') {
    // Chef trying to access client portal - redirect to chef portal
    return NextResponse.redirect(new URL('/chef/dashboard', request.url))
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
