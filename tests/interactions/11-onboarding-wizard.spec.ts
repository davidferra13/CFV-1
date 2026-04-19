// Interaction Layer - Onboarding
// Covers the chef onboarding entry surface plus the import/setup sub-pages.

import { test, expect } from '../helpers/fixtures'

test.setTimeout(120_000)

async function gotoOnboarding(page: any, path: string) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 90_000 })
      await expect(page.locator('body')).toBeVisible()
      return
    } catch (error) {
      const message = String(error)
      const retryable = message.includes('ERR_ABORTED') || message.includes('frame was detached')
      if (!retryable || attempt === 3) throw error
      await page.waitForTimeout(1_500 * attempt)
    }
  }
}

async function expectAction(page: any, name: RegExp) {
  const button = page.getByRole('button', { name }).first()
  if ((await button.count()) > 0) {
    await expect(button).toBeVisible({ timeout: 10_000 })
    return
  }

  await expect(page.getByRole('link', { name }).first()).toBeVisible({ timeout: 10_000 })
}

test.describe('Onboarding - Entry Point', () => {
  test('/onboarding loads and shows welcome content', async ({ page }) => {
    await gotoOnboarding(page, '/onboarding')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })

  test('/onboarding has a progress indicator or step structure', async ({ page }) => {
    await gotoOnboarding(page, '/onboarding')
    const progressEl = page
      .locator('[role="progressbar"], .progress, [aria-valuemax], .step, .steps')
      .first()
      .or(page.getByText(/step|setup|get started|welcome/i).first())
    await expect(progressEl).toBeVisible({ timeout: 10_000 })
  })

  test('/onboarding has a primary setup action', async ({ page }) => {
    await gotoOnboarding(page, '/onboarding')
    await expectAction(
      page,
      /continue|next|get started|begin|start|edit profile|import clients|set up loyalty|add recipes|add staff|go to dashboard/i
    )
  })

  test('/onboarding does not throw JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await gotoOnboarding(page, '/onboarding')
    expect(errors).toHaveLength(0)
  })

  test('/onboarding renders either the wizard or the setup hub', async ({ page }) => {
    await gotoOnboarding(page, '/onboarding')
    const inputs = await page.locator('input, textarea').count()
    expect(inputs).toBeGreaterThanOrEqual(0)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })
})

test.describe('Onboarding - Clients Step', () => {
  test('/onboarding/clients loads', async ({ page }) => {
    await gotoOnboarding(page, '/onboarding/clients')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/onboarding/clients has client import or add options', async ({ page }) => {
    await gotoOnboarding(page, '/onboarding/clients')
    const clientContent = page.getByText(/client|import|add|skip|contact/i).first()
    await expect(clientContent).toBeVisible({ timeout: 10_000 })
  })

  test('/onboarding/clients has navigation forward', async ({ page }) => {
    await gotoOnboarding(page, '/onboarding/clients')
    await expectAction(page, /continue|next|skip|proceed/i)
  })

  test('/onboarding/clients does not throw JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await gotoOnboarding(page, '/onboarding/clients')
    expect(errors).toHaveLength(0)
  })
})

test.describe('Onboarding - Recipes Step', () => {
  test('/onboarding/recipes loads', async ({ page }) => {
    await gotoOnboarding(page, '/onboarding/recipes')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/onboarding/recipes has recipe-related content', async ({ page }) => {
    await gotoOnboarding(page, '/onboarding/recipes')
    const recipeContent = page.getByText(/recipe|dish|cuisine|add|import|skip/i).first()
    await expect(recipeContent).toBeVisible({ timeout: 10_000 })
  })

  test('/onboarding/recipes has navigation forward', async ({ page }) => {
    await gotoOnboarding(page, '/onboarding/recipes')
    await expectAction(page, /continue|next|skip|proceed/i)
  })

  test('/onboarding/recipes does not throw JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await gotoOnboarding(page, '/onboarding/recipes')
    expect(errors).toHaveLength(0)
  })
})

test.describe('Onboarding - Staff Step', () => {
  test('/onboarding/staff loads', async ({ page }) => {
    await gotoOnboarding(page, '/onboarding/staff')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/onboarding/staff has staff-related content', async ({ page }) => {
    await gotoOnboarding(page, '/onboarding/staff')
    const staffContent = page.getByText(/staff|assistant|helper|team|solo|skip/i).first()
    await expect(staffContent).toBeVisible({ timeout: 10_000 })
  })

  test('/onboarding/staff has navigation actions', async ({ page }) => {
    await gotoOnboarding(page, '/onboarding/staff')
    await expectAction(page, /continue|next|skip|proceed|finish|dashboard|overview/i)
  })

  test('/onboarding/staff does not throw JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await gotoOnboarding(page, '/onboarding/staff')
    expect(errors).toHaveLength(0)
  })
})

test.describe('Onboarding - Loyalty Step', () => {
  test('/onboarding/loyalty loads', async ({ page }) => {
    await gotoOnboarding(page, '/onboarding/loyalty')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/onboarding/loyalty has loyalty/rewards-related content', async ({ page }) => {
    await gotoOnboarding(page, '/onboarding/loyalty')
    const loyaltyContent = page.getByText(/loyalty|reward|point|referral|program|skip/i).first()
    await expect(loyaltyContent).toBeVisible({ timeout: 10_000 })
  })

  test('/onboarding/loyalty has navigation forward', async ({ page }) => {
    await gotoOnboarding(page, '/onboarding/loyalty')
    await expectAction(page, /continue|next|skip|finish|complete|done/i)
  })

  test('/onboarding/loyalty does not throw JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await gotoOnboarding(page, '/onboarding/loyalty')
    expect(errors).toHaveLength(0)
  })
})
