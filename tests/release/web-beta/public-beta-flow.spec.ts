import { test, expect } from '@playwright/test'

test.describe('web beta release surfaces', () => {
  test('home hero CTA lands on beta waitlist with attribution intact', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveTitle(/ChefFlow Beta|ChefFlow/i)

    const primaryCta = page.getByRole('link', { name: 'Request early access' }).first()
    await expect(primaryCta).toHaveAttribute(
      'href',
      /\/beta\?source_page=home(?:&|&amp;)source_cta=hero_primary/
    )

    await primaryCta.click()
    await page.waitForURL(/\/beta\?source_page=home&source_cta=hero_primary/)
    await expect(
      page.getByRole('heading', {
        name: /Request access to the operator system behind every booking\./i,
      })
    ).toBeVisible()
  })

  test('pricing page stays in beta mode and exposes the operator access form', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'Simple Pricing' })).toBeVisible()
    await expect(
      page.getByText('Invite-only beta with direct onboarding for early operators.')
    ).toBeVisible()

    const pricingCta = page.getByRole('link', { name: 'Request early access' }).first()
    await expect(pricingCta).toHaveAttribute(
      'href',
      /\/beta\?source_page=pricing(?:&|&amp;)source_cta=pricing_card_primary/
    )

    await page.goto('/beta?source_page=pricing&source_cta=pricing_card_primary', {
      waitUntil: 'domcontentloaded',
    })
    const requestAccessCard = page.locator('aside')
    await expect(requestAccessCard.getByRole('textbox', { name: 'Name*' })).toBeVisible()
    await expect(requestAccessCard.getByRole('textbox', { name: 'Email*' })).toBeVisible()
    await expect(
      requestAccessCard.getByRole('button', { name: 'Request early access' })
    ).toBeVisible()
    await expect(
      page.getByText('No credit card required. We email access updates as rollout progresses.')
    ).toBeVisible()
  })

  test('readiness endpoint exposes the public status contract', async ({ request }) => {
    const response = await request.get('/api/health/readiness')
    expect(response.status()).toBe(200)
    expect(response.headers()['x-health-scope']).toBe('readiness')

    const body = await response.json()
    expect(['ok', 'degraded']).toContain(body.status)
    expect(body.checks).toBeTruthy()
    expect(body.details).toBeTruthy()
    expect(body.build).toBeTruthy()
  })
})
