'use server'

/**
 * Route Protection Server Actions
 *
 * Query the route protection matrix, validate routes, find gaps.
 */

import { routeProtectionMatrix } from './route-protection-matrix'
import type {
  ProtectionLevel,
  ProtectionMatrixSummary,
  RouteProtectionEntry,
  RouteProtectionResult,
} from './route-protection-types'
import { routePolicy } from './route-policy'

/**
 * Return the full protection matrix.
 */
export async function getProtectionMatrix(): Promise<RouteProtectionEntry[]> {
  return routeProtectionMatrix
}

/**
 * Match a pathname against the protection matrix.
 * Returns the expected protection level for the route.
 */
export async function validateRouteProtection(pathname: string): Promise<RouteProtectionResult> {
  const normalized = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname

  for (const entry of routeProtectionMatrix) {
    if (matchPattern(entry.pattern, normalized)) {
      return {
        pathname: normalized,
        matchedPattern: entry.pattern,
        level: entry.level,
        description: entry.description,
      }
    }
  }

  return {
    pathname: normalized,
    matchedPattern: null,
    level: null,
    description: null,
  }
}

/**
 * Count entries by protection level.
 */
export async function getProtectionSummary(): Promise<ProtectionMatrixSummary> {
  const countByLevel: Record<ProtectionLevel, number> = {
    public: 0,
    authenticated: 0,
    chef: 0,
    client: 0,
    staff: 0,
    admin: 0,
    partner: 0,
    vendor: 0,
    demo: 0,
    mobile: 0,
    kiosk: 0,
  }

  for (const entry of routeProtectionMatrix) {
    countByLevel[entry.level]++
  }

  return {
    totalEntries: routeProtectionMatrix.length,
    countByLevel,
    patterns: routeProtectionMatrix.map((e) => e.pattern),
  }
}

/**
 * Find routes in the granular routePolicy that are NOT covered
 * by any pattern in the protection matrix.
 *
 * Returns route paths that have a policy tier but no matching matrix pattern.
 */
export async function findUnprotectedRoutes(): Promise<string[]> {
  const allRoutes = Object.keys(routePolicy)
  const unprotected: string[] = []

  for (const route of allRoutes) {
    let matched = false
    for (const entry of routeProtectionMatrix) {
      if (matchPattern(entry.pattern, route)) {
        matched = true
        break
      }
    }
    if (!matched) {
      unprotected.push(route)
    }
  }

  return unprotected.sort()
}

// -- Internal helpers ---------------------------------------------

/**
 * Simple glob matcher for route patterns.
 *   "/"          matches exactly "/"
 *   "/admin/*"   matches "/admin" and "/admin/anything/nested"
 *   "/login"     matches exactly "/login"
 *   "/chef/[slug]/*" matches "/chef/my-chef/store" etc.
 *
 * Dynamic segments like [id] and [slug] match any single path segment.
 */
function matchPattern(pattern: string, pathname: string): boolean {
  // Exact match (no wildcard, no dynamic segments)
  if (!pattern.includes('*') && !pattern.includes('[')) {
    return pattern === pathname
  }

  // Wildcard: "/foo/*" matches "/foo" and "/foo/bar/baz"
  if (pattern.endsWith('/*')) {
    const base = pattern.slice(0, -2)

    // Base itself may have dynamic segments
    if (base.includes('[')) {
      const baseRegex = segmentsToRegex(base)
      const baseRe = new RegExp('^' + baseRegex + '(/.*)?$')
      return baseRe.test(pathname)
    }

    return pathname === base || pathname.startsWith(base + '/')
  }

  // Dynamic segments: convert [param] to single-segment regex
  const regexStr =
    '^' +
    pattern
      .replace(/\[\[\.\.\.[\w]+\]\]/g, '.*') // optional catch-all [[...param]]
      .replace(/\[\.\.\.[\w]+\]/g, '.+') // catch-all [...param]
      .replace(/\[[\w]+\]/g, '[^/]+') // dynamic [param]
      .replace(/\*/g, '.*') +
    '$'

  return new RegExp(regexStr).test(pathname)
}

/**
 * Convert a pattern base (before /*) with dynamic segments to a regex string.
 */
function segmentsToRegex(base: string): string {
  return base
    .replace(/\[\[\.\.\.[\w]+\]\]/g, '.*')
    .replace(/\[\.\.\.[\w]+\]/g, '.+')
    .replace(/\[[\w]+\]/g, '[^/]+')
}
