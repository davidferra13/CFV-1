// Playwright globalSetup — runs once before all E2E tests
// 1. Seeds remote test data (idempotent — safe to run on every test run)
// 2. Logs in as test chef → saves .auth/chef.json
// 3. Logs in as test client → saves .auth/client.json
// 4. Logs in as test staff → saves .auth/staff.json
// 5. Logs in as test partner → saves .auth/partner.json
// 6. Writes .auth/seed-ids.json (read by fixtures.ts in every test)
//
// Auth strategy: posts to /api/e2e/auth (guarded by SUPABASE_E2E_ALLOW_REMOTE=true).
// This bypasses the in-memory rate limiter in the signIn server action, which would
// otherwise accumulate counts across test runs while reuseExistingServer is true.

import { chromium } from '@playwright/test'
import type { FullConfig } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'fs'
import dotenv from 'dotenv'
import { seedE2EData } from './e2e-seed'

dotenv.config({ path: '.env.local' })

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100'
const PUBLIC_ONLY_PROJECTS = new Set([
  'smoke',
  'public',
  'coverage-public',
  'interactions-public',
  'launch-public',
])

function needsAuthBootstrap(config: FullConfig): boolean {
  const selectedProjects: string[] = []
  for (let i = 0; i < process.argv.length; i += 1) {
    const arg = process.argv[i]
    if (arg.startsWith('--project=')) {
      selectedProjects.push(arg.slice('--project='.length))
      continue
    }
    if (arg === '--project') {
      const next = process.argv[i + 1]
      if (next) selectedProjects.push(next)
    }
  }

  if (selectedProjects.length > 0) {
    return selectedProjects.some((name) => !PUBLIC_ONLY_PROJECTS.has(name))
  }

  return config.projects.some((project) => !PUBLIC_ONLY_PROJECTS.has(project.name))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForServerReady(maxAttempts = 20): Promise<void> {
  const readinessPaths = ['/api/health', '/auth/signin', '/']
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    for (const path of readinessPaths) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 3_000)
        const resp = await fetch(`${BASE_URL}${path}`, {
          method: path === '/api/health' ? 'HEAD' : 'GET',
          redirect: 'manual',
          signal: controller.signal,
        })
        clearTimeout(timeout)
        if (resp.status < 500) {
          console.log(`[globalSetup] Dev server is ready (${BASE_URL}) via ${path}`)
          return
        }
      } catch {
        // Probe next endpoint.
      }
    }
    console.log(`[globalSetup] Waiting for dev server (${attempt}/${maxAttempts})...`)
    await sleep(2_000)
  }

  throw new Error(`[globalSetup] Dev server did not become ready at ${BASE_URL} in time.`)
}

async function warmE2EAuthEndpoint(): Promise<void> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    await fetch(`${BASE_URL}/api/e2e/auth`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
      signal: controller.signal,
    })
    clearTimeout(timeout)
  } catch {
    // Warm-up probe is best-effort.
  }
}

async function loginAndSaveStateOnce(
  browser: ReturnType<typeof chromium.launch> extends Promise<infer T> ? T : never,
  email: string,
  password: string,
  expectedUrlPattern: RegExp,
  outputPath: string,
  label: string,
  navigateTo = '/'
) {
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // POST to the test-only auth endpoint — no rate limiter, sets SSR auth cookies
    const resp = await page.request.post(`${BASE_URL}/api/e2e/auth`, {
      data: { email, password },
      timeout: 90_000,
    })

    if (!resp.ok()) {
      const body = await resp.text()
      throw new Error(`E2E auth endpoint returned ${resp.status()}: ${body}`)
    }

    // Cookies are now in the browser context. Navigate to the portal entry point
    // so middleware/layout resolves the role. Default: / (middleware redirects by role).
    // Some roles (e.g. partner) need a direct URL since middleware doesn't route them.
    // Generous timeout for dev server on-demand page compilation.
    await page.goto(`${BASE_URL}${navigateTo}`, { timeout: 90_000 })
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
  maxRetries = 3,
  navigateTo = '/'
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await loginAndSaveStateOnce(
        browser,
        email,
        password,
        expectedUrlPattern,
        outputPath,
        label,
        navigateTo
      )
      return
    } catch (err) {
      const msg = String(err)
      const isRetryable =
        msg.includes('ECONNRESET') ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('ERR_CONNECTION_REFUSED') ||
        msg.includes('Timeout') ||
        msg.includes('timeout') ||
        msg.includes('disposed')
      if (!isRetryable || attempt === maxRetries) throw err
      console.log(
        `[globalSetup] ${label} attempt ${attempt}/${maxRetries} failed (retryable). Waiting 8s...`
      )
      await waitForServerReady(10)
      await sleep(8_000)
    }
  }
}

export default async function globalSetup(config: FullConfig) {
  // Ensure .auth/ directory exists
  mkdirSync('.auth', { recursive: true })

  if (!needsAuthBootstrap(config)) {
    console.log(
      '[globalSetup] Public-only project selection detected. Skipping seed/auth bootstrap.\n'
    )
    return
  }

  await waitForServerReady()

  // Seed test data — idempotent, safe to call on every run
  console.log('\n[globalSetup] Seeding E2E test data...')
  const seedResult = await seedE2EData()

  // Write seed IDs to disk so test fixtures can read them across worker boundaries
  writeFileSync('.auth/seed-ids.json', JSON.stringify(seedResult, null, 2), 'utf-8')
  console.log('[globalSetup] Seed IDs written to .auth/seed-ids.json')

  await warmE2EAuthEndpoint()

  const browser = await chromium.launch()

  await loginAndSaveState(
    browser,
    seedResult.chefEmail,
    seedResult.chefPassword,
    /\/dashboard/,
    '.auth/chef.json',
    'Chef'
  )

  // Small delay between logins — dev server auth endpoint takes ~25s under cold start
  await sleep(2_000)

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

  await loginAndSaveState(
    browser,
    seedResult.staffEmail,
    seedResult.staffPassword,
    /\/staff-dashboard/,
    '.auth/staff.json',
    'Staff'
  )

  await loginAndSaveState(
    browser,
    seedResult.partnerEmail,
    seedResult.partnerPassword,
    /\/partner\/dashboard/,
    '.auth/partner.json',
    'Partner',
    3,
    '/partner/dashboard'
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
      'Admin',
      3,
      '/admin'
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
