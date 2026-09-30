#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'reports/competitive-registry')
const audit = JSON.parse(readFileSync(resolve(out, 'competitive-registry.json'), 'utf8'))
let browser
let browserName = 'Chromium headless'
try {
  browser = await chromium.launch({ headless: true })
} catch (error) {
  if (process.platform !== 'win32' || !String(error).includes("Executable doesn't exist"))
    throw error
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  browserName = 'Microsoft Edge headless, isolated temporary profile'
}
const errors = []
let checks = 0
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(pathToFileURL(resolve(out, 'competitive-registry.html')).href)
  assert.equal(
    await page.locator('#benchmarks .searchable:visible').count(),
    audit.benchmarks.length
  )
  checks++
  await page.locator('#search').fill('Paprika')
  const expected = audit.benchmarks.filter((row) =>
    row.competitorClaims.some((claim) => claim.productName.includes('Paprika'))
  ).length
  assert.equal(await page.locator('#benchmarks .searchable:visible').count(), expected)
  checks++
  await page.locator('#benchmarks .searchable:visible summary').first().click()
  assert.equal(await page.locator('#benchmarks details[open]:visible').count(), 1)
  checks++
  await page.locator('#search').fill('no-results-zzzz')
  assert.equal(await page.locator('#empty').isVisible(), true)
  checks++
  await page.locator('#search').fill('')
  await page.locator('#category').selectOption('chef-marketplaces')
  assert.equal(
    await page.locator('#benchmarks .searchable:visible').count(),
    audit.benchmarks.filter((row) => row.categoryId === 'chef-marketplaces').length
  )
  checks++
  await page.locator('#category').selectOption('')
  await page.locator('[data-view="products"]').click()
  assert.equal(await page.locator('#products .searchable:visible').count(), audit.products.length)
  checks++
  await page.locator('#search').fill('Mealime')
  assert.equal(await page.locator('#products .searchable:visible').count(), 1)
  checks++
  assert.match(await page.locator('#products .searchable:visible').innerText(), /2026-10-21/)
  checks++
  await page.locator('#search').fill('')
  await page.locator('[data-view="queue"]').click()
  assert.equal(await page.locator('#filters').isVisible(), false)
  checks++
  assert.equal(await page.locator('#queue li').count(), audit.proposedWorkQueue.length)
  checks++
  await page.locator('[data-view="benchmarks"]').click()
  await page
    .locator('#benchmarks details[open]')
    .evaluateAll((items) => items.forEach((item) => (item.open = false)))
  await page.screenshot({ path: resolve(out, 'desktop.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true
  )
  checks++
  await page.screenshot({ path: resolve(out, 'phone.png') })
  await page.locator('#benchmarks summary').first().click()
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true
  )
  checks++
  assert.deepEqual(errors, [])
  checks++
  const receipt = {
    status: 'PASS',
    checks,
    browser: browserName,
    viewports: ['1440x1000', '390x844'],
    pageErrors: errors,
    caveat: 'Validates the static registry report, not competitor or ChefFlow booking workflows.',
  }
  writeFileSync(resolve(out, 'report-smoke.json'), JSON.stringify(receipt, null, 2) + '\n')
  console.log(JSON.stringify(receipt, null, 2))
} finally {
  await browser.close()
}
