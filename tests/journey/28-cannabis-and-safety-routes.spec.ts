// Journey Tests - Cannabis and Safety Routes
// Adds specialty coverage for cannabis workflows and
// operational safety incident management routes.
//
// Scenarios: #441-454
//
// Run: npx playwright test --project=journey-chef tests/journey/28-cannabis-and-safety-routes.spec.ts

import { test } from '../helpers/fixtures'
import {
  assertPageLoads,
  assertNoPageErrors,
  assertPageHasContent,
  JOURNEY_ROUTES,
} from './helpers/journey-helpers'

test.describe('Cannabis Routes - Foundation (#441-448)', () => {
  test('cannabis hub route loads (#441)', async ({ page }) => {
    await assertPageLoads(page, '/cannabis/hub')
  })

  test('cannabis about route loads (#442)', async ({ page }) => {
    await assertPageLoads(page, '/cannabis/about')
  })

  test('cannabis agreement route loads (#443)', async ({ page }) => {
    await assertPageLoads(page, '/cannabis/agreement')
  })

  test('cannabis compliance route loads (#444)', async ({ page }) => {
    await assertPageLoads(page, '/cannabis/compliance')
  })

  test('cannabis events route loads (#445)', async ({ page }) => {
    await assertPageLoads(page, '/cannabis/events')
  })

  test('cannabis control-packet template route loads (#446)', async ({ page }) => {
    await assertPageLoads(page, '/cannabis/control-packet/template')
  })

  test('cannabis ledger route has no page errors (#447)', async ({ page }) => {
    await assertNoPageErrors(page, '/cannabis/ledger')
  })

  test('cannabis RSVPs route has content (#448)', async ({ page }) => {
    await page.goto('/cannabis/rsvps')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

test.describe('Safety Routes - Incident Operations (#449-454)', () => {
  test('safety incidents route loads (#449)', async ({ page }) => {
    await assertPageLoads(page, '/safety/incidents')
  })

  test('new safety incident route loads (#450)', async ({ page }) => {
    await assertPageLoads(page, '/safety/incidents/new')
  })

  test('backup-chef safety route loads (#451)', async ({ page }) => {
    await assertPageLoads(page, '/safety/backup-chef')
  })

  test('compliance route remains reachable (#452)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsCompliance)
  })

  test('HACCP compliance route remains reachable (#453)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsComplianceHaccp)
  })

  test('cannabis unlock route has content (#454)', async ({ page }) => {
    await page.goto('/cannabis/unlock')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})
