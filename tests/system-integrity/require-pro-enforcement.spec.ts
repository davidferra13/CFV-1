/**
 * Behavior proof for P0-1: a free-tier chef who types a pro URL is
 * redirected to plan settings instead of getting the feature.
 *
 * Preconditions: canonical server on http://localhost:3100 with the E2E
 * auth endpoint enabled (run this BEFORE the WS1 Task 7 env flip), and
 * the agent account on the free tier (subscription_status null or
 * canceled) and not present in platform_admins (admin bypasses gates).
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts require-pro-enforcement.spec.ts
 * (The default playwright.config.ts projects never match tests/system-integrity/,
 * so running without -c reports "no tests found". The system-integrity config
 * applies storageState .auth/chef.json, which the /api/e2e/auth call below
 * then overrides for this test's own session.)
 */

import { test, expect } from '@playwright/test'
import fs from 'node:fs'

const BASE = 'http://localhost:3100'

test('free chef hitting /commerce lands on plan settings', async ({ page }) => {
  const creds = JSON.parse(fs.readFileSync('.auth/agent.json', 'utf-8'))
  const res = await page.context().request.post(`${BASE}/api/e2e/auth`, {
    data: { email: creds.email, password: creds.password },
  })
  expect(res.ok()).toBeTruthy()

  await page.goto(`${BASE}/commerce`)
  await page.waitForLoadState('domcontentloaded')

  expect(page.url()).toContain('/settings/billing')
  expect(page.url()).toContain('feature=commerce')
})
