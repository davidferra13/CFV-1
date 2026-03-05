#!/usr/bin/env node
// Open Login - launches an incognito browser, attempts sign-in, and leaves it open.

import { chromium } from 'playwright'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..', '..')
const BASE_URL = 'http://localhost:3100'

function attachExitOnBrowserClose(browser) {
  browser.on('disconnected', () => {
    console.log('[open-login] Browser closed. Exiting.')
    process.exit(0)
  })
}

async function launchIncognitoBrowser() {
  try {
    return await chromium.launch({
      headless: false,
      channel: 'chrome',
      args: ['--incognito'],
    })
  } catch (err) {
    console.warn(`[open-login] Chrome launch failed, falling back to Chromium: ${err.message}`)
    return chromium.launch({
      headless: false,
      args: ['--incognito'],
    })
  }
}

async function keepBrowserOpenForManualRecovery(page, browser, reason) {
  console.error(`[open-login] ${reason}`)
  try {
    await page.goto(`${BASE_URL}/auth/signin`, { timeout: 15_000, waitUntil: 'domcontentloaded' })
    console.log('[open-login] Opened sign-in page for manual login. Browser will stay open.')
  } catch (err) {
    console.error(`[open-login] Could not open sign-in page: ${err.message}`)
    try {
      await page.goto(BASE_URL, { timeout: 10_000, waitUntil: 'domcontentloaded' })
      console.log('[open-login] Opened app root for manual recovery. Browser will stay open.')
    } catch (fallbackErr) {
      console.error(`[open-login] Could not open app root: ${fallbackErr.message}`)
    }
  }
  attachExitOnBrowserClose(browser)
}

function loadSeedIds() {
  try {
    return JSON.parse(readFileSync(join(PROJECT_ROOT, '.auth', 'seed-ids.json'), 'utf-8'))
  } catch {
    return null
  }
}

function loadDeveloperCreds() {
  try {
    return JSON.parse(readFileSync(join(PROJECT_ROOT, '.auth', 'developer.json'), 'utf-8'))
  } catch {
    return null
  }
}

function getAccount(role) {
  const seed = loadSeedIds()

  if (role === 'developer') {
    const dev = loadDeveloperCreds()
    if (!dev || !dev.email || !dev.password || dev.password === 'FILL_IN_YOUR_PASSWORD_HERE') {
      console.error('[open-login] Developer credentials not configured.')
      console.error('[open-login] Edit .auth/developer.json and fill in your password.')
      process.exit(1)
    }
    return {
      email: dev.email,
      password: dev.password,
      portal: '/dashboard',
      label: 'Developer',
    }
  }

  const accounts = {
    chef: {
      email: seed?.chefEmail || 'e2e.chef.20260227@chefflow.test',
      password: seed?.chefPassword || 'E2eChefTest!2026',
      portal: '/dashboard',
      label: 'Chef',
    },
    client: {
      email: seed?.clientEmail || 'e2e.client.20260227@chefflow.test',
      password: seed?.clientPassword || 'E2eClientTest!2026',
      portal: '/my-events',
      label: 'Client',
    },
    staff: {
      email: seed?.staffEmail || 'e2e.staff.20260227@chefflow.test',
      password: seed?.staffPassword || 'E2eStaffTest!2026',
      portal: '/staff-dashboard',
      label: 'Staff',
    },
    partner: {
      email: seed?.partnerEmail || 'e2e.partner.20260227@chefflow.test',
      password: seed?.partnerPassword || 'E2ePartnerTest!2026',
      portal: '/partner/dashboard',
      label: 'Partner',
    },
    admin: {
      email: 'agent@chefflow.test',
      password: 'AgentChefFlow!2026',
      portal: '/admin',
      label: 'Admin',
    },
    'chef-b': {
      email: seed?.chefBEmail || 'e2e.chef-b.20260227@chefflow.test',
      password: seed?.chefBPassword || 'E2eChefTest!2026',
      portal: '/dashboard',
      label: 'Chef B',
    },
  }

  return accounts[role]
}

async function main() {
  const role = process.argv[2]
  if (!role) {
    console.error('Usage: node open-login.mjs <role>')
    console.error('Roles: chef, client, staff, partner, admin, chef-b, developer, guest')
    process.exit(1)
  }

  if (role === 'guest') {
    console.log('[open-login] Launching incognito as Guest (no login)...')
    const browser = await launchIncognitoBrowser()
    const context = browser.contexts()[0] || (await browser.newContext())
    const page = await context.newPage()
    await page.goto(BASE_URL, { timeout: 60_000 })
    console.log('[open-login] Guest view open. Browser will stay open.')
    attachExitOnBrowserClose(browser)
    return
  }

  const account = getAccount(role)
  if (!account) {
    console.error(`Unknown role: ${role}`)
    process.exit(1)
  }

  console.log(`[open-login] Launching incognito as ${account.label} (${account.email})...`)

  let browser = null
  let page = null

  try {
    browser = await launchIncognitoBrowser()
    const context = browser.contexts()[0] || (await browser.newContext())
    page = await context.newPage()

    console.log('[open-login] Signing in...')
    const resp = await page.request.post(`${BASE_URL}/api/e2e/auth`, {
      data: { email: account.email, password: account.password },
      timeout: 20_000,
    })

    if (!resp.ok()) {
      const body = await resp.text()
      await keepBrowserOpenForManualRecovery(page, browser, `Auth failed (${resp.status()}): ${body}`)
      return
    }

    console.log(`[open-login] Navigating to ${account.portal}...`)
    await page.goto(`${BASE_URL}${account.portal}`, { timeout: 60_000 })
    console.log(`[open-login] ${account.label} portal open. Browser will stay open.`)
    attachExitOnBrowserClose(browser)
  } catch (err) {
    if (browser && page) {
      await keepBrowserOpenForManualRecovery(page, browser, `Automatic sign-in failed: ${err.message}`)
      return
    }
    console.error(`[open-login] Failed before browser session was ready: ${err.message}`)
    process.exit(1)
  }
}

main()
