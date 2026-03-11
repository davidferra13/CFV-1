/**
 * Unit tests for middleware routing policy and role redirect logic.
 *
 * Run: node --test --import tsx tests/unit/middleware.routing.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  API_SKIP_AUTH_PREFIXES,
  PUBLIC_UNAUTHENTICATED_PATHS,
  isAdminRoutePath,
  isApiSkipAuthPath,
  isChefRoutePath,
  isClientRoutePath,
  isPublicUnauthenticatedPath,
  isStaffRoutePath,
} from '../../lib/auth/route-policy'

function getRedirectForRole(pathname: string, role: string): string | null {
  if (isChefRoutePath(pathname) && role !== 'chef') {
    return '/my-events'
  }
  if (isClientRoutePath(pathname) && role !== 'client') {
    return '/dashboard'
  }
  if (isStaffRoutePath(pathname) && role !== 'staff') {
    return role === 'client' ? '/my-events' : '/dashboard'
  }
  return null
}

function getLandingRedirect(role: string): string {
  if (role === 'client') return '/my-events'
  if (role === 'staff') return '/staff-dashboard'
  if (role === 'partner') return '/partner/dashboard'
  return '/dashboard'
}

describe('Route Policy - source of truth coverage', () => {
  it('includes key public marketing routes', () => {
    for (const path of ['/customers', '/faq', '/blog', '/trust', '/unsubscribe']) {
      assert.equal(PUBLIC_UNAUTHENTICATED_PATHS.includes(path), true)
    }
  })

  it('includes expected API bypass namespaces', () => {
    for (const path of ['/api/remy/client', '/api/remy/stream', '/api/webhooks', '/api/e2e']) {
      assert.equal(API_SKIP_AUTH_PREFIXES.includes(path), true)
    }
  })
})

describe('Middleware - chef route matching', () => {
  it('matches exact chef paths', () => {
    assert.equal(isChefRoutePath('/dashboard'), true)
    assert.equal(isChefRoutePath('/clients'), true)
    assert.equal(isChefRoutePath('/events'), true)
    assert.equal(isChefRoutePath('/finance'), true)
    assert.equal(isChefRoutePath('/social'), true)
    assert.equal(isChefRoutePath('/staff'), true)
    assert.equal(isChefRoutePath('/settings'), true)
  })

  it('matches sub-paths', () => {
    assert.equal(isChefRoutePath('/events/abc-123'), true)
    assert.equal(isChefRoutePath('/clients/abc-123/edit'), true)
  })

  it('does not match client or public paths', () => {
    assert.equal(isChefRoutePath('/my-events'), false)
    assert.equal(isChefRoutePath('/pricing'), false)
    assert.equal(isChefRoutePath('/'), false)
  })
})

describe('Middleware - client route matching', () => {
  it('matches exact and nested paths', () => {
    assert.equal(isClientRoutePath('/my-events'), true)
    assert.equal(isClientRoutePath('/my-quotes'), true)
    assert.equal(isClientRoutePath('/my-events/abc-123'), true)
  })

  it('does not match chef paths', () => {
    assert.equal(isClientRoutePath('/dashboard'), false)
    assert.equal(isClientRoutePath('/events'), false)
  })
})

describe('Middleware - staff route matching', () => {
  it('matches staff paths', () => {
    assert.equal(isStaffRoutePath('/staff-dashboard'), true)
    assert.equal(isStaffRoutePath('/staff-station'), true)
    assert.equal(isStaffRoutePath('/staff-tasks'), true)
  })

  it('does not match chef/client paths', () => {
    assert.equal(isStaffRoutePath('/dashboard'), false)
    assert.equal(isStaffRoutePath('/my-events'), false)
  })
})

describe('Middleware - public unauthenticated paths', () => {
  it('matches static marketing pages', () => {
    assert.equal(isPublicUnauthenticatedPath('/pricing'), true)
    assert.equal(isPublicUnauthenticatedPath('/customers'), true)
    assert.equal(isPublicUnauthenticatedPath('/blog'), true)
    assert.equal(isPublicUnauthenticatedPath('/faq'), true)
    assert.equal(isPublicUnauthenticatedPath('/trust'), true)
    assert.equal(isPublicUnauthenticatedPath('/unsubscribe'), true)
  })

  it('matches tokenized public routes', () => {
    assert.equal(isPublicUnauthenticatedPath('/share/abc-123'), true)
    assert.equal(isPublicUnauthenticatedPath('/view/abc-123'), true)
    assert.equal(isPublicUnauthenticatedPath('/availability/abc-123'), true)
    assert.equal(isPublicUnauthenticatedPath('/partner-report/abc-123'), true)
    assert.equal(isPublicUnauthenticatedPath('/cannabis-invite/abc-123'), true)
    assert.equal(isPublicUnauthenticatedPath('/chef/demo-chef'), true)
    assert.equal(isPublicUnauthenticatedPath('/chef/demo-chef/inquire'), true)
    assert.equal(isPublicUnauthenticatedPath('/open-tables/demo-chef'), true)
    assert.equal(isPublicUnauthenticatedPath('/photos/share-token'), true)
  })

  it('does not skip auth for portal routes', () => {
    assert.equal(isPublicUnauthenticatedPath('/dashboard'), false)
    assert.equal(isPublicUnauthenticatedPath('/my-events'), false)
    assert.equal(isPublicUnauthenticatedPath('/staff'), false)
    assert.equal(isPublicUnauthenticatedPath('/chef/cannabis/handbook'), false)
    assert.equal(isPublicUnauthenticatedPath('/open-tables'), false)
    assert.equal(isPublicUnauthenticatedPath('/photos'), false)
    assert.equal(isPublicUnauthenticatedPath('/settings'), false)
  })
})

describe('Middleware - API skip paths', () => {
  it('skips auth for configured API namespaces', () => {
    assert.equal(isApiSkipAuthPath('/api/webhooks/stripe'), true)
    assert.equal(isApiSkipAuthPath('/api/e2e/auth'), true)
    assert.equal(isApiSkipAuthPath('/api/remy/client'), true)
    assert.equal(isApiSkipAuthPath('/api/remy/stream'), true)
    assert.equal(isApiSkipAuthPath('/api/ai/health'), true)
  })

  it('does not skip auth for regular API routes', () => {
    assert.equal(isApiSkipAuthPath('/api/stripe/checkout'), false)
    assert.equal(isApiSkipAuthPath('/api/activity/track'), false)
  })
})

describe('Middleware - admin route matching', () => {
  it('matches admin paths', () => {
    assert.equal(isAdminRoutePath('/admin'), true)
    assert.equal(isAdminRoutePath('/admin/users'), true)
  })

  it('does not match non-admin paths', () => {
    assert.equal(isAdminRoutePath('/dashboard'), false)
    assert.equal(isAdminRoutePath('/settings'), false)
  })
})

describe('Middleware - role redirect logic', () => {
  it('client on chef route redirects to /my-events', () => {
    assert.equal(getRedirectForRole('/dashboard', 'client'), '/my-events')
    assert.equal(getRedirectForRole('/events/abc', 'client'), '/my-events')
  })

  it('chef on client route redirects to /dashboard', () => {
    assert.equal(getRedirectForRole('/my-events', 'chef'), '/dashboard')
  })

  it('client on staff route redirects to /my-events', () => {
    assert.equal(getRedirectForRole('/staff-dashboard', 'client'), '/my-events')
  })

  it('staff on staff route has no redirect', () => {
    assert.equal(getRedirectForRole('/staff-dashboard', 'staff'), null)
  })
})

describe('Middleware - landing page redirect', () => {
  it('maps roles to expected home pages', () => {
    assert.equal(getLandingRedirect('chef'), '/dashboard')
    assert.equal(getLandingRedirect('client'), '/my-events')
    assert.equal(getLandingRedirect('staff'), '/staff-dashboard')
    assert.equal(getLandingRedirect('partner'), '/partner/dashboard')
  })

  it('falls back to chef dashboard for unknown roles', () => {
    assert.equal(getLandingRedirect('unknown'), '/dashboard')
  })
})

describe('Middleware - edge cases', () => {
  it('keeps path matching case-sensitive', () => {
    assert.equal(isChefRoutePath('/Dashboard'), false)
    assert.equal(isClientRoutePath('/My-Events'), false)
  })

  it('treats trailing slash child paths as protected/public matches', () => {
    assert.equal(isChefRoutePath('/dashboard/'), true)
    assert.equal(isClientRoutePath('/my-events/'), true)
    assert.equal(isPublicUnauthenticatedPath('/blog/'), true)
  })

  it('handles substring boundaries correctly', () => {
    assert.equal(isPublicUnauthenticatedPath('/event'), true)
    assert.equal(isChefRoutePath('/events'), true)
    assert.equal(isPublicUnauthenticatedPath('/event/123'), true)
    assert.equal(isChefRoutePath('/events/123'), true)
  })
})
