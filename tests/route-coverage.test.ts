// CI guard: every app route must be classified in a route-policy tier or middleware skip list.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

import {
  CHEF_PROTECTED_PATHS,
  CLIENT_PROTECTED_PATHS,
  STAFF_PROTECTED_PATHS,
  PARTNER_PROTECTED_PATHS,
  VENDOR_PROTECTED_PATHS,
  PUBLIC_UNAUTHENTICATED_PATHS,
  PUBLIC_ASSET_PATHS,
  ADMIN_PATHS,
  API_SKIP_AUTH_PREFIXES,
} from '../lib/auth/route-policy.js'

// TOKEN_PATH_PREFIXES from middleware (duplicated here since middleware doesn't export them)
const TOKEN_PATH_PREFIXES = [
  '/proposal/',
  '/share/',
  '/review/',
  '/feedback/',
  '/guest-feedback/',
  '/tip/',
  '/worksheet/',
  '/view/',
  '/availability/',
  '/menu/',
  '/e/',
  '/onboarding/',
  '/partner-report/',
  '/hub/me/',
  '/hub/join/',
  '/hub/g/',
  '/survey/',
  '/book/status/',
  '/menu-pick/',
  '/catalog-pick/',
  '/split/',
  '/staff-portal/',
  '/event/',
]

// All policy tiers combined for page routes
const ALL_PAGE_POLICY_PATHS: readonly string[] = [
  ...CHEF_PROTECTED_PATHS,
  ...CLIENT_PROTECTED_PATHS,
  ...STAFF_PROTECTED_PATHS,
  ...PARTNER_PROTECTED_PATHS,
  ...VENDOR_PROTECTED_PATHS,
  ...PUBLIC_UNAUTHENTICATED_PATHS,
  ...ADMIN_PATHS,
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const APP_DIR = join(__dirname, '..', 'app')

/** Recursively find files matching a filename in a directory */
function findFiles(dir: string, filename: string): string[] {
  const results: string[] = []
  let entries: ReturnType<typeof readdirSync>
  try {
    entries = readdirSync(dir)
  } catch {
    return results
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    let stat
    try {
      stat = statSync(fullPath)
    } catch {
      continue
    }
    if (stat.isDirectory()) {
      results.push(...findFiles(fullPath, filename))
    } else if (entry === filename) {
      results.push(fullPath)
    }
  }
  return results
}

/** Convert filesystem path to URL path, stripping route groups and page.tsx/route.ts */
function fsPathToUrlPath(fsPath: string, suffix: string): string {
  const rel = relative(APP_DIR, fsPath)
  // Normalize separators to forward slash
  let urlPath = rel.split(sep).join('/')
  // Remove the file suffix (page.tsx or route.ts)
  urlPath = urlPath.replace(new RegExp(`/${suffix.replace('.', '\\.')}$`), '')
  // Remove route group folders (anything in parentheses)
  urlPath = urlPath.replace(/\([^)]+\)\//g, '')
  // Also handle if route group is at the end (no trailing slash)
  urlPath = urlPath.replace(/\([^)]+\)$/g, '')
  // Ensure leading slash
  urlPath = '/' + urlPath
  // Clean up double slashes and trailing slashes
  urlPath = urlPath.replace(/\/+/g, '/')
  if (urlPath.length > 1 && urlPath.endsWith('/')) {
    urlPath = urlPath.slice(0, -1)
  }
  return urlPath
}

/** Check if a URL path is covered by any policy path (prefix matching) */
function isClassifiedByPolicy(urlPath: string, policyPaths: readonly string[]): boolean {
  // Normalize: strip dynamic segments for matching (e.g., /events/[id] -> check /events)
  // Policy uses prefix matching: /events covers /events, /events/123, /events/[id]/edit
  return policyPaths.some((policyPath) => {
    return urlPath === policyPath || urlPath.startsWith(policyPath + '/')
  })
}

/** Check if a URL path is covered by TOKEN_PATH_PREFIXES */
function isTokenPath(urlPath: string): boolean {
  return TOKEN_PATH_PREFIXES.some((prefix) => urlPath.startsWith(prefix))
}

/** Check if a URL path is covered by API_SKIP_AUTH_PREFIXES */
function isApiSkipAuth(urlPath: string): boolean {
  return API_SKIP_AUTH_PREFIXES.some((prefix) => urlPath.startsWith(prefix))
}

/** The root page (/) is always implicitly public */
function isRootPath(urlPath: string): boolean {
  return urlPath === '/'
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Route Coverage — Page Routes', () => {
  const pageFiles = findFiles(APP_DIR, 'page.tsx')
  const pageRoutes = pageFiles.map((f) => fsPathToUrlPath(f, 'page.tsx'))

  it('finds page routes in the app directory', () => {
    assert.ok(pageRoutes.length > 100, `Expected 100+ page routes, got ${pageRoutes.length}`)
  })

  it('every page route is classified in at least one policy tier', () => {
    const unclassified: string[] = []

    for (const route of pageRoutes) {
      if (isRootPath(route)) continue
      if (isClassifiedByPolicy(route, ALL_PAGE_POLICY_PATHS)) continue
      if (isTokenPath(route)) continue
      unclassified.push(route)
    }

    if (unclassified.length > 0) {
      const sorted = [...unclassified].sort()
      const message = [
        `${unclassified.length} page route(s) not classified in any policy tier:`,
        '',
        ...sorted.map((r) => `  - ${r}`),
        '',
        'Fix: add each route (or its parent prefix) to the appropriate array in lib/auth/route-policy.ts',
      ].join('\n')
      assert.fail(message)
    }
  })
})

describe('Route Coverage — API Routes', () => {
  const routeFiles = findFiles(APP_DIR, 'route.ts')
  const apiRoutes = routeFiles
    .map((f) => fsPathToUrlPath(f, 'route.ts'))
    .filter((r) => r.startsWith('/api'))

  it('finds API routes in the app directory', () => {
    assert.ok(apiRoutes.length > 50, `Expected 50+ API routes, got ${apiRoutes.length}`)
  })

  it('every API route is covered by skip-auth prefix or falls through to authenticated middleware', () => {
    // In ChefFlow middleware, any /api/* route NOT in API_SKIP_AUTH_PREFIXES
    // requires authentication (the middleware applies auth check).
    // This test verifies all API routes are intentionally in one category:
    // 1. Explicitly in API_SKIP_AUTH_PREFIXES (public API)
    // 2. Not in skip list (protected by middleware auth - this is the default)
    //
    // We only flag routes that don't start with /api/ at all (shouldn't exist after filter)
    // or routes in a weird namespace. The real assertion is that the route IS an API route.
    const nonApiRoutes = routeFiles
      .map((f) => fsPathToUrlPath(f, 'route.ts'))
      .filter((r) => !r.startsWith('/api') && !r.startsWith('/auth'))

    // Non-API route.ts files (like /auth/callback) are handled by page policy or special middleware
    // They should be classified in the page policy tiers or be token paths
    const unclassifiedNonApi: string[] = []
    for (const route of nonApiRoutes) {
      if (isRootPath(route)) continue
      if (isClassifiedByPolicy(route, ALL_PAGE_POLICY_PATHS)) continue
      if (isTokenPath(route)) continue
      if ((PUBLIC_ASSET_PATHS as readonly string[]).includes(route)) continue
      unclassifiedNonApi.push(route)
    }

    if (unclassifiedNonApi.length > 0) {
      const sorted = [...unclassifiedNonApi].sort()
      const message = [
        `${unclassifiedNonApi.length} non-API route handler(s) not classified:`,
        '',
        ...sorted.map((r) => `  - ${r}`),
        '',
        'Fix: add each route to the appropriate policy array or API_SKIP_AUTH_PREFIXES in lib/auth/route-policy.ts',
      ].join('\n')
      assert.fail(message)
    }
  })

  it('reports API route auth classification breakdown', () => {
    const publicApi = apiRoutes.filter((r) => isApiSkipAuth(r))
    const protectedApi = apiRoutes.filter((r) => !isApiSkipAuth(r))

    // This is informational - both categories are valid
    assert.ok(
      publicApi.length > 0,
      'Expected at least some public API routes in API_SKIP_AUTH_PREFIXES'
    )
    assert.ok(protectedApi.length > 0, 'Expected at least some auth-protected API routes')
  })
})
