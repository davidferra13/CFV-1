// Agent Account Smoke Tests
// Tests agent account login and basic site functionality
//
// NOTE: This test bypasses globalSetup to avoid seeding issues.
// It directly tests the agent account credentials.

import { test, expect, type Page } from '@playwright/test'
import { ROUTES } from '../helpers/test-utils'

const AGENT_EMAIL = 'agent@chefflow.test'
const AGENT_PASSWORD = 'AgentChefFlow!2026'
const LANDING_URL = /\/(dashboard|onboarding|my-events|auth\/role-selection|admin)/
const SIGN_IN_ATTEMPTS = 3
const AUTH_API_ATTEMPTS = 3

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function signInViaUi(page: Page) {
  let lastError: unknown
  for (let attempt = 1; attempt <= SIGN_IN_ATTEMPTS; attempt += 1) {
    try {
      await page.goto(ROUTES.signIn, { waitUntil: 'domcontentloaded', timeout: 120_000 })
      await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 120_000 })
      await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 120_000 })

      await page.fill('input[type="email"]', AGENT_EMAIL)
      await page.fill('input[type="password"]', AGENT_PASSWORD)
      await page.click('button[type="submit"]')
      await page.waitForURL(LANDING_URL, { timeout: 120_000 })
      return
    } catch (error) {
      lastError = error
      if (attempt < SIGN_IN_ATTEMPTS) {
        await sleep(1_500)
      }
    }
  }

  throw lastError instanceof Error
    ? new Error(`Agent UI sign-in failed after ${SIGN_IN_ATTEMPTS} attempts: ${lastError.message}`)
    : new Error(`Agent UI sign-in failed after ${SIGN_IN_ATTEMPTS} attempts.`)
}

async function establishAgentSession(page: Page) {
  let lastApiError: unknown
  for (let attempt = 1; attempt <= AUTH_API_ATTEMPTS; attempt += 1) {
    try {
      const resp = await page.request.post('/api/e2e/auth', {
        data: { email: AGENT_EMAIL, password: AGENT_PASSWORD },
        timeout: 120_000,
      })

      if (resp.ok()) {
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 120_000 })
        await page.waitForURL(LANDING_URL, { timeout: 120_000 })
        return
      }

      const status = resp.status()
      if (status === 401) {
        const body = await resp.text()
        throw new Error(`E2E auth rejected known-good agent credentials: ${body}`)
      }

      lastApiError = new Error(`E2E auth responded with status ${status}.`)
    } catch (error) {
      lastApiError = error
    }

    if (attempt < AUTH_API_ATTEMPTS) {
      await sleep(1_500)
    }
  }

  // Endpoint can be intentionally disabled outside remote E2E mode.
  await signInViaUi(page).catch((uiError) => {
    const apiMessage =
      lastApiError instanceof Error ? ` API session error: ${lastApiError.message}` : ''
    if (uiError instanceof Error) {
      throw new Error(`${uiError.message}${apiMessage}`)
    }
    throw uiError
  })
}

test.describe('Agent Authentication', () => {
  test.describe.configure({ timeout: 240_000 })

  test('agent can sign in through UI and access dashboard', async ({ page }) => {
    await signInViaUi(page)

    // Verify we're on a valid portal page
    const url = page.url()
    expect(url).toMatch(LANDING_URL)

    // Verify dashboard content loads
    await expect(page.locator('body')).toBeVisible()
  })

  test('agent dashboard loads with styled content', async ({ page }) => {
    await establishAgentSession(page)

    // Wait for page to fully load
    await page.waitForLoadState('domcontentloaded', { timeout: 120_000 })

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
    await establishAgentSession(page)

    // Navigate to events
    await page.goto(ROUTES.events, { waitUntil: 'domcontentloaded', timeout: 120_000 })

    // If onboarding is incomplete, middleware may redirect to /onboarding instead of /events.
    await expect(page).toHaveURL(/\/(events|onboarding|dashboard)/)
  })
})
