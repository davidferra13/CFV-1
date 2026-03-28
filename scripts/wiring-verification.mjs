#!/usr/bin/env node
// Wiring Verification Script - Workstream 5
// Signs in with agent account and tests every Tier 1 page loads correctly.
// Reports PASS/FAIL for each route.

import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:3100'
const CREDS = JSON.parse(fs.readFileSync('.auth/agent.json', 'utf8'))

const TIER1_ROUTES = [
  { name: 'Dashboard', path: '/dashboard', expect: 'dashboard' },
  { name: 'Inbox', path: '/inbox', expect: 'inbox' },
  { name: 'Events', path: '/events', expect: 'event' },
  { name: 'Clients', path: '/clients', expect: 'client' },
  { name: 'Calendar', path: '/calendar', expect: 'calendar' },
  { name: 'Menus', path: '/menus', expect: 'menu' },
  { name: 'Recipes', path: '/recipes', expect: 'recipe' },
  { name: 'Inquiries', path: '/inquiries', expect: 'inquir' },
  { name: 'Quotes', path: '/quotes', expect: 'quote' },
]

const TIER2_ROUTES = [
  { name: 'Costing', path: '/culinary/costing', expect: 'cost' },
  { name: 'Invoices', path: '/finance/invoices', expect: 'invoice' },
  { name: 'Expenses', path: '/finance/expenses', expect: 'expense' },
  { name: 'Finance Hub', path: '/finance', expect: 'financ' },
  { name: 'Plate Costs', path: '/finance/plate-costs', expect: 'plate' },
]

const TIER3_ROUTES = [
  { name: 'Prep Workspace', path: '/culinary/prep', expect: 'prep' },
  { name: 'Documents', path: '/documents', expect: 'document' },
  { name: 'Staff', path: '/staff', expect: 'staff' },
  { name: 'Daily Ops', path: '/daily', expect: 'daily' },
]

const TIER4_ROUTES = [
  { name: 'Marketing Hub', path: '/marketing', expect: 'market' },
  { name: 'Analytics', path: '/analytics', expect: 'analytic' },
  { name: 'Reviews', path: '/reviews', expect: 'review' },
]

const TIER5_ROUTES = [
  { name: 'Profile Settings', path: '/settings/my-profile', expect: 'profile' },
  { name: 'Integrations', path: '/settings/integrations', expect: 'integrat' },
  { name: 'Billing', path: '/settings/billing', expect: 'support' },
  { name: 'Modules', path: '/settings/modules', expect: 'module' },
]

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()

  // Sign in
  console.log('Signing in...')
  const authResp = await page.request.post(`${BASE}/api/e2e/auth`, {
    data: { email: CREDS.email, password: CREDS.password },
    timeout: 60000,
  })
  if (!authResp.ok()) {
    console.error('Auth failed:', authResp.status(), await authResp.text())
    await browser.close()
    process.exit(1)
  }
  console.log('Signed in.\n')

  const allRoutes = [
    { tier: 'Tier 1 (Daily Driver)', routes: TIER1_ROUTES },
    { tier: 'Tier 2 (Financial)', routes: TIER2_ROUTES },
    { tier: 'Tier 3 (Operational)', routes: TIER3_ROUTES },
    { tier: 'Tier 4 (Growth)', routes: TIER4_ROUTES },
    { tier: 'Tier 5 (Settings)', routes: TIER5_ROUTES },
  ]

  const results = []

  for (const { tier, routes } of allRoutes) {
    console.log(`=== ${tier} ===`)
    for (const route of routes) {
      // Fresh page per route to avoid cascading timeouts from SSE/long-poll
      const freshPage = await context.newPage()
      const result = await testRoute(freshPage, route)
      await freshPage.close()
      results.push({ tier, ...result })
      const icon = result.status === 'PASS' ? '  PASS' : result.status === 'PARTIAL' ? '  PARTIAL' : '  FAIL'
      console.log(`${icon}  ${route.name} (${route.path})${result.note ? ' - ' + result.note : ''}`)
      // Brief cooldown so the dev server doesn't choke
      await new Promise(r => setTimeout(r, 2000))
    }
    console.log()
  }

  await browser.close()

  // Summary
  const passed = results.filter(r => r.status === 'PASS').length
  const partial = results.filter(r => r.status === 'PARTIAL').length
  const failed = results.filter(r => r.status === 'FAIL').length
  console.log(`\nSummary: ${passed} PASS, ${partial} PARTIAL, ${failed} FAIL out of ${results.length} routes`)

  // Write report
  writeReport(results, { passed, partial, failed, total: results.length })
}

async function testRoute(page, route) {
  const result = { name: route.name, path: route.path, status: 'FAIL', note: '' }

  try {
    // Fire-and-forget navigation. SSE connections prevent domcontentloaded/load from
    // ever resolving in this codebase, so we navigate without awaiting, then manually
    // poll for content to appear.
    page.goto(`${BASE}${route.path}`).catch(() => {})

    // Poll for meaningful content (every 500ms, max 12s)
    let bodyText = ''
    for (let i = 0; i < 24; i++) {
      await page.waitForTimeout(500)
      try {
        bodyText = await page.evaluate(() => document.body?.innerText?.trim() || '')
        if (bodyText.length > 20) break
      } catch {
        // page not ready yet
      }
    }

    const url = page.url()

    // Check for redirects to auth (not authenticated)
    if (url.includes('/auth/') || url.includes('/sign-in') || url.includes('/login')) {
      result.note = 'Redirected to auth (session issue)'
      return result
    }

    // Check for blank page
    if (bodyText.length < 10) {
      result.note = 'Blank/near-empty page'
      return result
    }

    // Check for error states
    const lowerText = bodyText.toLowerCase()
    if (
      lowerText.includes('application error') ||
      lowerText.includes('server error') ||
      lowerText.includes('unhandled runtime error') ||
      lowerText.includes('500 internal') ||
      lowerText.includes('404 not found')
    ) {
      result.note = 'Error displayed on page'
      return result
    }

    // Check page has meaningful content related to the feature
    if (lowerText.includes(route.expect)) {
      result.status = 'PASS'
    } else {
      const hasUI = await page.evaluate(() => {
        return document.querySelectorAll('button, table, form, [role="grid"], [role="tablist"]').length > 0
      })
      if (hasUI) {
        result.status = 'PASS'
        result.note = 'UI elements present (keyword not found in text)'
      } else {
        result.status = 'PARTIAL'
        result.note = 'Page loaded but feature content unclear'
      }
    }
  } catch (err) {
    result.note = err.message?.substring(0, 100) || 'Unknown error'
  }

  return result
}

function writeReport(results, summary) {
  const lines = [
    '# Wiring Verification Report',
    '',
    `**Date:** ${new Date().toISOString().split('T')[0]}`,
    `**Tested by:** Agent account (agent@local.chefflow)`,
    `**Summary:** ${summary.passed} PASS, ${summary.partial} PARTIAL, ${summary.failed} FAIL out of ${summary.total} routes`,
    '',
    '---',
    '',
  ]

  let currentTier = ''
  for (const r of results) {
    if (r.tier !== currentTier) {
      currentTier = r.tier
      lines.push(`## ${currentTier}`)
      lines.push('')
      lines.push('| Feature | Route | Status | Notes |')
      lines.push('| --- | --- | --- | --- |')
    }
    const icon = r.status === 'PASS' ? 'PASS' : r.status === 'PARTIAL' ? 'PARTIAL' : 'FAIL'
    lines.push(`| ${r.name} | \`${r.path}\` | ${icon} | ${r.note || '-'} |`)
  }

  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## Action Items')
  lines.push('')

  const failures = results.filter(r => r.status !== 'PASS')
  if (failures.length === 0) {
    lines.push('All routes passed. No action items.')
  } else {
    for (const f of failures) {
      lines.push(`- **${f.name}** (\`${f.path}\`): ${f.status} - ${f.note}`)
    }
  }

  fs.writeFileSync('docs/wiring-verification-report.md', lines.join('\n') + '\n')
  console.log('\nReport written to docs/wiring-verification-report.md')
}

run().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
