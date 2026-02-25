// Agent Account Smoke Tests
// Tests agent account login and basic site functionality
//
// NOTE: This test bypasses globalSetup to avoid seeding issues.
// It directly tests the agent account credentials.

import { test, expect } from '@playwright/test'
import { ROUTES } from '../helpers/test-utils'

const AGENT_EMAIL = 'agent@chefflow.test'
const AGENT_PASSWORD = 'AgentChefFlow!2026'

test.describe('Agent Authentication', () => {
  test('agent can sign in and access dashboard', async ({ page }) => {
    // Navigate to sign-in page
    await page.goto(ROUTES.signIn)
    await page.waitForLoadState('networkidle')

    // Fill in credentials
    await page.fill('input[type="email"]', AGENT_EMAIL)
    await page.fill('input[type="password"]', AGENT_PASSWORD)

    // Click sign-in button
    await page.click('button[type="submit"]')

    // Wait for redirect - could be dashboard or onboarding
    await page.waitForURL(/dashboard|onboarding/, { timeout: 30_000 })

    // Verify we're on a valid portal page
    const url = page.url()
    expect(url).toMatch(/dashboard|onboarding/)

    // Verify dashboard content loads
    await expect(page.locator('body')).toBeVisible()
  })

  test('agent dashboard loads with styled content', async ({ page }) => {
    // Sign in first
    await page.goto(ROUTES.signIn)
    await page.fill('input[type="email"]', AGENT_EMAIL)
    await page.fill('input[type="password"]', AGENT_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/dashboard|onboarding/, { timeout: 30_000 })

    // Wait for page to fully load
    await page.waitForLoadState('networkidle')

    // Check that CSS is loaded (body should have dark background class)
    const body = page.locator('body')
    const classValue = await body.getAttribute('class')
    console.log('Body class:', classValue)

    // Check for styled content - look for any styled elements
    const styledElements = await page
      .locator('[class*="bg-"], [class*="text-"], nav, header')
      .count()
    console.log('Styled elements found:', styledElements)

    // Verify we have styled content (not just plain HTML)
    expect(styledElements).toBeGreaterThan(0)
  })

  test('agent can access events page', async ({ page }) => {
    // Sign in first
    await page.goto(ROUTES.signIn)
    await page.fill('input[type="email"]', AGENT_EMAIL)
    await page.fill('input[type="password"]', AGENT_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/dashboard|onboarding/, { timeout: 30_000 })

    // Navigate to events
    await page.goto(ROUTES.events)
    await page.waitForLoadState('networkidle')

    // Verify events page loads
    await expect(page).toHaveURL(/events/)
  })
})
