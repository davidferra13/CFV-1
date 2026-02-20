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

async function loginAndSaveState(
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
    await page.goto(`${BASE_URL}/`)
    await page.waitForURL(expectedUrlPattern, { timeout: 30_000 })
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

  await browser.close()
  console.log('[globalSetup] Complete. Ready to run tests.\n')
}
