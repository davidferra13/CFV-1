// Interaction layer: inquiry pipeline filters and sub-routes.
// Uses chef storageState (interactions-chef project).

import type { Page } from '@playwright/test'
import { test, expect } from '../helpers/fixtures'

test.describe.configure({ timeout: 90_000 })

const inquiryFilterRoutes = [
  '/inquiries/awaiting-response',
  '/inquiries/awaiting-client-reply',
  '/inquiries/declined',
  '/inquiries/menu-drafting',
  '/inquiries/sent-to-client',
]

const NAV_RETRIES = 3
const NAV_TIMEOUT_MS = 60_000
const STABILIZE_WAIT_MS = 250

function isRetryableNavigationError(error: unknown): boolean {
  const message = String(error || '').toLowerCase()
  return (
    message.includes('err_connection_refused') ||
    message.includes('err_connection_reset') ||
    message.includes('err_connection_aborted') ||
    message.includes('net::err_aborted') ||
    message.includes('target page, context or browser has been closed') ||
    message.includes('timeout')
  )
}

async function gotoStable(page: Page, route: string) {
  let lastError: unknown = null

  for (let attempt = 1; attempt <= NAV_RETRIES; attempt++) {
    try {
      const response = await page.goto(route, {
        waitUntil: 'domcontentloaded',
        timeout: NAV_TIMEOUT_MS,
      })
      await expect(page.locator('body')).toBeVisible({ timeout: 15_000 })
      await page.waitForTimeout(STABILIZE_WAIT_MS)
      return response
    } catch (error) {
      lastError = error
      if (!isRetryableNavigationError(error) || attempt === NAV_RETRIES || page.isClosed()) {
        throw error
      }
      await page.waitForTimeout(1_500 * attempt)
    }
  }

  throw lastError ?? new Error(`Navigation failed for route: ${route}`)
}

function isIgnorableDevChunkError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('loading chunk') ||
    normalized.includes('hydration') ||
    normalized.includes('entire root will switch to client rendering')
  )
}

async function expectNoHardPageErrorsForRoute(page: Page, route: string) {
  const errors: string[] = []
  const onPageError = (err: Error) => errors.push(err.message)
  page.on('pageerror', onPageError)

  try {
    await gotoStable(page, route)
    await page.waitForTimeout(STABILIZE_WAIT_MS)

    const hardErrors = errors.filter((msg) => !isIgnorableDevChunkError(msg))
    expect(hardErrors).toHaveLength(0)
  } finally {
    page.off('pageerror', onPageError)
  }
}

for (const route of inquiryFilterRoutes) {
  test(`${route} - loads without 500`, async ({ page }) => {
    const resp = await gotoStable(page, route)
    expect(resp?.status(), `${route} must not 500`).not.toBe(500)
  })

  test(`${route} - renders content`, async ({ page }) => {
    await gotoStable(page, route)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })
}

test('/inquiries - data is tenant-scoped', async ({ page, seedIds }) => {
  await gotoStable(page, '/inquiries')
  const bodyText = await page.locator('body').innerText()
  expect(bodyText).not.toContain(seedIds.chefBId)
})

test('/inquiries - budget_mode query loads', async ({ page }) => {
  const resp = await gotoStable(page, '/inquiries?budget_mode=not_sure')
  expect(resp?.status()).not.toBe(500)
  await expect(page).toHaveURL(/budget_mode=not_sure/)
})

test('/inquiries - shows updated filter labels', async ({ page }) => {
  await gotoStable(page, '/inquiries')
  await expect(page.getByRole('button', { name: 'Client Reply' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Your Reply' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Closed' })).toBeVisible()
})

test('/inquiries - no hard JS errors', async ({ page }) => {
  await expectNoHardPageErrorsForRoute(page, '/inquiries')
})

test('/inquiries/new - loads and renders', async ({ page }) => {
  const resp = await gotoStable(page, '/inquiries/new')
  expect(resp?.status()).not.toBe(500)
  const bodyText = await page.locator('body').innerText()
  expect(bodyText.trim().length).toBeGreaterThan(20)
})

test('/inquiries/new - no hard JS errors', async ({ page }) => {
  await expectNoHardPageErrorsForRoute(page, '/inquiries/new')
})
