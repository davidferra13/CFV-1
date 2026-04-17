/**
 * Lifecycle Walkthrough - EXECUTE against production
 * Sign in, recon every surface, create a full dinner lifecycle.
 */
import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:3000'
const SHOTS = 'screenshots/lifecycle-walkthrough'
const CREDS = JSON.parse(fs.readFileSync('.auth/agent.json', 'utf-8'))

let page, context, browser
let shotIndex = 0
const findings = []

function finding(type, area, detail) {
  findings.push({ type, area, detail })
  const icon = type === 'PASS' ? '✅' : type === 'FAIL' ? '❌' : type === 'GAP' ? '🔧' : '⚠️'
  console.log(`  ${icon} [${type}] ${area}: ${detail}`)
}

async function shot(name) {
  shotIndex++
  const path = `${SHOTS}/${String(shotIndex).padStart(2, '0')}-${name}.png`
  await page.screenshot({ path, fullPage: true })
  console.log(`  📸 ${path}`)
  return path
}

async function nav(label, path) {
  console.log(`\n── ${label} ──`)
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForTimeout(2000)
}

async function run() {
  browser = await chromium.launch({ headless: true })
  context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  page = await context.newPage()

  // ═══════════════════════════════════════════════════════
  // PHASE 1: SIGN IN
  // ═══════════════════════════════════════════════════════
  console.log('\n═══ PHASE 1: SIGN IN ═══')
  await page.goto(`${BASE}/auth/signin`, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForSelector('input[type="email"]', { timeout: 15000 })
  await page.fill('input[type="email"]', CREDS.email)
  await page.fill('input[type="password"]', CREDS.password)
  await page.click('button[type="submit"]')
  // Wait for navigation away from signin (may go to dashboard or onboarding)
  await page.waitForTimeout(8000)

  const loginUrl = page.url()
  if (loginUrl.includes('/auth/signin')) {
    await shot('login-failed')
    throw new Error('Login failed - still on signin')
  }
  finding('PASS', 'Auth', `Signed in, landed at ${loginUrl}`)
  await shot('dashboard')

  // ═══════════════════════════════════════════════════════
  // PHASE 2: RECON - Screenshot all major surfaces
  // ═══════════════════════════════════════════════════════
  console.log('\n═══ PHASE 2: RECON ═══')
  const surfaces = [
    ['/clients', 'clients'],
    ['/clients/new', 'client-form'],
    ['/events', 'events'],
    ['/events/new', 'event-form'],
    ['/recipes', 'recipes'],
    ['/recipes/new', 'recipe-form'],
    ['/menus', 'menus'],
    ['/menus/new', 'menu-form'],
    ['/quotes', 'quotes'],
    ['/calendar', 'calendar'],
    ['/financials', 'financials'],
    ['/culinary', 'culinary'],
  ]

  for (const [path, name] of surfaces) {
    try {
      await nav(name, path)
      const bodyText = await page.$eval('body', el => el.innerText.slice(0, 200)).catch(() => '')
      if (bodyText.includes('Sign In') || bodyText.includes('Signing you in')) {
        finding('FAIL', name, 'Redirected to signin - auth lost')
      } else {
        finding('PASS', name, 'Page loaded')
      }
      await shot(name)
    } catch (err) {
      finding('FAIL', name, `Failed to load: ${err.message.slice(0, 80)}`)
    }
  }

  // ═══════════════════════════════════════════════════════
  // PHASE 3: CREATE CLIENT
  // ═══════════════════════════════════════════════════════
  console.log('\n═══ PHASE 3: CREATE CLIENT ═══')
  await nav('New Client', '/clients/new')
  await shot('client-form-empty')

  // Check what fields exist
  const clientInputs = await page.$$eval('input, textarea, select', els =>
    els.map(e => ({ tag: e.tagName, type: e.type, name: e.name, id: e.id, placeholder: e.placeholder, label: e.labels?.[0]?.textContent?.trim() || '' }))
  )
  console.log(`  Found ${clientInputs.length} form inputs`)
  for (const inp of clientInputs.slice(0, 20)) {
    console.log(`    ${inp.tag}[${inp.type || ''}] name="${inp.name}" id="${inp.id}" label="${inp.label}" placeholder="${inp.placeholder}"`)
  }

  // Try to fill in client data (based on stress test: repeat client, dinner party host)
  // Using generic test data, not real client data
  const clientFields = {
    'first_name': 'Test',
    'firstName': 'Test',
    'last_name': 'Client',
    'lastName': 'Client',
    'name': 'Test Client',
    'email': 'testclient@example.com',
    'phone': '555-0100',
  }

  for (const [key, val] of Object.entries(clientFields)) {
    const sel = `input[name="${key}"], input[id="${key}"]`
    const el = await page.$(sel)
    if (el) {
      await el.fill(val)
      console.log(`    Filled ${key} = ${val}`)
    }
  }

  await shot('client-form-filled')

  // Try to submit
  const submitBtn = await page.$('button[type="submit"], button:has-text("Save"), button:has-text("Create")')
  if (submitBtn) {
    const btnText = await submitBtn.textContent()
    console.log(`  Submit button: "${btnText?.trim()}"`)
    await submitBtn.click()
    await page.waitForTimeout(3000)
    await shot('client-after-submit')
    const afterUrl = page.url()
    console.log(`  After submit URL: ${afterUrl}`)
    if (afterUrl.includes('/clients/') && !afterUrl.includes('/new')) {
      finding('PASS', 'Client Creation', `Client created, redirected to ${afterUrl}`)
    } else {
      finding('PARTIAL', 'Client Creation', `Submit clicked but URL is ${afterUrl}`)
    }
  } else {
    finding('GAP', 'Client Creation', 'No submit button found on client form')
  }

  // ═══════════════════════════════════════════════════════
  // PHASE 4: CREATE EVENT
  // ═══════════════════════════════════════════════════════
  console.log('\n═══ PHASE 4: CREATE EVENT ═══')
  await nav('New Event', '/events/new')
  await shot('event-form-empty')

  const eventInputs = await page.$$eval('input, textarea, select', els =>
    els.map(e => ({ tag: e.tagName, type: e.type, name: e.name, id: e.id, placeholder: e.placeholder, label: e.labels?.[0]?.textContent?.trim() || '' }))
  )
  console.log(`  Found ${eventInputs.length} form inputs`)
  for (const inp of eventInputs.slice(0, 25)) {
    console.log(`    ${inp.tag}[${inp.type || ''}] name="${inp.name}" id="${inp.id}" label="${inp.label}" placeholder="${inp.placeholder}"`)
  }
  await shot('event-form-inputs')

  // ═══════════════════════════════════════════════════════
  // PHASE 5: CHECK RECIPES
  // ═══════════════════════════════════════════════════════
  console.log('\n═══ PHASE 5: RECIPE FORM ═══')
  await nav('New Recipe', '/recipes/new')
  await shot('recipe-form-empty')

  const recipeInputs = await page.$$eval('input, textarea, select', els =>
    els.map(e => ({ tag: e.tagName, type: e.type, name: e.name, id: e.id, placeholder: e.placeholder, label: e.labels?.[0]?.textContent?.trim() || '' }))
  )
  console.log(`  Found ${recipeInputs.length} form inputs`)
  for (const inp of recipeInputs.slice(0, 20)) {
    console.log(`    ${inp.tag}[${inp.type || ''}] name="${inp.name}" id="${inp.id}" label="${inp.label}" placeholder="${inp.placeholder}"`)
  }

  // ═══════════════════════════════════════════════════════
  // PHASE 6: CHECK MENU
  // ═══════════════════════════════════════════════════════
  console.log('\n═══ PHASE 6: MENU FORM ═══')
  await nav('New Menu', '/menus/new')
  await shot('menu-form-empty')

  const menuInputs = await page.$$eval('input, textarea, select', els =>
    els.map(e => ({ tag: e.tagName, type: e.type, name: e.name, id: e.id, placeholder: e.placeholder, label: e.labels?.[0]?.textContent?.trim() || '' }))
  )
  console.log(`  Found ${menuInputs.length} form inputs`)
  for (const inp of menuInputs.slice(0, 20)) {
    console.log(`    ${inp.tag}[${inp.type || ''}] name="${inp.name}" id="${inp.id}" label="${inp.label}" placeholder="${inp.placeholder}"`)
  }

  // ═══════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════
  console.log('\n═══ SUMMARY ═══')
  const pass = findings.filter(f => f.type === 'PASS').length
  const fail = findings.filter(f => f.type === 'FAIL').length
  const gap = findings.filter(f => f.type === 'GAP').length
  const partial = findings.filter(f => f.type === 'PARTIAL').length
  console.log(`PASS: ${pass} | FAIL: ${fail} | GAP: ${gap} | PARTIAL: ${partial}`)
  console.log(`Screenshots: ${shotIndex}`)

  // Write findings to file
  const report = findings.map(f => `[${f.type}] ${f.area}: ${f.detail}`).join('\n')
  fs.writeFileSync(`${SHOTS}/findings.txt`, report)
  console.log(`Findings written to ${SHOTS}/findings.txt`)

  await browser.close()
}

run().catch(err => {
  console.error('❌ FATAL:', err.message)
  browser?.close()
  process.exit(1)
})
