// Playwright globalSetup runs once before the E2E suite.
// It seeds test data, creates auth states, and writes seed IDs for fixtures.

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
const CHEF_ONLY_PROJECTS = new Set(['chef', 'coverage-chef', 'interactions-chef', 'journey-chef'])
const CLIENT_ONLY_PROJECTS = new Set(['client', 'coverage-client', 'interactions-client'])
const STAFF_ONLY_PROJECTS = new Set(['interactions-staff'])
const ADMIN_ONLY_PROJECTS = new Set(['coverage-admin', 'interactions-admin', 'launch-admin'])

type RequiredAuthStates = {
  chef: boolean
  client: boolean
  chefB: boolean
  staff: boolean
  partner: boolean
  admin: boolean
}

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

  if (selectedProjects.length > 0) return selectedProjects
  return config.projects.map((project) => project.name)
}

function needsAuthBootstrap(config: FullConfig): boolean {
  if (process.env.PLAYWRIGHT_SKIP_AUTH_BOOTSTRAP === 'true') {
    return false
  }

  const selectedProjects = getSelectedProjects(config)
  return selectedProjects.some((name) => !PUBLIC_ONLY_PROJECTS.has(name))
}

function getRequiredAuthStates(config: FullConfig): RequiredAuthStates {
  const selectedProjects = getSelectedProjects(config)
  const required: RequiredAuthStates = {
    chef: false,
    client: false,
    chefB: false,
    staff: false,
    partner: false,
    admin: false,
  }

  for (const projectName of selectedProjects) {
    if (PUBLIC_ONLY_PROJECTS.has(projectName)) continue
    if (CHEF_ONLY_PROJECTS.has(projectName)) {
      required.chef = true
      continue
    }
    if (CLIENT_ONLY_PROJECTS.has(projectName)) {
      required.client = true
      continue
    }
    if (STAFF_ONLY_PROJECTS.has(projectName)) {
      required.staff = true
      continue
    }
    if (ADMIN_ONLY_PROJECTS.has(projectName)) {
      required.admin = true
      continue
    }
    if (projectName === 'cross-portal') {
      required.chef = true
      required.client = true
      continue
    }
    if (projectName === 'isolation-tests') {
      required.chef = true
      required.chefB = true
      continue
    }

    return {
      chef: true,
      client: true,
      chefB: true,
      staff: true,
      partner: true,
      admin: true,
    }
  }

  return required
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
        // Probe the next endpoint.
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
    // Warm-up probe is best effort.
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
    const resp = await page.request.post(`${BASE_URL}/api/e2e/auth`, {
      data: { email, password },
      timeout: 90_000,
    })

    if (!resp.ok()) {
      const body = await resp.text()
      throw new Error(`E2E auth endpoint returned ${resp.status()}: ${body}`)
    }

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
    console.log(`[globalSetup] ${label} auth state saved -> ${outputPath}`)
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
  const requiredAuthStates = getRequiredAuthStates(config)

  writeFileSync('.auth/seed-ids.json', JSON.stringify(seedResult, null, 2), 'utf-8')
  console.log('[globalSetup] Seed IDs written to .auth/seed-ids.json')

  await warmE2EAuthEndpoint()

  const browser = await chromium.launch()

  if (requiredAuthStates.chef) {
    await loginAndSaveState(
      browser,
      seedResult.chefEmail,
      seedResult.chefPassword,
      /\/dashboard/,
      '.auth/chef.json',
      'Chef'
    )
  }

  if (
    requiredAuthStates.client ||
    requiredAuthStates.chefB ||
    requiredAuthStates.staff ||
    requiredAuthStates.partner ||
    requiredAuthStates.admin
  ) {
    await sleep(2_000)
  }

  if (requiredAuthStates.client) {
    await loginAndSaveState(
      browser,
      seedResult.clientEmail,
      seedResult.clientPassword,
      /\/my-events/,
      '.auth/client.json',
      'Client'
    )
  }

  if (requiredAuthStates.chefB) {
    await loginAndSaveState(
      browser,
      seedResult.chefBEmail,
      seedResult.chefBPassword,
      /\/dashboard/,
      '.auth/chef-b.json',
      'Chef B'
    )
  }

  if (requiredAuthStates.staff) {
    await loginAndSaveState(
      browser,
      seedResult.staffEmail,
      seedResult.staffPassword,
      /\/staff-dashboard/,
      '.auth/staff.json',
      'Staff'
    )
  }

  if (requiredAuthStates.partner) {
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
  }

  const adminEmail = process.env.ADMIN_E2E_EMAIL
  const adminPassword = process.env.ADMIN_E2E_PASSWORD
  if (requiredAuthStates.admin && adminEmail && adminPassword) {
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
  } else if (requiredAuthStates.admin) {
    console.log(
      '[globalSetup] ADMIN_E2E_EMAIL/ADMIN_E2E_PASSWORD not set - skipping admin auth state. Admin coverage tests will be skipped.'
    )
    writeFileSync('.auth/admin.json', JSON.stringify({ cookies: [], origins: [] }), 'utf-8')
  }

  await browser.close()
  console.log('[globalSetup] Complete. Ready to run tests.\n')
}
