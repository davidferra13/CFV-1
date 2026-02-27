// Playwright globalSetup — runs once before all E2E tests
// 1. Seeds remote test data (idempotent — safe to run on every test run)
// 2. Logs in as test chef → saves .auth/chef.json
// 3. Logs in as test client → saves .auth/client.json
// 4. Writes .auth/seed-ids.json (read by fixtures.ts in every test)
//
// Auth strategy: posts to /api/e2e/auth (guarded by SUPABASE_E2E_ALLOW_REMOTE=true).
// This bypasses the in-memory rate limiter in the signIn server action, which would
// otherwise accumulate counts across test runs while reuseExistingServer is true.

import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'fs'
import dotenv from 'dotenv'
import { seedE2EData } from './e2e-seed'

dotenv.config({ path: '.env.local' })

const BASE_URL = 'http://localhost:3100'

async function loginAndSaveStateOnce(
  browser: ReturnType<typeof chromium.launch> extends Promise<infer T> ? T : never,
  email: string,
  password: string,
  expectedUrlPattern: RegExp,
  outputPath: string,
  label: string
) {
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // POST to the test-only auth endpoint — no rate limiter, sets SSR auth cookies
    const resp = await page.request.post(`${BASE_URL}/api/e2e/auth`, {
      data: { email, password },
    })

    if (!resp.ok()) {
      const body = await resp.text()
      throw new Error(`E2E auth endpoint returned ${resp.status()}: ${body}`)
    }

    // Cookies are now in the browser context. Navigate to / so middleware resolves
    // the role and redirects to the appropriate portal (/dashboard or /my-events).
    // Generous timeout for dev server on-demand page compilation.
    await page.goto(`${BASE_URL}/`, { timeout: 90_000 })
    await page.waitForURL(expectedUrlPattern, { timeout: 60_000 })
    await context.addCookies([
      {
        name: 'cookieConsent',
        value: 'declined',
        url: BASE_URL,
      },
    ])
    await context.storageState({ path: outputPath })
    console.log(`[globalSetup] ${label} auth state saved → ${outputPath}`)
  } catch (err) {
    const url = page.url()
    throw new Error(
      `[globalSetup] ${label} login failed. URL: ${url}\nEmail: ${email}\n${String(err)}`
    )
  } finally {
    await context.close()
  }
}

/** Retry wrapper — handles ECONNRESET / timeout when dev server is under load */
async function loginAndSaveState(
  browser: ReturnType<typeof chromium.launch> extends Promise<infer T> ? T : never,
  email: string,
  password: string,
  expectedUrlPattern: RegExp,
  outputPath: string,
  label: string,
  maxRetries = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await loginAndSaveStateOnce(browser, email, password, expectedUrlPattern, outputPath, label)
      return
    } catch (err) {
      const msg = String(err)
      const isRetryable =
        msg.includes('ECONNRESET') || msg.includes('Timeout') || msg.includes('timeout')
      if (!isRetryable || attempt === maxRetries) throw err
      console.log(
        `[globalSetup] ${label} attempt ${attempt}/${maxRetries} failed (retryable). Waiting 5s...`
      )
      await new Promise((r) => setTimeout(r, 5_000))
    }
  }
}

export default async function globalSetup() {
  // Ensure .auth/ directory exists
  mkdirSync('.auth', { recursive: true })

  // Seed test data — idempotent, safe to call on every run
  console.log('\n[globalSetup] Seeding E2E test data...')
  const seedResult = await seedE2EData()

  // Write seed IDs to disk so test fixtures can read them across worker boundaries
  writeFileSync('.auth/seed-ids.json', JSON.stringify(seedResult, null, 2), 'utf-8')
  console.log('[globalSetup] Seed IDs written to .auth/seed-ids.json')

  const browser = await chromium.launch()

  await loginAndSaveState(
    browser,
    seedResult.chefEmail,
    seedResult.chefPassword,
    /\/dashboard/,
    '.auth/chef.json',
    'Chef'
  )

  await loginAndSaveState(
    browser,
    seedResult.clientEmail,
    seedResult.clientPassword,
    /\/my-events/,
    '.auth/client.json',
    'Client'
  )

  await loginAndSaveState(
    browser,
    seedResult.chefBEmail,
    seedResult.chefBPassword,
    /\/dashboard/,
    '.auth/chef-b.json',
    'Chef B'
  )

  // Admin auth — only runs if ADMIN_E2E_EMAIL and ADMIN_E2E_PASSWORD are set.
  // These are the credentials for davidferra13@gmail.com (the platform admin).
  // Without them, coverage-admin tests are skipped gracefully.
  const adminEmail = process.env.ADMIN_E2E_EMAIL
  const adminPassword = process.env.ADMIN_E2E_PASSWORD
  if (adminEmail && adminPassword) {
    await loginAndSaveState(
      browser,
      adminEmail,
      adminPassword,
      /\/admin/,
      '.auth/admin.json',
      'Admin'
    )
  } else {
    console.log(
      '[globalSetup] ADMIN_E2E_EMAIL/ADMIN_E2E_PASSWORD not set — skipping admin auth state. Admin coverage tests will be skipped.'
    )
    // Write an empty storage state so coverage-admin project does not crash on missing file
    const { writeFileSync } = await import('fs')
    writeFileSync('.auth/admin.json', JSON.stringify({ cookies: [], origins: [] }), 'utf-8')
  }

  await browser.close()
  console.log('[globalSetup] Complete. Ready to run tests.\n')
}
