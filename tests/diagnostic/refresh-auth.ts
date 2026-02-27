// Quick auth refresh for diagnostic tests
// Run: npx playwright test --config=playwright.diagnostic.config.ts tests/diagnostic/refresh-auth.ts
//
// Uses the seed chef credentials to log in and save storageState

import { chromium } from '@playwright/test'
import { readFileSync } from 'fs'

async function refreshAuth() {
  // Use agent account (permanent, not ephemeral E2E seeds)
  const chefEmail = process.env.AGENT_EMAIL || 'agent@chefflow.test'
  const chefPassword = process.env.AGENT_PASSWORD || 'AgentChefFlow!2026'

  console.log(`Logging in as ${chefEmail}...`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Go to sign-in and wait for form
  await page.goto('http://localhost:3100/sign-in')
  await page.waitForLoadState('networkidle')

  // Follow redirect if any
  const url1 = page.url()
  console.log('Initial URL:', url1)

  if (url1.includes('/auth/signin')) {
    // We're on the auth signin page — use this form instead
    console.log('On /auth/signin page, using that form')
  }

  // Screenshot for debugging
  await page.screenshot({ path: '/tmp/diag-signin.png' })

  // Fill email — try multiple selectors
  const emailInput = page.locator('input').first()
  await emailInput.fill(chefEmail)
  console.log('Filled email')

  // Fill password — get second input
  const inputs = page.locator('input')
  const inputCount = await inputs.count()
  console.log(`Found ${inputCount} inputs`)

  if (inputCount >= 2) {
    const passwordInput = inputs.nth(1)
    await passwordInput.fill(chefPassword)
    console.log('Filled password')
  }

  // Click sign in button
  const signInBtn = page.getByRole('button', { name: /sign in/i }).first()
  await signInBtn.click()
  console.log('Clicked sign in')

  // Wait for navigation
  await page.waitForTimeout(5000)
  console.log('After wait, URL:', page.url())

  // Take screenshot after sign in attempt
  await page.screenshot({ path: '/tmp/diag-after-signin.png' })

  await page.waitForLoadState('networkidle')

  // Save storage state
  await context.storageState({ path: '.auth/chef.json' })
  console.log('Saved auth state to .auth/chef.json')
  console.log('Current URL:', page.url())

  await browser.close()
}

refreshAuth().catch(console.error)
