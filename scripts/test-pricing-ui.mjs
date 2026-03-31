#!/usr/bin/env node

/**
 * Quick Playwright test: verify pricing data renders in the UI.
 * Tests the critical pricing surfaces after pipeline fix.
 */

import { chromium } from 'playwright'

const BASE = 'http://localhost:3100'
const CREDS = { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' }

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  const page = await context.newPage()

  // Sign in via e2e auth endpoint using page.evaluate (gets cookies set in browser context)
  console.log('Signing in...')
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  const authOk = await page.evaluate(async (creds) => {
    const res = await fetch('/api/e2e/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    })
    return res.ok
  }, CREDS)
  if (!authOk) {
    console.error('Auth failed')
    await browser.close()
    process.exit(1)
  }
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  console.log('Signed in, on dashboard')

  const results = []

  async function testRoute(name, url, checks) {
    console.log(`\nTesting: ${name} (${url})`)
    try {
      const res = await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      const status = res?.status() ?? 0

      if (status === 404 || status >= 500) {
        results.push({ name, url, status: 'FAIL', reason: `HTTP ${status}` })
        return
      }

      await page.waitForTimeout(2000) // Let client hydrate

      const checkResults = []
      for (const [label, check] of Object.entries(checks)) {
        try {
          const passed = await check(page)
          checkResults.push({ label, passed })
          console.log(`  ${passed ? 'PASS' : 'FAIL'}: ${label}`)
        } catch (err) {
          checkResults.push({ label, passed: false })
          console.log(`  FAIL: ${label} (${err.message.substring(0, 60)})`)
        }
      }

      const allPassed = checkResults.every(c => c.passed)
      await page.screenshot({ path: `screenshots/pricing-${name.replace(/[^a-z0-9]/gi, '-')}.png`, fullPage: false })
      results.push({ name, url, status: allPassed ? 'PASS' : 'PARTIAL', checks: checkResults })
    } catch (err) {
      results.push({ name, url, status: 'FAIL', reason: err.message.substring(0, 80) })
      console.log(`  ERROR: ${err.message.substring(0, 80)}`)
    }
  }

  // Ensure screenshots dir
  const { mkdirSync } = await import('fs')
  mkdirSync('screenshots', { recursive: true })

  // ── Test 1: Ingredient Library ──────────────────────────────────────
  await testRoute('ingredient-library', '/culinary/ingredients', {
    'Page loads': async (p) => {
      const heading = await p.textContent('body')
      return heading.includes('Ingredient') || heading.includes('ingredient')
    },
    'Shows price data': async (p) => {
      const body = await p.textContent('body')
      return body.includes('$') || body.includes('price') || body.includes('Price')
    },
    'Has ingredient rows': async (p) => {
      // Look for known ingredients
      const body = await p.textContent('body')
      return body.includes('Chicken') || body.includes('Salmon') || body.includes('Butter')
    },
  })

  // ── Test 2: Food Catalog (Chef) ─────────────────────────────────────
  await testRoute('food-catalog', '/culinary/price-catalog', {
    'Page loads': async (p) => {
      const body = await p.textContent('body')
      return body.includes('Catalog') || body.includes('catalog') || body.includes('Food')
    },
    'Shows products or search': async (p) => {
      const body = await p.textContent('body')
      return body.includes('search') || body.includes('Search') || body.includes('product') || body.includes('ingredient')
    },
  })

  // ── Test 3: Recipe Costing ──────────────────────────────────────────
  await testRoute('recipe-costing', '/culinary/costing/recipe', {
    'Page loads': async (p) => {
      const body = await p.textContent('body')
      return body.includes('Cost') || body.includes('cost') || body.includes('Recipe')
    },
  })

  // ── Test 4: On Sale This Week ───────────────────────────────────────
  await testRoute('sales', '/culinary/costing/sales', {
    'Page loads': async (p) => {
      const body = await p.textContent('body')
      return body.includes('Sale') || body.includes('sale') || body.includes('deal') || body.includes('Deal')
    },
  })

  // ── Test 5: Price Comparison ────────────────────────────────────────
  await testRoute('price-comparison', '/vendors/price-comparison', {
    'Page loads': async (p) => {
      const body = await p.textContent('body')
      return body.includes('Price') || body.includes('price') || body.includes('Compare') || body.includes('Vendor')
    },
  })

  // ── Test 6: Recipes page (shows ingredient costs) ──────────────────
  await testRoute('recipes', '/recipes', {
    'Page loads': async (p) => {
      const body = await p.textContent('body')
      return body.includes('Recipe') || body.includes('recipe')
    },
  })

  // ── Summary ─────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60))
  console.log('PRICING UI TEST RESULTS')
  console.log('='.repeat(60))
  for (const r of results) {
    console.log(`  ${r.status.padEnd(7)} ${r.name} ${r.url}`)
    if (r.reason) console.log(`         ${r.reason}`)
  }

  const passed = results.filter(r => r.status === 'PASS').length
  const partial = results.filter(r => r.status === 'PARTIAL').length
  const failed = results.filter(r => r.status === 'FAIL').length
  console.log(`\nTotal: ${passed} pass, ${partial} partial, ${failed} fail`)

  await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
