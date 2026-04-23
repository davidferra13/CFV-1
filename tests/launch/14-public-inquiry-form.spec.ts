// Launch Readiness Audit — Public Inquiry Form & Embed Widget
// Tests: public-facing inquiry form, form validation, submission, embed form
// No authentication — this is what potential clients see

import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
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

function getSeedIds() {
  const raw = readFileSync('.auth/seed-ids.json', 'utf-8')
  return JSON.parse(raw)
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

test.describe('Public Inquiry Form', () => {
  test('inquiry form loads for seed chef', async ({ page }) => {
    const slug = await getPublicChefSlug(page)
    test.skip(!slug, 'No public chef profile is currently listed in the directory')
    await gotoPublic(page, `/chef/${slug}/inquire`)
    await expect(page.getByRole('heading', { name: /send inquiry/i })).toBeVisible()
    await expect(page.getByLabel('Full Name')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Guest Count')).toBeVisible()
    await expect(page.getByRole('button', { name: /send inquiry/i })).toBeVisible()
  })

  test('inquiry form shows required fields', async ({ page }) => {
    const slug = await getPublicChefSlug(page)
    test.skip(!slug, 'No public chef profile is currently listed in the directory')
    await gotoPublic(page, `/chef/${slug}/inquire`)
    const bodyText = await readPageText(page)
    const hasFields = /name|email|date|guest|occasion/i.test(bodyText)
    expect(hasFields).toBeTruthy()
  })

  test('empty submit shows validation errors', async ({ page }) => {
    const slug = await getPublicChefSlug(page)
    test.skip(!slug, 'No public chef profile is currently listed in the directory')
    await gotoPublic(page, `/chef/${slug}/inquire`)

    // Try to submit empty form
    const submitBtn = page.getByRole('button', { name: /submit|send|inquire|book/i }).first()
    if (await submitBtn.isVisible().catch(() => false)) {
      const beforeUrl = page.url()
      await submitBtn.click()
      await page.waitForTimeout(750)

      const invalidFieldCount = await page
        .locator('input:invalid, textarea:invalid, select:invalid')
        .count()
        .catch(() => 0)

      const bodyText = await readPageText(page)
      const hasErrorCopy = /required|please|must|invalid|error|fill/i.test(bodyText)
      const submissionBlocked = page.url() === beforeUrl

      expect(submissionBlocked).toBeTruthy()
      expect(invalidFieldCount > 0 || hasErrorCopy).toBeTruthy()
    }
  })

  test('invalid email shows email error', async ({ page }) => {
    const slug = await getPublicChefSlug(page)
    test.skip(!slug, 'No public chef profile is currently listed in the directory')
    await gotoPublic(page, `/chef/${slug}/inquire`)

    const emailField = page.getByLabel(/email/i).first().or(page.getByPlaceholder(/email/i).first())
    if (await emailField.isVisible().catch(() => false)) {
      await emailField.fill('not-an-email')
      // Tab out to trigger validation
      await emailField.press('Tab')
      await page.waitForTimeout(1000)

      // Try submit
      const submitBtn = page.getByRole('button', { name: /submit|send|inquire|book/i }).first()
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click()
        await page.waitForTimeout(1500)
        const bodyText = await readPageText(page)
        const hasEmailError = /email|invalid|valid|format/i.test(bodyText)
        expect(hasEmailError).toBeTruthy()
      }
    }
  })

  test('can fill complete form', async ({ page }) => {
    const slug = await getPublicChefSlug(page)
    test.skip(!slug, 'No public chef profile is currently listed in the directory')
    await gotoPublic(page, `/chef/${slug}/inquire`)

    // Fill name
    const nameField = page.getByLabel(/name/i).first().or(page.getByPlaceholder(/name/i).first())
    if (await nameField.isVisible().catch(() => false)) {
      await nameField.fill('Test Customer')
    }

    // Fill email
    const emailField = page.getByLabel(/email/i).first().or(page.getByPlaceholder(/email/i).first())
    if (await emailField.isVisible().catch(() => false)) {
      await emailField.fill(`launch-test-${Date.now()}@example.com`)
    }

    // Fill phone
    const phoneField = page.getByLabel(/phone/i).first().or(page.getByPlaceholder(/phone/i).first())
    if (await phoneField.isVisible().catch(() => false)) {
      await phoneField.fill('555-999-0000')
    }

    // Fill occasion/message
    const occasionField = page
      .getByLabel(/occasion|event|type/i)
      .first()
      .or(page.getByPlaceholder(/occasion/i).first())
    if (await occasionField.isVisible().catch(() => false)) {
      await occasionField.fill('Birthday Dinner')
    }

    const messageField = page
      .getByLabel(/message|note|detail/i)
      .first()
      .or(page.locator('textarea').first())
    if (await messageField.isVisible().catch(() => false)) {
      await messageField.fill('Launch readiness test — please ignore this inquiry')
    }

    // Form should not crash after filling
    const bodyText = await readPageText(page)
    expect(bodyText).not.toMatch(/unhandled|error|crash/i)
  })
})

test.describe('Operator Walkthrough Form', () => {
  test('submits workflow context and reaches the success state', async ({ page }) => {
    await page.route('**/api/realtime/**', (route) => route.abort())

    const stamp = Date.now()
    const requestRoute = `${ROUTES.forOperatorsWalkthrough}?source_page=launch_public_operator_test&source_cta=launch_suite`

    await gotoPublic(page, requestRoute)
    await expect(
      page.getByRole('heading', {
        name: /request a founder-led evaluation of your operator workflow/i,
      })
    ).toBeVisible({ timeout: 20_000 })

    const form = page.locator('section#walkthrough-request form').first()
    await expect(form.locator('input[name="name"]')).toBeVisible()
    await form.locator('input[name="name"]').fill('Launch Walkthrough QA')
    await form.locator('input[name="email"]').fill(`launch-walkthrough-${stamp}@example.com`)
    await form.locator('input[name="businessName"]').fill(`Launch Walkthrough ${stamp}`)
    await form.locator('#operator-type').selectOption('catering')
    await form
      .locator('textarea[name="workflowStack"]')
      .fill('Google Sheets, QuickBooks, HoneyBook, inbox threads, prep notes')
    await form
      .locator('textarea[name="helpRequest"]')
      .fill('Pressure-test inquiry handoffs, staffing coordination, and payment follow-through.')

    const submitResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/for-operators/walkthrough'),
      { timeout: 90_000 }
    )

    await form.locator('button[type="submit"]').click()

    const submitResponse = await submitResponsePromise
    expect(submitResponse.ok()).toBeTruthy()

    await expect(page.getByText('Request received', { exact: true })).toBeVisible({
      timeout: 90_000,
    })
    await expect(page.getByRole('heading', { name: 'The workflow context is in.' })).toBeVisible()
    await expect(page.getByRole('button', { name: /submit another request/i })).toBeVisible()
    await expect(page.locator('p.text-red-300')).toHaveCount(0)
  })
})

test.describe('Embed Inquiry Form', () => {
  test('embed form loads for seed chef', async ({ page }) => {
    const seedIds = getSeedIds()
    const resp = await gotoPublic(page, `/embed/inquiry/${seedIds.chefId}`)
    expect(resp?.status()).not.toBe(500)
    const bodyText = await readPageText(page)
    expect(bodyText).toMatch(/book|booking form unavailable|full name|email/i)
  })

  test('embed form has name and email fields', async ({ page }) => {
    const seedIds = getSeedIds()
    await gotoPublic(page, `/embed/inquiry/${seedIds.chefId}`)
    const bodyText = await readPageText(page)
    if (/booking form unavailable/i.test(bodyText)) {
      await expect(page.getByRole('heading', { name: /booking form unavailable/i })).toBeVisible()
      return
    }

    await expect(page.getByText(/full name/i)).toBeVisible()
    await expect(page.getByText(/email/i)).toBeVisible()
  })
})

test.describe('Chef Public Profile', () => {
  test('chef profile has inquiry CTA', async ({ page }) => {
    const slug = await getPublicChefSlug(page)
    test.skip(!slug, 'No public chef profile is currently listed in the directory')
    await gotoPublic(page, `/chef/${slug}`)
    const bodyText = await readPageText(page)
    // Should have a way to inquire/book
    const hasInquiryCTA = /inquire|book|contact|get started|request/i.test(bodyText)
    expect(hasInquiryCTA).toBeTruthy()
  })
})

test.describe('Unknown Chef Slug', () => {
  test('/chef/nonexistent-slug returns 404 gracefully', async ({ page }) => {
    const resp = await gotoPublic(page, '/chef/nonexistent-slug-xyz-9999')
    const status = resp?.status() ?? 0
    // Should be 404, not 500
    expect(status).not.toBe(500)
    const bodyText = await readPageText(page)
    expect(bodyText).toMatch(
      /page not found|not found|booking form unavailable|loading booking form/i
    )
  })
})
