/**
 * Demo Walkthrough Script - captures screenshots of every major ChefFlow page
 * Usage: node scripts/demo-walkthrough.mjs
 */
import { chromium } from 'playwright'
import { readFileSync, mkdirSync } from 'fs'
import path from 'path'

const BASE_URL = 'http://localhost:3100'
const SCREENSHOT_DIR = path.resolve('docs/demo-screenshots')
mkdirSync(SCREENSHOT_DIR, { recursive: true })

const agent = JSON.parse(readFileSync('.auth/agent.json', 'utf8'))

let step = 0
async function snap(page, name, desc) {
  step++
  const f = `${String(step).padStart(2, '0')}-${name}.png`
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, f), fullPage: false })
  console.log(`  [${step}] ${f} - ${desc}`)
}

async function run() {
  const browser = await chromium.launch({ headless: true })

  // Public pages (no auth)
  const pubCtx = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  pubCtx.setDefaultTimeout(180000)
  pubCtx.setDefaultNavigationTimeout(180000)
  const pubPage = await pubCtx.newPage()

  // Auth pages
  const authCtx = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    storageState: '.auth/demo.json',
  })
  authCtx.setDefaultTimeout(180000)
  authCtx.setDefaultNavigationTimeout(180000)
  const authPage = await authCtx.newPage()

  try {
    // ── Public pages ────────────────────────────────
    console.log('\n  PUBLIC PAGES')
    for (const [url, name, desc] of [
      ['/', 'landing-page', 'ChefFlow landing page'],
      ['/sign-in', 'sign-in', 'Chef sign-in page'],
      ['/pricing', 'pricing', 'Pricing page - Free and Pro tiers'],
      [`/embed/inquiry/${agent.chefId}`, 'embed-widget', 'Embeddable inquiry form for chef websites'],
    ]) {
      await pubPage.goto(`${BASE_URL}${url}`, { waitUntil: 'domcontentloaded' })
      await pubPage.waitForTimeout(3000)
      await snap(pubPage, name, desc)
    }

    // ── Authenticated routes (one at a time, generous waits) ────────────
    console.log('\n  CHEF PORTAL')
    const routes = [
      ['dashboard', 'dashboard', 'Chef dashboard - the command center'],
      ['inquiries', 'inquiries', 'Inquiry pipeline with GOLDMINE lead scores'],
      ['events', 'events', 'Events list - 8-state lifecycle tracking'],
      ['clients', 'clients', 'Client database with loyalty tiers'],
      ['calendar', 'calendar', 'Calendar - visual event scheduling'],
      ['finance', 'finance', 'Financial dashboard - ledger-based P&L'],
      ['recipes', 'recipes', 'Recipe book - chef-owned intellectual property'],
      ['menus', 'menus', 'Menu builder - compose from recipes'],
      ['analytics', 'analytics', 'Business analytics and insights'],
      ['documents', 'documents', 'Document management'],
      ['settings', 'settings', 'Settings - profile and integrations'],
      ['settings/modules', 'settings-modules', 'Module toggles - freemium tier system'],
      ['settings/embed', 'settings-embed', 'Embeddable widget configuration'],
    ]

    for (const [route, name, desc] of routes) {
      console.log(`    Loading /${route}...`)
      await authPage.goto(`${BASE_URL}/${route}`, { waitUntil: 'domcontentloaded' })
      await authPage.waitForTimeout(4000)
      // Check if we got redirected to sign-in
      if (authPage.url().includes('/sign-in') || authPage.url().includes('/auth/')) {
        console.log(`    WARN: Redirected to ${authPage.url()} - auth may be stale`)
      }
      await snap(authPage, name, desc)
    }

    // ── Deep dives ────────────────────────────────
    console.log('\n  DEEP DIVES')
    await authPage.goto(`${BASE_URL}/inquiries`, { waitUntil: 'domcontentloaded' })
    await authPage.waitForTimeout(3000)
    const inqRow = authPage.locator('table tbody tr').first()
    if (await inqRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await inqRow.click()
      await authPage.waitForTimeout(4000)
      await snap(authPage, 'inquiry-detail', 'Inquiry detail - lead score, timeline, conversion')
    } else {
      console.log('  (no inquiries to drill into)')
    }

    await authPage.goto(`${BASE_URL}/events`, { waitUntil: 'domcontentloaded' })
    await authPage.waitForTimeout(3000)
    const evtLink = authPage.locator('a[href*="/events/"]').first()
    if (await evtLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await evtLink.click()
      await authPage.waitForTimeout(4000)
      await snap(authPage, 'event-detail', 'Event detail - FSM state, timeline, actions')
    } else {
      console.log('  (no events to drill into)')
    }

    await authPage.goto(`${BASE_URL}/clients`, { waitUntil: 'domcontentloaded' })
    await authPage.waitForTimeout(3000)
    const clientLink = authPage.locator('a[href*="/clients/"]').first()
    if (await clientLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await clientLink.click()
      await authPage.waitForTimeout(4000)
      await snap(authPage, 'client-detail', 'Client profile - history, dietary needs, loyalty')
    } else {
      console.log('  (no clients to drill into)')
    }

    // ── Mobile ────────────────────────────────
    console.log('\n  MOBILE VIEWS')
    await authPage.setViewportSize({ width: 390, height: 844 })
    for (const r of ['dashboard', 'events', 'inquiries', 'clients']) {
      await authPage.goto(`${BASE_URL}/${r}`, { waitUntil: 'domcontentloaded' })
      await authPage.waitForTimeout(3000)
      await snap(authPage, `mobile-${r}`, `Mobile ${r}`)
    }

    console.log(`\n  DONE: ${step} screenshots in docs/demo-screenshots/\n`)

  } catch (err) {
    console.error('  ERROR:', err.message)
    await snap(authPage, 'error', `Error: ${err.message}`).catch(() => {})
  } finally {
    await browser.close()
  }
}

run().catch(console.error)
