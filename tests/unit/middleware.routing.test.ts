/**
 * Unit tests for Middleware Routing Logic
 *
 * Tests the path-matching and role-routing logic from middleware.ts.
 * This is P1 — a bug here breaks auth for every route.
 *
 * We extract and test the pure logic (path matching, role routing)
 * without requiring Next.js middleware runtime.
 *
 * Run: npm run test:unit
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// ─────────────────────────────────────────────────────────────────────────────
// PATH DEFINITIONS (exact copy from middleware.ts)
// ─────────────────────────────────────────────────────────────────────────────

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

const clientPaths = [
  '/my-events',
  '/my-quotes',
  '/my-chat',
  '/my-profile',
  '/my-rewards',
  '/book-now',
]

const staffPaths = [
  '/staff-dashboard',
  '/staff-station',
  '/staff-recipes',
  '/staff-schedule',
  '/staff-tasks',
]

const skipAuthPaths = [
  '/pricing',
  '/contact',
  '/privacy',
  '/terms',
  '/unauthorized',
  '/share',
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
]

const adminPaths = ['/admin']

// API paths that skip auth processing (from middleware.ts)
const apiSkipPaths = [
  '/auth',
  '/api/webhooks',
  '/api/auth',
  '/api/gmail',
  '/api/scheduled',
  '/api/e2e',
  '/api/remy/public',
  '/api/remy/landing',
  '/api/ollama-status',
  '/api/ai/health',
  '/api/ai/monitor',
  '/api/embed',
  '/api/demo',
  '/api/monitoring',
  '/api/inngest',
]

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE MATCHING FUNCTIONS (same logic as middleware.ts)
// ─────────────────────────────────────────────────────────────────────────────

function isChefRoute(pathname: string): boolean {
  return chefPaths.some((path) => pathname === path || pathname.startsWith(path + '/'))
}

function isClientRoute(pathname: string): boolean {
  return clientPaths.some((path) => pathname === path || pathname.startsWith(path + '/'))
}

function isStaffRoute(pathname: string): boolean {
  return staffPaths.some((path) => pathname === path || pathname.startsWith(path + '/'))
}

function isSkipAuthRoute(pathname: string): boolean {
  return skipAuthPaths.some((path) => pathname === path || pathname.startsWith(path + '/'))
}

function isApiSkipRoute(pathname: string): boolean {
  return apiSkipPaths.some((path) => pathname.startsWith(path))
}

function isAdminRoute(pathname: string): boolean {
  return adminPaths.some((path) => pathname === path || pathname.startsWith(path + '/'))
}

/**
 * Determines the redirect target for a role mismatch.
 * Mirrors the middleware's redirect logic.
 */
function getRedirectForRole(pathname: string, role: string): string | null {
  if (isChefRoute(pathname) && role !== 'chef') {
    return '/my-events' // clients get redirected to client portal
  }
  if (isClientRoute(pathname) && role !== 'client') {
    return '/dashboard' // chefs get redirected to dashboard
  }
  if (isStaffRoute(pathname) && role !== 'staff') {
    return role === 'client' ? '/my-events' : '/dashboard'
  }
  return null // no redirect needed
}

/**
 * Determines the landing page redirect for authenticated users on '/'.
 */
function getLandingRedirect(role: string): string {
  if (role === 'client') return '/my-events'
  if (role === 'staff') return '/staff-dashboard'
  return '/dashboard' // chef and everything else
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Middleware — chef route matching', () => {
  it('matches exact chef paths', () => {
    assert.equal(isChefRoute('/dashboard'), true)
    assert.equal(isChefRoute('/clients'), true)
    assert.equal(isChefRoute('/events'), true)
    assert.equal(isChefRoute('/financials'), true)
    assert.equal(isChefRoute('/menus'), true)
    assert.equal(isChefRoute('/recipes'), true)
    assert.equal(isChefRoute('/settings'), true)
  })

  it('matches sub-paths', () => {
    assert.equal(isChefRoute('/events/abc-123'), true)
    assert.equal(isChefRoute('/clients/abc-123/edit'), true)
    assert.equal(isChefRoute('/settings/modules'), true)
  })

  it('does NOT match client or public paths', () => {
    assert.equal(isChefRoute('/my-events'), false)
    assert.equal(isChefRoute('/pricing'), false)
    assert.equal(isChefRoute('/'), false)
  })
})

describe('Middleware — client route matching', () => {
  it('matches exact client paths', () => {
    assert.equal(isClientRoute('/my-events'), true)
    assert.equal(isClientRoute('/my-quotes'), true)
    assert.equal(isClientRoute('/my-chat'), true)
    assert.equal(isClientRoute('/my-profile'), true)
    assert.equal(isClientRoute('/my-rewards'), true)
    assert.equal(isClientRoute('/book-now'), true)
  })

  it('matches sub-paths', () => {
    assert.equal(isClientRoute('/my-events/abc-123'), true)
  })

  it('does NOT match chef paths', () => {
    assert.equal(isClientRoute('/dashboard'), false)
    assert.equal(isClientRoute('/events'), false)
  })
})

describe('Middleware — staff route matching', () => {
  it('matches staff paths', () => {
    assert.equal(isStaffRoute('/staff-dashboard'), true)
    assert.equal(isStaffRoute('/staff-station'), true)
    assert.equal(isStaffRoute('/staff-recipes'), true)
    assert.equal(isStaffRoute('/staff-schedule'), true)
    assert.equal(isStaffRoute('/staff-tasks'), true)
  })

  it('does NOT match chef or client paths', () => {
    assert.equal(isStaffRoute('/dashboard'), false)
    assert.equal(isStaffRoute('/my-events'), false)
  })
})

describe('Middleware — skip-auth paths', () => {
  it('matches public pages', () => {
    assert.equal(isSkipAuthRoute('/pricing'), true)
    assert.equal(isSkipAuthRoute('/contact'), true)
    assert.equal(isSkipAuthRoute('/privacy'), true)
    assert.equal(isSkipAuthRoute('/terms'), true)
    assert.equal(isSkipAuthRoute('/unauthorized'), true)
  })

  it('matches embed paths', () => {
    assert.equal(isSkipAuthRoute('/embed'), true)
    assert.equal(isSkipAuthRoute('/embed/inquiry/abc-123'), true)
  })

  it('matches share paths with tokens', () => {
    assert.equal(isSkipAuthRoute('/share/abc-123'), true)
  })

  it('matches demo and survey paths', () => {
    assert.equal(isSkipAuthRoute('/demo'), true)
    assert.equal(isSkipAuthRoute('/survey'), true)
    assert.equal(isSkipAuthRoute('/survey/some-id'), true)
  })

  it('does NOT skip auth for chef/client paths', () => {
    assert.equal(isSkipAuthRoute('/dashboard'), false)
    assert.equal(isSkipAuthRoute('/my-events'), false)
    assert.equal(isSkipAuthRoute('/settings'), false)
  })
})

describe('Middleware — API skip paths', () => {
  it('skips auth for webhook endpoints', () => {
    assert.equal(isApiSkipRoute('/api/webhooks/stripe'), true)
    assert.equal(isApiSkipRoute('/api/webhooks/twilio'), true)
  })

  it('skips auth for e2e test endpoints', () => {
    assert.equal(isApiSkipRoute('/api/e2e/auth'), true)
    assert.equal(isApiSkipRoute('/api/e2e/seed'), true)
  })

  it('skips auth for Remy public endpoints', () => {
    assert.equal(isApiSkipRoute('/api/remy/public'), true)
    assert.equal(isApiSkipRoute('/api/remy/landing'), true)
  })

  it('skips auth for AI health checks', () => {
    assert.equal(isApiSkipRoute('/api/ai/health'), true)
    assert.equal(isApiSkipRoute('/api/ai/monitor'), true)
  })

  it('skips auth for embed API', () => {
    assert.equal(isApiSkipRoute('/api/embed/inquiry'), true)
  })

  it('does NOT skip auth for regular API routes', () => {
    assert.equal(isApiSkipRoute('/api/remy/stream'), false)
    assert.equal(isApiSkipRoute('/api/stripe/checkout'), false)
    assert.equal(isApiSkipRoute('/api/activity/track'), false)
  })
})

describe('Middleware — admin route matching', () => {
  it('matches admin paths', () => {
    assert.equal(isAdminRoute('/admin'), true)
    assert.equal(isAdminRoute('/admin/users'), true)
    assert.equal(isAdminRoute('/admin/platform'), true)
  })

  it('does NOT match non-admin paths', () => {
    assert.equal(isAdminRoute('/dashboard'), false)
    assert.equal(isAdminRoute('/settings'), false)
  })
})

describe('Middleware — role-based redirect logic', () => {
  it('client on chef route → redirects to /my-events', () => {
    assert.equal(getRedirectForRole('/dashboard', 'client'), '/my-events')
    assert.equal(getRedirectForRole('/events/abc', 'client'), '/my-events')
    assert.equal(getRedirectForRole('/settings', 'client'), '/my-events')
  })

  it('chef on client route → redirects to /dashboard', () => {
    assert.equal(getRedirectForRole('/my-events', 'chef'), '/dashboard')
    assert.equal(getRedirectForRole('/my-quotes', 'chef'), '/dashboard')
  })

  it('client on staff route → redirects to /my-events', () => {
    assert.equal(getRedirectForRole('/staff-dashboard', 'client'), '/my-events')
  })

  it('chef on staff route → redirects to /dashboard', () => {
    assert.equal(getRedirectForRole('/staff-dashboard', 'chef'), '/dashboard')
  })

  it('chef on chef route → no redirect (null)', () => {
    assert.equal(getRedirectForRole('/dashboard', 'chef'), null)
    assert.equal(getRedirectForRole('/events/abc', 'chef'), null)
  })

  it('client on client route → no redirect (null)', () => {
    assert.equal(getRedirectForRole('/my-events', 'client'), null)
  })

  it('staff on staff route → no redirect (null)', () => {
    assert.equal(getRedirectForRole('/staff-dashboard', 'staff'), null)
  })

  it('any role on public path → no redirect (null)', () => {
    assert.equal(getRedirectForRole('/pricing', 'chef'), null)
    assert.equal(getRedirectForRole('/pricing', 'client'), null)
  })
})

describe('Middleware — landing page redirect', () => {
  it('chef on / → /dashboard', () => {
    assert.equal(getLandingRedirect('chef'), '/dashboard')
  })

  it('client on / → /my-events', () => {
    assert.equal(getLandingRedirect('client'), '/my-events')
  })

  it('staff on / → /staff-dashboard', () => {
    assert.equal(getLandingRedirect('staff'), '/staff-dashboard')
  })

  it('unknown role on / → /dashboard (fallback)', () => {
    assert.equal(getLandingRedirect('unknown'), '/dashboard')
  })
})

describe('Middleware — edge cases', () => {
  it('paths are case-sensitive (no accidental matching)', () => {
    assert.equal(isChefRoute('/Dashboard'), false)
    assert.equal(isClientRoute('/My-Events'), false)
  })

  it('paths with trailing slashes', () => {
    // Next.js normalizes trailing slashes, but test the logic
    assert.equal(isChefRoute('/dashboard/'), true) // startsWith('/dashboard/')
    assert.equal(isClientRoute('/my-events/'), true)
  })

  it('paths that are substrings but not sub-paths', () => {
    // /event is a skipAuth path, but /events is a chef path
    assert.equal(isSkipAuthRoute('/event'), true)
    assert.equal(isChefRoute('/events'), true)
    // /event/123 should skip auth, /events/123 should require auth
    assert.equal(isSkipAuthRoute('/event/123'), true)
    assert.equal(isChefRoute('/events/123'), true)
  })
})
