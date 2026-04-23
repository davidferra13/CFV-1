/**
 * Q70: Public Route Auth Inventory
 *
 * Every API route without a standard auth guard must be intentionally
 * allowlisted. Routes may still use alternative auth (token validation,
 * signatures, env gates), but they must remain documented in the shared
 * API auth inventory contract.
 */
import { test, expect } from '@playwright/test'
import { MIN_PROTECTED_API_ROUTE_RATIO, buildApiRouteAuthInventory } from '@/lib/api/auth-inventory'

test.describe('Q70: Public route auth inventory', () => {
  test('app/api/ contains route.ts files to audit', () => {
    const inventory = buildApiRouteAuthInventory()

    expect(
      inventory.totalRoutes,
      'app/api/ must contain route.ts files (found none to audit)'
    ).toBeGreaterThan(0)
  })

  test('API routes use auth guards or alternative auth mechanisms', () => {
    const inventory = buildApiRouteAuthInventory()

    console.log(
      `[Q70] Auth inventory: ${inventory.standardAuthCount} standard auth, ` +
        `${inventory.alternativeAuthCount} alternative auth, ` +
        `${inventory.knownNoStandardAuthCount + inventory.unknownNoStandardAuthRoutes.length} no-standard-auth ` +
        `(${inventory.totalRoutes} total)`
    )

    expect(
      inventory.protectedRouteRatio,
      `Only ${(inventory.protectedRouteRatio * 100).toFixed(0)}% of API routes have any auth mechanism. ` +
        `Expected at least ${(MIN_PROTECTED_API_ROUTE_RATIO * 100).toFixed(0)}%. ` +
        `(${inventory.standardAuthCount + inventory.alternativeAuthCount} protected, ` +
        `${inventory.knownNoStandardAuthCount + inventory.unknownNoStandardAuthRoutes.length} no-standard-auth)`
    ).toBeGreaterThanOrEqual(MIN_PROTECTED_API_ROUTE_RATIO)
  })

  test('every route.ts without auth guards is in the known allowlist', () => {
    const inventory = buildApiRouteAuthInventory()

    expect(
      inventory.unknownNoStandardAuthRoutes,
      `These API routes have NO standard auth guard and are NOT in the shared allowlist ` +
        `(potential accidental exposure):\n${inventory.unknownNoStandardAuthRoutes.join('\n')}\n\n` +
        `If these are intentionally public, add them to lib/api/auth-inventory.ts.`
    ).toHaveLength(0)
  })

  test('public route inventory is documented and complete', () => {
    const inventory = buildApiRouteAuthInventory()
    const noStandardAuthCount =
      inventory.knownNoStandardAuthCount + inventory.unknownNoStandardAuthRoutes.length

    expect(
      noStandardAuthCount,
      'Expected at least some known no-standard-auth routes (auth, health, webhooks, etc.)'
    ).toBeGreaterThan(0)
  })
})
