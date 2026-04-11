// Launch Readiness Audit — Public Pages
// Tests: landing page, core marketing pages, privacy, terms, contact, chef directory, auth pages
// No authentication — these are what potential customers see first

import { test, expect } from '@playwright/test'
import { ROUTES } from '../helpers/test-utils'

async function gotoPublic(page: Parameters<Parameters<typeof test>[1]>[0]['page'], route: string) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 90_000 })
      if ((response?.status() ?? 0) >= 500 && attempt < 2) {
        await page.waitForTimeout(400)
        continue
      }
      return response
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const retryable = /ERR_ABORTED|ERR_CONNECTION|timeout|frame was detached/i.test(message)
      if (!retryable || attempt === 2) throw error
      await page.waitForTimeout(400)
    }
  }

  return null
}

async function getPublicChefSlug(page: Parameters<Parameters<typeof test>[1]>[0]['page']) {
  await gotoPublic(page, '/chefs')
  await page
    .locator('main')
    .first()
    .waitFor({ state: 'visible', timeout: 20_000 })
    .catch(() => {})
  await page.waitForTimeout(800)

  const href = await page
    .locator('a[href^="/chef/"]')
    .evaluateAll((links) => {
      for (const link of links) {
        const href = link.getAttribute('href')
        if (href && /^\/chef\/[^/]+$/.test(href)) {
          return href
        }
      }
      return null
    })
    .catch(() => null)

  return href?.split('/')[2] ?? null
}

async function readPageText(page: Parameters<Parameters<typeof test>[1]>[0]['page']) {
  const mainText = await page
    .locator('main')
    .first()
    .textContent({ timeout: 2_000 })
    .catch(() => null)

  if (mainText?.trim()) return mainText

  return (
    (await page
      .locator('body')
      .textContent({ timeout: 2_000 })
      .catch(() => null)) ?? ''
  )
}

test.describe('Landing Page', () => {
  test('loads with title and hero content', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await gotoPublic(page, ROUTES.home)
    await expect(page).toHaveTitle(/ChefFlow/i)
    // Hero section should have a heading
    const heading = page.locator('h1').first()
    await expect(heading).toBeVisible({ timeout: 10_000 })
    // Should have CTAs (sign up, pricing, or similar)
    const ctaLinks = page.getByRole('link', { name: /sign up|get started|pricing|try free/i })
    const ctaCount = await ctaLinks.count()
    expect(ctaCount).toBeGreaterThanOrEqual(1)

    expect(errors).toHaveLength(0)
  })
})

test.describe('Core Marketing Pages', () => {
  const marketingPages = [
    { route: ROUTES.book, heading: /book|describe your event/i },
    { route: ROUTES.nearby, heading: /nearby|find food near you|browse by location/i },
    { route: ROUTES.howItWorks, heading: /how it works/i },
    { route: ROUTES.services, heading: /services/i },
    {
      route: ROUTES.about,
      heading: /i built this because i needed it|two sides of the same platform|why it is free/i,
    },
    { route: ROUTES.forOperators, heading: /for operators|operator/i },
    { route: ROUTES.trust, heading: /trust/i },
    {
      route: ROUTES.marketplaceChefs,
      heading: /run the business behind every booking|for chefs and operators/i,
    },
  ]

  for (const { route, heading } of marketingPages) {
    test(`${route} loads with a visible heading`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))

      await gotoPublic(page, route)
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 20_000 })
      const pageText = await readPageText(page)
      expect(pageText.toLowerCase()).toMatch(heading)
      expect(errors).toHaveLength(0)
    })
  }
})

test.describe('Privacy Page', () => {
  test('loads with privacy content', async ({ page }) => {
    await gotoPublic(page, ROUTES.privacy)
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 })
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.toLowerCase()).toContain('privacy')
  })
})

test.describe('Terms Page', () => {
  test('loads with terms content', async ({ page }) => {
    await gotoPublic(page, ROUTES.terms)
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 })
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.toLowerCase()).toContain('terms')
  })
})

test.describe('Contact Page', () => {
  test('renders contact form with all fields', async ({ page }) => {
    await gotoPublic(page, ROUTES.contact)
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 })
    const form = page.locator('form').first()
    await expect(form.getByLabel('Name')).toBeVisible()
    await expect(form.getByLabel('Email')).toBeVisible()
    await expect(form.getByLabel('Message')).toBeVisible()
    await expect(form.getByRole('button', { name: /send message/i })).toBeVisible()
  })
})

test.describe('Chef Directory', () => {
  test('/chefs loads and shows chef cards or empty state', async ({ page }) => {
    const resp = await gotoPublic(page, '/chefs')
    expect(resp?.status()).not.toBe(500)
    const bodyText = await readPageText(page)
    // Should have content — either chef cards or an empty state message
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })
})

test.describe('Chef Public Profile', () => {
  test('chef profile page loads for seed chef', async ({ page }) => {
    const slug = await getPublicChefSlug(page)
    test.skip(!slug, 'No public chef profile is currently listed in the directory')
    const resp = await gotoPublic(page, `/chef/${slug}`)
    expect(resp?.status()).not.toBe(500)
    const bodyText = await readPageText(page)
    expect(bodyText).toMatch(
      /start inquiry|gift cards|visit website|client account|partner signup/i
    )
  })
})

test.describe('Auth Pages', () => {
  test('sign-in page renders form', async ({ page }) => {
    await gotoPublic(page, ROUTES.signIn)
    // Custom Input component has no htmlFor linkage — use type selectors
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible()
  })

  test('sign-up page renders form', async ({ page }) => {
    await gotoPublic(page, ROUTES.signUp)
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(
      page.getByRole('button', { name: /create account|sign up|register/i }).first()
    ).toBeVisible()
  })
})

test.describe('No Server Errors on Public Pages', () => {
  const publicRoutes = [
    ROUTES.home,
    ROUTES.book,
    ROUTES.nearby,
    ROUTES.howItWorks,
    ROUTES.services,
    ROUTES.about,
    ROUTES.trust,
    ROUTES.forOperators,
    ROUTES.privacy,
    ROUTES.terms,
    ROUTES.contact,
    ROUTES.signIn,
    ROUTES.signUp,
  ]

  for (const route of publicRoutes) {
    test(`${route} returns 200 (not 500)`, async ({ page }) => {
      const resp = await gotoPublic(page, route)
      expect(resp?.status()).not.toBe(500)
    })
  }
})
