// Daily Report E2E Tests
// Verifies /analytics/daily-report loads for the agent account,
// renders key business metrics, and supports day-to-day navigation.

import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import { test, expect } from '../helpers/fixtures'

function getAgentCredentials(): { email: string; password: string } {
  const envEmail = process.env.AGENT_EMAIL
  const envPassword = process.env.AGENT_PASSWORD
  if (envEmail && envPassword) {
    return { email: envEmail, password: envPassword }
  }

  try {
    const raw = readFileSync('.auth/agent.json', 'utf-8')
    const parsed = JSON.parse(raw) as { email?: string; password?: string }
    if (parsed.email && parsed.password) {
      return { email: parsed.email, password: parsed.password }
    }
  } catch {
    // fall through to throw below
  }

  throw new Error(
    '[daily-report e2e] Missing agent credentials. Set AGENT_EMAIL/AGENT_PASSWORD or populate .auth/agent.json.'
  )
}

async function signInAsAgent(page: Page) {
  const creds = getAgentCredentials()
  const response = await page.request.post('/api/e2e/auth', {
    data: {
      email: creds.email,
      password: creds.password,
    },
  })

  expect(response.ok(), `Expected /api/e2e/auth to succeed, got ${response.status()}`).toBeTruthy()
}

test.describe('Daily Report Page', () => {
  test.describe.configure({ timeout: 120_000 })

  test.beforeEach(async ({ page }) => {
    await signInAsAgent(page)
    await page.goto('/analytics/daily-report', { waitUntil: 'domcontentloaded' })
  })

  test('daily report page loads and stays authenticated', async ({ page }) => {
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page).toHaveURL(/\/analytics\/daily-report/)
    await expect(page.getByRole('heading', { name: /daily report/i })).toBeVisible()
  })

  test('daily report shows core metric cards', async ({ page }) => {
    await expect(page.getByText("Today's Revenue")).toBeVisible()
    await expect(page.getByText('MTD Revenue')).toBeVisible()
    await expect(page.getByText('vs Last Month')).toBeVisible()
    await expect(page.getByText('Outstanding')).toBeVisible()
  })

  test('date navigation moves to a different day', async ({ page }) => {
    const dateHeading = page.locator('h2.text-lg.font-semibold').first()
    await expect(dateHeading).toBeVisible()

    const before = (await dateHeading.innerText()).trim()

    const navContainer = dateHeading.locator('xpath=..')
    const prevDayButton = navContainer.locator('button').first()
    await prevDayButton.click()

    await expect(dateHeading).not.toHaveText(before, { timeout: 10_000 })
  })
})
