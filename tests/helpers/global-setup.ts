// Playwright global setup
// 1. Seeds remote test data
// 2. Logs in role accounts and saves storage state
// 3. Writes .auth/seed-ids.json for test fixtures
//
// Auth strategy:
// 1. Prefer /api/e2e/auth when the target explicitly allows it.
// 2. Fall back to the real browser sign-in flow when beta blocks the test-only endpoint.

import { chromium } from '@playwright/test'
import type { FullConfig, Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'fs'
import dotenv from 'dotenv'
import { seedE2EData } from './e2e-seed'

dotenv.config({ path: '.env.local' })

function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

function isLocalBaseUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(url)
}

const DEFAULT_REMOTE_BASE_URL = 'https://beta.cheflowhq.com'
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || DEFAULT_REMOTE_BASE_URL
const ALLOW_LOCAL_TARGET = envFlag(process.env.PLAYWRIGHT_ALLOW_LOCAL, false)

if (isLocalBaseUrl(BASE_URL) && !ALLOW_LOCAL_TARGET) {
  throw new Error(
    `Local Playwright targets are disabled by default. Set PLAYWRIGHT_BASE_URL to ${DEFAULT_REMOTE_BASE_URL} or opt into localhost with PLAYWRIGHT_ALLOW_LOCAL=true.`
  )
}

const PUBLIC_ONLY_PROJECTS = new Set([
  'smoke',
  'public',
  'coverage-public',
  'interactions-public',
  'launch-public',
])

const ADMIN_PROJECTS = new Set(['coverage-admin', 'interactions-admin'])

function getSelectedProjects(config: FullConfig): string[] {
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
    return selectedProjects
  }

  return config.projects.map((project) => project.name)
}

function needsAuthBootstrap(config: FullConfig): boolean {
  if (process.env.PLAYWRIGHT_SKIP_AUTH_BOOTSTRAP === 'true') {
    return false
  }

  return getSelectedProjects(config).some((name) => !PUBLIC_ONLY_PROJECTS.has(name))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForServerReady(maxAttempts = 20): Promise<void> {
  const readinessPaths = ['/api/health', '/auth/signin', '/']
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
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
          console.log(`[globalSetup] Test target is ready (${BASE_URL}) via ${path}`)
          return
        }
      } catch {
        // Probe next endpoint.
      }
    }
    console.log(`[globalSetup] Waiting for test target (${attempt}/${maxAttempts})...`)
    await sleep(2_000)
  }

  throw new Error(`[globalSetup] Test target did not become ready at ${BASE_URL} in time.`)
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

async function loginViaSignInPage(
  page: Page,
  email: string,
  password: string,
  expectedUrlPattern: RegExp
) {
  await page.goto(`${BASE_URL}/auth/signin`, { timeout: 90_000, waitUntil: 'domcontentloaded' })

  const emailInput = page.locator('input[type="email"]').first()
  const passwordInput = page.locator('input[type="password"]').first()
  const submitButton = page.getByRole('button', { name: /^sign in$/i }).first()

  await emailInput.waitFor({ state: 'visible', timeout: 30_000 })
  await passwordInput.waitFor({ state: 'visible', timeout: 30_000 })
  await submitButton.waitFor({ state: 'visible', timeout: 30_000 })

  await emailInput.fill(email)
  await passwordInput.fill(password)

  try {
    await Promise.all([
      page.waitForURL(expectedUrlPattern, { timeout: 90_000 }),
      submitButton.click(),
    ])
  } catch (error) {
    const alertText =
      (await page
        .locator('[role="alert"]')
        .first()
        .textContent()
        .catch(() => null)) ||
      (await page
        .locator('text=/invalid|incorrect|failed|temporarily unavailable/i')
        .first()
        .textContent()
        .catch(() => null))

    throw new Error(
      `UI sign-in did not reach ${expectedUrlPattern}. Current URL: ${page.url()}${
        alertText ? ` | Alert: ${alertText.trim()}` : ''
      } | ${String(error)}`
    )
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
    let usedUiFallback = false

    const resp = await page.request.post(`${BASE_URL}/api/e2e/auth`, {
      data: { email, password },
      timeout: 90_000,
    })

    if (resp.ok()) {
      await page.goto(`${BASE_URL}${navigateTo}`, { timeout: 90_000 })
      await page.waitForURL(expectedUrlPattern, { timeout: 60_000 })
    } else {
      const body = await resp.text()
      const shouldFallbackToUi =
        resp.status() === 403 || resp.status() === 404 || resp.status() === 405

      if (!shouldFallbackToUi) {
        throw new Error(`E2E auth endpoint returned ${resp.status()}: ${body}`)
      }

      usedUiFallback = true
      console.log(
        `[globalSetup] ${label} /api/e2e/auth unavailable on ${BASE_URL} (${resp.status()}). Falling back to browser sign-in.`
      )
      await loginViaSignInPage(page, email, password, expectedUrlPattern)
    }

    await context.addCookies([
      {
        name: 'cookieConsent',
        value: 'declined',
        url: BASE_URL,
      },
    ])
    await context.storageState({ path: outputPath })
    console.log(
      `[globalSetup] ${label} auth state saved -> ${outputPath}${usedUiFallback ? ' (UI login fallback)' : ''}`
    )
  } catch (err) {
    const url = page.url()
    throw new Error(
      `[globalSetup] ${label} login failed. URL: ${url}\nEmail: ${email}\n${String(err)}`
    )
  } finally {
    await context.close()
  }
}

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
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
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
  mkdirSync('.auth', { recursive: true })

  if (!needsAuthBootstrap(config)) {
    console.log(
      '[globalSetup] Public-only project selection detected. Skipping seed/auth bootstrap.\n'
    )
    return
  }

  await waitForServerReady()

  console.log('\n[globalSetup] Seeding E2E test data...')
  const seedResult = await seedE2EData()

  writeFileSync('.auth/seed-ids.json', JSON.stringify(seedResult, null, 2), 'utf-8')
  console.log('[globalSetup] Seed IDs written to .auth/seed-ids.json')

  await warmE2EAuthEndpoint()

  const browser = await chromium.launch()
  const selectedProjects = new Set(getSelectedProjects(config))

  await loginAndSaveState(
    browser,
    seedResult.chefEmail,
    seedResult.chefPassword,
    /\/dashboard/,
    '.auth/chef.json',
    'Chef'
  )

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

  const adminEmail = process.env.ADMIN_E2E_EMAIL
  const adminPassword = process.env.ADMIN_E2E_PASSWORD
  const shouldBootstrapAdmin =
    adminEmail &&
    adminPassword &&
    Array.from(selectedProjects).some((name) => ADMIN_PROJECTS.has(name))

  if (shouldBootstrapAdmin) {
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
    console.log('[globalSetup] Skipping admin auth bootstrap for this project selection.')
    writeFileSync('.auth/admin.json', JSON.stringify({ cookies: [], origins: [] }), 'utf-8')
  }

  await browser.close()
  console.log('[globalSetup] Complete. Ready to run tests.\n')
}
