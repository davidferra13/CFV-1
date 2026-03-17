#!/usr/bin/env node
// Performance audit against beta environment (localhost:3200)
// Measures DOMContentLoaded (user-visible) vs NetworkIdle (full load)

import { chromium } from 'playwright'

const BASE = 'http://localhost:3200'

async function main() {
  console.log('=== ChefFlow Beta Performance Audit ===')
  console.log(`Target: ${BASE}`)
  console.log(`Time:   ${new Date().toISOString()}\n`)

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  // 1. Public pages
  console.log('--- Public Pages ---')
  console.log('Page'.padEnd(22) + '| TTFB     | NetworkIdle | DOM    | Heap')
  console.log('-'.repeat(75))

  const publicPaths = ['/', '/auth/signin', '/pricing', '/blog']
  for (const path of publicPaths) {
    const start = Date.now()
    const response = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    const ttfb = Date.now() - start

    const idleStart = Date.now()
    await page.waitForLoadState('networkidle').catch(() => {})
    const networkIdle = ttfb + (Date.now() - idleStart)

    const client = await page.context().newCDPSession(page)
    await client.send('Performance.enable')
    const metrics = await client.send('Performance.getMetrics')
    const jsHeap = metrics.metrics.find((m) => m.name === 'JSHeapUsedSize')
    const domNodes = metrics.metrics.find((m) => m.name === 'Nodes')

    console.log(
      `${path.padEnd(22)}| ${(ttfb + 'ms').padEnd(9)}| ${(networkIdle + 'ms').padEnd(12)}| ${String(domNodes?.value || 0).padEnd(7)}| ${Math.round((jsHeap?.value || 0) / 1024 / 1024)}MB`
    )
  }

  // 2. Sign in
  console.log('\n--- Signing in ---')
  await page.goto(`${BASE}/auth/signin`, { waitUntil: 'domcontentloaded' })
  const emailInput = page.locator('input[type="email"]').first()
  if ((await emailInput.count()) > 0) {
    await emailInput.fill('agent@chefflow.test')
    await page.locator('input[type="password"]').first().fill('AgentChefFlow!2026')
    await page.locator('button[type="submit"]').first().click()
    try {
      await page.waitForURL((url) => {
        return url.pathname !== '/auth/signin'
      }, { timeout: 15000 })
      console.log(`OK - redirected to ${new URL(page.url()).pathname}`)
    } catch {
      console.log(`Sign-in may have failed. URL: ${page.url()}`)
    }
  }

  // 3. Authenticated pages
  console.log('\n--- Authenticated Pages ---')
  console.log('Page'.padEnd(22) + '| TTFB     | NetworkIdle | DOM    | Heap')
  console.log('-'.repeat(75))

  const authPaths = ['/dashboard', '/clients', '/events', '/inquiries', '/calendar', '/quotes', '/settings', '/marketplace']
  const results = []

  for (const path of authPaths) {
    const start = Date.now()
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    const ttfb = Date.now() - start

    const idleStart = Date.now()
    await page.waitForLoadState('networkidle').catch(() => {})
    const networkIdle = ttfb + (Date.now() - idleStart)

    const client = await page.context().newCDPSession(page)
    await client.send('Performance.enable')
    const metrics = await client.send('Performance.getMetrics')
    const jsHeap = metrics.metrics.find((m) => m.name === 'JSHeapUsedSize')
    const domNodes = metrics.metrics.find((m) => m.name === 'Nodes')
    const heap = Math.round((jsHeap?.value || 0) / 1024 / 1024)
    const nodes = domNodes?.value || 0

    const finalUrl = new URL(page.url())
    const redirected = finalUrl.pathname !== path ? ` [-> ${finalUrl.pathname}]` : ''

    console.log(
      `${path.padEnd(22)}| ${(ttfb + 'ms').padEnd(9)}| ${(networkIdle + 'ms').padEnd(12)}| ${String(nodes).padEnd(7)}| ${heap}MB${redirected}`
    )

    results.push({ path, ttfb, networkIdle, nodes, heap })
  }

  // Summary
  console.log('\n--- Performance Summary ---')
  const TTFB_THRESHOLD = 2000
  const IDLE_THRESHOLD = 5000

  const slowTTFB = results.filter((r) => r.ttfb > TTFB_THRESHOLD)
  const slowIdle = results.filter((r) => r.networkIdle > IDLE_THRESHOLD)

  if (slowTTFB.length === 0) {
    console.log(`All pages render within ${TTFB_THRESHOLD}ms TTFB threshold.`)
  } else {
    console.log(`SLOW TTFB (>${TTFB_THRESHOLD}ms, blocks user interaction):`)
    slowTTFB.forEach((r) => console.log(`  ${r.path}: ${r.ttfb}ms`))
  }

  if (slowIdle.length > 0) {
    console.log(`\nSLOW FULL LOAD (>${IDLE_THRESHOLD}ms, background data still loading):`)
    slowIdle.forEach((r) => console.log(`  ${r.path}: ${r.networkIdle}ms (TTFB: ${r.ttfb}ms)`))
  }

  await browser.close()
}

main().catch(console.error)
