import { type Page, expect } from '@playwright/test'
import { existsSync, readFileSync } from 'fs'
import path from 'path'

// Agent credentials - use the account that exists in the production database
const AGENT_CREDENTIALS_PATH = path.join(process.cwd(), '.auth', 'agent.json')

interface AgentCredentials {
  email: string
  password: string
}

export function loadAgentCredentials(): AgentCredentials {
  // Try .auth/agent.json first
  if (existsSync(AGENT_CREDENTIALS_PATH)) {
    const creds = JSON.parse(readFileSync(AGENT_CREDENTIALS_PATH, 'utf-8'))
    return { email: creds.email, password: creds.password }
  }

  // Fall back to env vars (for Pi deployment where .auth/ may not exist)
  const email = process.env.SENTINEL_EMAIL
  const password = process.env.SENTINEL_PASSWORD
  if (email && password) {
    return { email, password }
  }

  throw new Error(
    'No agent credentials found. Set SENTINEL_EMAIL/SENTINEL_PASSWORD env vars or provide .auth/agent.json'
  )
}

const LANDING_URL = /\/(dashboard|onboarding|my-events|auth\/role-selection|admin)/

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Sign in via the UI form.
 * Uses pressSequentially (not fill) because React controlled inputs
 * need real key events to update state. Does NOT use /api/e2e/auth
 * (blocked in production).
 */
export async function signInViaUI(page: Page, credentials?: AgentCredentials): Promise<void> {
  const creds = credentials ?? loadAgentCredentials()

  await page.goto('/auth/signin', { waitUntil: 'domcontentloaded', timeout: 60_000 })

  // Dismiss cookie consent banner if present
  const cookieDismiss = page.locator('button:has-text("Accept"), button:has-text("Dismiss cookie")')
  if (
    await cookieDismiss
      .first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false)
  ) {
    await cookieDismiss.first().click()
    await sleep(500)
  }

  const emailInput = page.locator('input[type="email"]')
  const passwordInput = page.locator('input[type="password"]')

  await expect(emailInput).toBeVisible({ timeout: 30_000 })
  await expect(passwordInput).toBeVisible({ timeout: 10_000 })

  // pressSequentially triggers React onChange on controlled inputs
  await emailInput.click()
  await emailInput.pressSequentially(creds.email, { delay: 10 })
  await passwordInput.click()
  await passwordInput.pressSequentially(creds.password, { delay: 10 })

  // Submit and wait for the hard navigation (window.location.href)
  await passwordInput.press('Enter')

  // The sign-in page uses window.location.href for hard navigation.
  // Poll for the URL to change away from /auth/signin.
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    await sleep(1_000)
    const url = page.url()
    if (!url.includes('/auth/signin')) {
      // Wait for the destination page to finish loading
      await page.waitForLoadState('domcontentloaded', { timeout: 30_000 })
      return
    }
    // Check if an error appeared on the sign-in page
    const errorAlert = page.locator('[role="alert"], .text-red-600, .text-red-500')
    if (await errorAlert.isVisible({ timeout: 500 }).catch(() => false)) {
      const errorText = await errorAlert.textContent()
      throw new Error(`Sign-in error: ${errorText}`)
    }
  }

  throw new Error('Sign-in timed out: URL never changed from /auth/signin')
}

/**
 * Check if the current page has a valid authenticated session.
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 })
    const url = page.url()
    return LANDING_URL.test(url) && !url.includes('/auth/signin')
  } catch {
    return false
  }
}

/**
 * Ensure we have an authenticated session. Reuses existing session if valid.
 */
export async function ensureAuthenticated(page: Page): Promise<void> {
  if (await isAuthenticated(page)) return
  await signInViaUI(page)
}
