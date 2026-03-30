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
 * Dismiss cookie consent banner if present on the page.
 */
async function dismissCookieBanner(page: Page): Promise<void> {
  try {
    const acceptBtn = page.locator('button:has-text("Accept cookies")')
    if (await acceptBtn.isVisible({ timeout: 2_000 })) {
      await acceptBtn.click()
      await sleep(300)
    }
  } catch {
    // Banner not present or already dismissed
  }
}

/**
 * Sign in via the UI form.
 * Uses pressSequentially (not fill) because React controlled inputs
 * need real key events to update state. Does NOT use /api/e2e/auth
 * (blocked in production).
 */
export async function signInViaUI(page: Page, credentials?: AgentCredentials): Promise<void> {
  const creds = credentials ?? loadAgentCredentials()

  // Use domcontentloaded (not load) because Next.js dev server delays load event
  await page.goto('/auth/signin', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await dismissCookieBanner(page)

  const emailInput = page.locator('input[type="email"]')
  const passwordInput = page.locator('input[type="password"]')

  await expect(emailInput).toBeVisible({ timeout: 30_000 })
  await expect(passwordInput).toBeVisible({ timeout: 10_000 })

  // Wait for React hydration: click + type in a retry loop.
  // Dev server compiles on-demand so hydration can be very slow.
  let filled = false
  for (let attempt = 0; attempt < 5; attempt++) {
    await emailInput.click()
    await sleep(1_000 + attempt * 500) // Increasing wait for hydration
    await emailInput.pressSequentially(creds.email, { delay: 10 })

    const emailValue = await emailInput.inputValue()
    if (emailValue === creds.email) {
      filled = true
      break
    }
    // React wasn't hydrated yet, clear and retry
    await emailInput.fill('')
  }
  if (!filled) {
    throw new Error('Failed to fill email input after 5 hydration attempts')
  }

  await passwordInput.click()
  await passwordInput.pressSequentially(creds.password, { delay: 10 })

  // Submit via Enter key
  await passwordInput.press('Enter')

  // Wait for URL to leave /auth/signin after the server action completes
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/signin'), {
    timeout: 60_000,
    waitUntil: 'domcontentloaded',
  })
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
