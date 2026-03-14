// Soak test global setup — identical to the main global setup but uses
// the soak server port (3200) instead of the dev server port (3100).
// This is necessary because soak tests run against `next start` on port 3200.

import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs'
import dotenv from 'dotenv'
import { seedE2EData } from '../helpers/e2e-seed'

dotenv.config({ path: '.env.local' })

const SOAK_URL = 'http://localhost:3200'
// Auth against dev server (port 3100) because the E2E auth endpoint
// returns 403 in production mode (next start). Auth tokens (Supabase JWT)
// are valid regardless of which port issued them.
const AUTH_URL = 'http://localhost:3100'

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
    const resp = await page.request.post(`${AUTH_URL}/api/e2e/auth`, {
      data: { email, password },
    })

    if (!resp.ok()) {
      const body = await resp.text()
      throw new Error(`E2E auth endpoint returned ${resp.status()}: ${body}`)
    }

    await page.goto(`${AUTH_URL}/`, { timeout: 60_000, waitUntil: 'domcontentloaded' })
    await page.waitForURL(expectedUrlPattern, { timeout: 60_000 })
    await context.addCookies([
      {
        name: 'cookieConsent',
        value: 'declined',
        url: AUTH_URL,
      },
      {
        name: 'cookieConsent',
        value: 'declined',
        url: SOAK_URL,
      },
    ])
    await context.storageState({ path: outputPath })
    console.log(`[soak-setup] ${label} auth state saved → ${outputPath}`)
  } catch (err) {
    const url = page.url()
    throw new Error(
      `[soak-setup] ${label} login failed. URL: ${url}\nEmail: ${email}\n${String(err)}`
    )
  } finally {
    await context.close()
  }
}

export default async function globalSetup() {
  mkdirSync('.auth', { recursive: true })

  // Seed test data
  console.log('\n[soak-setup] Seeding E2E test data...')
  const seedResult = await seedE2EData()

  writeFileSync('.auth/seed-ids.json', JSON.stringify(seedResult, null, 2), 'utf-8')
  console.log('[soak-setup] Seed IDs written to .auth/seed-ids.json')

  const browser = await chromium.launch()

  await loginAndSaveState(
    browser,
    seedResult.chefEmail,
    seedResult.chefPassword,
    /\/dashboard/,
    '.auth/chef.json',
    'Chef'
  )

  await browser.close()
  console.log('[soak-setup] Complete. Ready to run soak tests.\n')
}
