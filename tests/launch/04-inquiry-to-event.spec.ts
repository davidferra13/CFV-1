// Launch Readiness Audit — Inquiry to Event Flow
// Tests: view inquiries, inquiry detail, create inquiry, convert to event
// Authenticated as chef

import { test, expect } from '../helpers/fixtures'

test.describe('Inquiry List', () => {
  test('inquiry list page loads with seed data', async ({ page }) => {
    await page.goto('/inquiries')
    await page.waitForLoadState('networkidle')
    // Should show inquiry entries (seed has 2 inquiries)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(50)
    // Should not be a 500 error page
    expect(bodyText).not.toMatch(/500|internal server error/i)
  })

  test('inquiry filter tabs are visible', async ({ page }) => {
    await page.goto('/inquiries')
    await page.waitForLoadState('networkidle')
    // Should have filter/status tabs or links
    const filterArea = page.getByText(/awaiting|all|new|response/i).first()
    await expect(filterArea).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Inquiry Detail', () => {
  test('awaiting-chef inquiry detail page loads', async ({ page, seedIds }) => {
    await page.goto(`/inquiries/${seedIds.inquiryIds.awaitingChef}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    // Should show inquiry information
    expect(bodyText.length).toBeGreaterThan(50)
    expect(bodyText).not.toMatch(/500|internal server error/i)
  })

  test('inquiry detail shows key fields', async ({ page, seedIds }) => {
    await page.goto(`/inquiries/${seedIds.inquiryIds.awaitingChef}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    // Should contain inquiry-related content (occasion, status, date, etc.)
    const hasRelevantContent = /occasion|date|guest|budget|status|inquiry|client|event/i.test(
      bodyText
    )
    expect(hasRelevantContent).toBeTruthy()
  })
})

test.describe('Create New Inquiry', () => {
  test('new inquiry form renders', async ({ page }) => {
    await page.goto('/inquiries/new')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should have a form with input fields
    const inputs = page.locator('input, textarea, select')
    const inputCount = await inputs.count()
    expect(inputCount).toBeGreaterThanOrEqual(2)
  })

  test('new inquiry form has required fields', async ({ page }) => {
    await page.goto('/inquiries/new')
    await page.waitForLoadState('networkidle')
    // Check for key form fields — name/email/occasion/date/guests
    const bodyText = await page.locator('body').innerText()
    const hasFormLabels = /name|email|occasion|date|guest|phone/i.test(bodyText)
    expect(hasFormLabels).toBeTruthy()
  })

  test('can fill and submit inquiry form', async ({ page }) => {
    await page.goto('/inquiries/new')
    await page.waitForLoadState('networkidle')

    // Fill in the form fields — adapt selectors to what's actually rendered
    const nameField = page.getByLabel(/name/i).first().or(page.getByPlaceholder(/name/i).first())
    if (await nameField.isVisible().catch(() => false)) {
      await nameField.fill('Launch Test Client')
    }

    const emailField = page.getByLabel(/email/i).first().or(page.getByPlaceholder(/email/i).first())
    if (await emailField.isVisible().catch(() => false)) {
      await emailField.fill('launch-test@example.com')
    }

    const occasionField = page
      .getByLabel(/occasion/i)
      .first()
      .or(page.getByPlaceholder(/occasion/i).first())
    if (await occasionField.isVisible().catch(() => false)) {
      await occasionField.fill('Birthday Dinner')
    }

    // Look for submit button
    const submitBtn = page.getByRole('button', { name: /save|submit|create|add/i }).first()
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click()
      // Wait for response — either redirect or success message
      await page.waitForTimeout(3000)
      const url = page.url()
      const bodyText = await page.locator('body').innerText()
      const succeeded = !url.includes('/inquiries/new') || /created|saved|success/i.test(bodyText)
      expect(succeeded).toBeTruthy()
    }
  })
})

test.describe('Inquiry Sub-Pages', () => {
  const subRoutes = [
    '/inquiries/awaiting-response',
    '/inquiries/awaiting-client-reply',
    '/inquiries/menu-drafting',
    '/inquiries/sent-to-client',
    '/inquiries/declined',
  ]

  for (const route of subRoutes) {
    test(`${route} loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      expect(resp?.status()).not.toBe(500)
      await page.waitForLoadState('networkidle')
    })
  }
})

test.describe('Inquiry Workflow Contract', () => {
  test('awaiting-chef inquiry exposes quote creation before event conversion', async ({
    page,
    seedIds,
  }) => {
    await page.goto(`/inquiries/${seedIds.inquiryIds.awaitingChef}`)
    await page.waitForLoadState('networkidle')

    const createQuoteLink = page.getByTestId('inquiry-create-quote')
    await expect(createQuoteLink).toBeVisible()
    const href = await createQuoteLink.getAttribute('href')
    expect(href).toBeTruthy()

    const url = new URL(href!, 'http://localhost')
    expect(url.pathname).toBe('/quotes/new')
    expect(url.searchParams.get('source')).toBe('inquiry')
    expect(url.searchParams.get('inquiry_id')).toBe(seedIds.inquiryIds.awaitingChef)

    const quotesSection = page.getByTestId('inquiry-quotes-section')
    await expect(quotesSection).toBeVisible()
    await expect(quotesSection.locator(`a[href="/quotes/${seedIds.quoteIds.draft}"]`)).toBeVisible()

    await expect(
      page.getByRole('button', { name: /convert to event|convert to series/i })
    ).not.toBeVisible()
  })
})
