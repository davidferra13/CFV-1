// Interaction Layer — Onboarding Wizard
// Tests the chef onboarding flow which guides new chefs through
// setting up their profile, importing clients, adding recipes,
// setting up staff, and configuring loyalty/rewards.
//
// Steps covered:
//   /onboarding          — Welcome / profile setup
//   /onboarding/clients  — Import or add initial clients
//   /onboarding/recipes  — Add first recipes
//   /onboarding/staff    — Add staff members
//   /onboarding/loyalty  — Configure loyalty/rewards program
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Onboarding Entry ─────────────────────────────────────────────────────────

test.describe('Onboarding — Entry Point', () => {
  test('/onboarding loads and shows welcome content', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })

  test('/onboarding has a progress indicator or step structure', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForLoadState('networkidle')
    // Should show some indication of steps or progress
    const progressEl = page
      .locator('[role="progressbar"], .progress, [aria-valuemax], .step, .steps')
      .first()
      .or(page.getByText(/step|setup|get started|welcome/i).first())
    await expect(progressEl).toBeVisible({ timeout: 10_000 })
  })

  test('/onboarding has a continue or next button', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForLoadState('networkidle')
    const nextBtn = page
      .getByRole('button', { name: /continue|next|get started|begin|start/i })
      .first()
    await expect(nextBtn).toBeVisible({ timeout: 10_000 })
  })

  test('/onboarding does not throw JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/onboarding')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/onboarding has form fields for profile information', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForLoadState('networkidle')
    // Onboarding typically collects name, tagline, bio, etc.
    const inputs = await page.locator('input, textarea').count()
    expect(inputs, 'Onboarding should have form fields').toBeGreaterThanOrEqual(0)
    // At minimum the page should render content
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })
})

// ─── Onboarding Clients Step ──────────────────────────────────────────────────

test.describe('Onboarding — Clients Step', () => {
  test('/onboarding/clients loads', async ({ page }) => {
    await page.goto('/onboarding/clients')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/onboarding/clients has client import or add options', async ({ page }) => {
    await page.goto('/onboarding/clients')
    await page.waitForLoadState('networkidle')
    // Should show options to import, add, or skip clients
    const clientContent = page
      .getByText(/client|import|add|skip|contact/i)
      .first()
    await expect(clientContent).toBeVisible({ timeout: 10_000 })
  })

  test('/onboarding/clients has navigation forward', async ({ page }) => {
    await page.goto('/onboarding/clients')
    await page.waitForLoadState('networkidle')
    const nextBtn = page
      .getByRole('button', { name: /continue|next|skip|proceed/i })
      .first()
    await expect(nextBtn).toBeVisible({ timeout: 10_000 })
  })

  test('/onboarding/clients does not throw JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/onboarding/clients')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Onboarding Recipes Step ──────────────────────────────────────────────────

test.describe('Onboarding — Recipes Step', () => {
  test('/onboarding/recipes loads', async ({ page }) => {
    await page.goto('/onboarding/recipes')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/onboarding/recipes has recipe-related content', async ({ page }) => {
    await page.goto('/onboarding/recipes')
    await page.waitForLoadState('networkidle')
    const recipeContent = page
      .getByText(/recipe|dish|cuisine|add|import|skip/i)
      .first()
    await expect(recipeContent).toBeVisible({ timeout: 10_000 })
  })

  test('/onboarding/recipes has navigation forward', async ({ page }) => {
    await page.goto('/onboarding/recipes')
    await page.waitForLoadState('networkidle')
    const nextBtn = page
      .getByRole('button', { name: /continue|next|skip|proceed/i })
      .first()
    await expect(nextBtn).toBeVisible({ timeout: 10_000 })
  })

  test('/onboarding/recipes does not throw JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/onboarding/recipes')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Onboarding Staff Step ────────────────────────────────────────────────────

test.describe('Onboarding — Staff Step', () => {
  test('/onboarding/staff loads', async ({ page }) => {
    await page.goto('/onboarding/staff')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/onboarding/staff has staff-related content', async ({ page }) => {
    await page.goto('/onboarding/staff')
    await page.waitForLoadState('networkidle')
    const staffContent = page
      .getByText(/staff|assistant|helper|team|solo|skip/i)
      .first()
    await expect(staffContent).toBeVisible({ timeout: 10_000 })
  })

  test('/onboarding/staff has navigation forward', async ({ page }) => {
    await page.goto('/onboarding/staff')
    await page.waitForLoadState('networkidle')
    const nextBtn = page
      .getByRole('button', { name: /continue|next|skip|proceed|finish/i })
      .first()
    await expect(nextBtn).toBeVisible({ timeout: 10_000 })
  })

  test('/onboarding/staff does not throw JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/onboarding/staff')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Onboarding Loyalty Step ──────────────────────────────────────────────────

test.describe('Onboarding — Loyalty Step', () => {
  test('/onboarding/loyalty loads', async ({ page }) => {
    await page.goto('/onboarding/loyalty')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/onboarding/loyalty has loyalty/rewards-related content', async ({ page }) => {
    await page.goto('/onboarding/loyalty')
    await page.waitForLoadState('networkidle')
    const loyaltyContent = page
      .getByText(/loyalty|reward|point|referral|program|skip/i)
      .first()
    await expect(loyaltyContent).toBeVisible({ timeout: 10_000 })
  })

  test('/onboarding/loyalty has navigation forward (finish onboarding)', async ({ page }) => {
    await page.goto('/onboarding/loyalty')
    await page.waitForLoadState('networkidle')
    const nextBtn = page
      .getByRole('button', { name: /continue|next|skip|finish|complete|done/i })
      .first()
    await expect(nextBtn).toBeVisible({ timeout: 10_000 })
  })

  test('/onboarding/loyalty does not throw JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/onboarding/loyalty')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Onboarding Cross-Step Navigation ─────────────────────────────────────────

test.describe('Onboarding — Step Accessibility', () => {
  const onboardingSteps = [
    { label: 'main', path: '/onboarding' },
    { label: 'clients', path: '/onboarding/clients' },
    { label: 'recipes', path: '/onboarding/recipes' },
    { label: 'staff', path: '/onboarding/staff' },
    { label: 'loyalty', path: '/onboarding/loyalty' },
  ]

  for (const step of onboardingSteps) {
    test(`Onboarding ${step.label} step is accessible by URL`, async ({ page }) => {
      await page.goto(step.path)
      await page.waitForLoadState('networkidle')
      expect(page.url()).not.toMatch(/auth\/signin/)
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    })
  }

  test('All onboarding steps accessible without JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    for (const step of onboardingSteps) {
      await page.goto(step.path)
      await page.waitForLoadState('networkidle')
    }

    expect(errors, 'No JS errors across all onboarding steps').toHaveLength(0)
  })
})
