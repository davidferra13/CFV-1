#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
// Open Login — launches Chrome incognito, signs in, leaves it open
// ═══════════════════════════════════════════════════════════════════
// Usage: node scripts/launcher/open-login.mjs <role>
//   Roles: chef, client, staff, partner, admin, chef-b, developer
//
// Requires: Playwright installed (npx playwright install chromium)
// The dev server must be running on port 3100.

import { chromium } from 'playwright'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..', '..')
const BASE_URL = 'http://localhost:3100'

// ── Account Definitions ─────────────────────────────────────────

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

  // Developer account — reads from .auth/developer.json
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

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  const role = process.argv[2]
  if (!role) {
    console.error('Usage: node open-login.mjs <role>')
    console.error('Roles: chef, client, staff, partner, admin, chef-b')
    process.exit(1)
  }

  // Guest mode — no login, just open the site
  if (role === 'guest') {
    console.log(`[open-login] Launching Chrome incognito as Guest (no login)...`)
    const browser = await chromium.launch({
      headless: false,
      channel: 'chrome',
      args: ['--incognito'],
    })
    const context = browser.contexts()[0] || await browser.newContext()
    const page = await context.newPage()
    await page.goto(BASE_URL, { timeout: 60_000 })
    console.log(`[open-login] ✓ Guest view open. Browser will stay open.`)
    browser.on('disconnected', () => {
      console.log(`[open-login] Browser closed. Exiting.`)
      process.exit(0)
    })
    return
  }

  const account = getAccount(role)
  if (!account) {
    console.error(`Unknown role: ${role}`)
    process.exit(1)
  }

  console.log(`[open-login] Launching Chrome incognito as ${account.label} (${account.email})...`)

  // Launch real Chrome in incognito. Playwright's channel:'chrome' uses the
  // system-installed Chrome. The `--incognito` arg opens in private browsing
  // so multiple roles can be open simultaneously without cookie conflicts.
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: ['--incognito'],
  })

  // In incognito, we need to use the first context Playwright creates
  const context = browser.contexts()[0] || await browser.newContext()

  const page = await context.newPage()

  try {
    // Sign in via the E2E auth endpoint (sets SSR cookies, bypasses rate limiter)
    console.log(`[open-login] Signing in...`)
    const resp = await page.request.post(`${BASE_URL}/api/e2e/auth`, {
      data: { email: account.email, password: account.password },
    })

    if (!resp.ok()) {
      const body = await resp.text()
      console.error(`[open-login] Auth failed (${resp.status()}): ${body}`)
      await browser.close()
      process.exit(1)
    }

    // Navigate to the portal
    console.log(`[open-login] Navigating to ${account.portal}...`)
    await page.goto(`${BASE_URL}${account.portal}`, { timeout: 60_000 })
    console.log(`[open-login] ✓ ${account.label} portal open. Browser will stay open.`)

    // Keep the process alive so the browser stays open.
    // When the user closes the browser window, the process exits.
    browser.on('disconnected', () => {
      console.log(`[open-login] Browser closed. Exiting.`)
      process.exit(0)
    })
  } catch (err) {
    console.error(`[open-login] Failed: ${err.message}`)
    await browser.close()
    process.exit(1)
  }
}

main()
