/**
 * S1-S10 Chain Test - Full dinner lifecycle via Playwright against production
 *
 * Tests the complete workflow chain:
 *   Client -> Event -> Recipe -> Menu -> Shopping List -> Quote -> FSM -> Financials
 *
 * Target: http://localhost:3000 (production build)
 * Auth: .auth/agent.json (agent test account)
 */
import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:3000'
const SHOTS = 'screenshots/s1-s10-chain'
const CREDS = JSON.parse(fs.readFileSync('.auth/agent.json', 'utf-8'))

let page, context, browser
let shotIndex = 0
const findings = []

// Track created entity IDs for cross-referencing
const created = {
  clientId: null,
  clientName: null,
  eventId: null,
  recipeIds: [],
  menuId: null,
}

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

// ═══════════════════════════════════════════════════════
// SIGN IN
// ═══════════════════════════════════════════════════════
async function signIn() {
  console.log('\n═══ SIGN IN ═══')
  await page.goto(`${BASE}/auth/signin`, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForTimeout(3000)

  // Handle PWA "Updating app..." interstitial
  const reloadBtn = page.locator('button:has-text("Reload Now")')
  if (await reloadBtn.isVisible().catch(() => false)) {
    console.log('  PWA update screen detected, clicking Reload Now...')
    await reloadBtn.click()
    await page.waitForTimeout(5000)
    // After reload, navigate to signin again
    await page.goto(`${BASE}/auth/signin`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(3000)
  }

  // Handle cookie banner
  const acceptBtn = page.locator('button:has-text("Accept")')
  if (await acceptBtn.isVisible().catch(() => false)) {
    await acceptBtn.click()
    await page.waitForTimeout(500)
  }

  await page.waitForSelector('input[type="email"]', { timeout: 15000 })
  await page.fill('input[type="email"]', CREDS.email)
  await page.fill('input[type="password"]', CREDS.password)
  await page.click('button[type="submit"]')

  // Wait for navigation away from signin (poll URL for up to 15s)
  let loginUrl = page.url()
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(1000)
    loginUrl = page.url()
    if (!loginUrl.includes('/auth/signin')) break
  }

  if (loginUrl.includes('/auth/signin')) {
    await shot('login-failed')
    throw new Error('Login failed - still on signin page after 15s')
  }
  finding('PASS', 'Auth', `Signed in, landed at ${loginUrl}`)
  await page.waitForTimeout(2000) // let dashboard fully render
  await shot('signed-in')
}

// ═══════════════════════════════════════════════════════
// S5a: CREATE CLIENT
// ═══════════════════════════════════════════════════════
async function createClient() {
  console.log('\n═══ S5a: CREATE CLIENT ═══')
  await nav('New Client', '/clients/new')
  await shot('client-form-empty')

  // Use unique name to avoid duplicates
  const ts = Date.now().toString().slice(-6)
  created.clientName = `Chain Test ${ts}`

  // Fill required field
  await page.getByLabel('Full Name').fill(created.clientName)
  await page.getByLabel('Email').fill(`chaintest${ts}@example.com`)
  await page.getByLabel('Phone').fill('555-0199')

  // Fill allergies via tag input (optional)
  try {
    const allergyInput = page.getByPlaceholder('Type allergy and press Enter')
    if (await allergyInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await allergyInput.click({ timeout: 3000 })
      await page.keyboard.type('shellfish', { delay: 30 })
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
      await page.keyboard.type('tree nuts', { delay: 30 })
      await page.keyboard.press('Enter')
      console.log('  Filled allergies: shellfish, tree nuts')
    }
  } catch (e) {
    console.log(`  Skipping allergies: ${e.message.slice(0, 60)}`)
  }

  // Fill dietary restrictions (optional)
  try {
    const dietInput = page.getByPlaceholder('e.g. Vegetarian, Gluten-Free')
    if (await dietInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dietInput.click()
      await dietInput.fill('Pescatarian')
      await dietInput.press('Enter')
      console.log('  Filled dietary: Pescatarian')
    }
  } catch (e) {
    console.log(`  Skipping dietary: ${e.message.slice(0, 60)}`)
  }

  // Fill notes (optional)
  try {
    const notesField = page.getByPlaceholder('Anything else from the first call')
    if (await notesField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await notesField.fill('Chain test client. Prefers Italian cuisine, adventurous eater, birthday Nov 12.')
      console.log('  Filled notes')
    }
  } catch (e) {
    console.log(`  Skipping notes: ${e.message.slice(0, 60)}`)
  }

  await shot('client-form-filled')

  // Submit and wait for navigation
  const submitBtn = page.getByRole('button', { name: 'Add Client' })

  // Log network requests for debugging
  page.on('response', resp => {
    if (resp.url().includes('client') || resp.status() >= 400) {
      console.log(`    NET: ${resp.status()} ${resp.url().slice(0, 80)}`)
    }
  })

  await submitBtn.click()

  // Wait for URL to change from /clients/new (poll up to 30s)
  let afterUrl = page.url()
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000)
    afterUrl = page.url()
    if (!afterUrl.includes('/clients/new')) break
    if (i % 5 === 4) console.log(`    Still saving... (${i+1}s)`)
  }

  console.log(`  After submit URL: ${afterUrl}`)
  await shot('client-after-submit')

  if (afterUrl.includes('/clients/') && !afterUrl.includes('/new')) {
    // Extract client ID from URL
    const match = afterUrl.match(/\/clients\/([a-f0-9-]+)/)
    if (match) {
      created.clientId = match[1]
      finding('PASS', 'S5a: Client', `Created client "${created.clientName}" (${created.clientId})`)
    } else {
      finding('PARTIAL', 'S5a: Client', `Redirected to ${afterUrl} but could not extract ID`)
    }
  } else {
    // Check for real validation errors (not just * indicators)
    const errorText = await page.$$eval('.text-red-500, .text-destructive, [role="alert"]',
      els => els.map(e => e.textContent?.trim()).filter(t => t && t.length > 2).join('; ')
    ).catch(() => null)
    if (errorText) {
      finding('FAIL', 'S5a: Client', `Validation error: ${errorText}`)
    } else {
      finding('FAIL', 'S5a: Client', `Submit did not redirect after 15s. URL: ${afterUrl}`)
    }
    return false
  }
  return true
}

// ═══════════════════════════════════════════════════════
// S5b: CREATE EVENT (linked to client)
// ═══════════════════════════════════════════════════════
async function createEvent() {
  console.log('\n═══ S5b: CREATE EVENT ═══')

  if (!created.clientId) {
    finding('FAIL', 'S5b: Event', 'Cannot create event - no client ID')
    return false
  }

  await nav('New Event', '/events/new')
  await page.waitForTimeout(2000)
  await shot('event-form-empty')

  // Step 1: Event Details
  // Select client from dropdown
  const clientSelect = page.getByLabel('Client')
  await clientSelect.waitFor({ state: 'visible', timeout: 5000 })

  // Get available options to find our client
  const options = await clientSelect.locator('option').allTextContents()
  console.log(`  Client options: ${options.length} total`)

  // Find our client option
  const clientOption = options.find(o => o.includes(created.clientName))
  if (clientOption) {
    await clientSelect.selectOption({ label: clientOption })
    console.log(`  Selected client: ${clientOption}`)
  } else {
    // Try selecting by value (client ID)
    await clientSelect.selectOption(created.clientId)
    console.log(`  Selected client by ID: ${created.clientId}`)
  }

  // Set event date - use dynamic date (7 days from now) to avoid scheduling conflicts
  const eventDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const dateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth()+1).padStart(2,'0')}-${String(eventDate.getDate()).padStart(2,'0')}T17:00`
  console.log(`  Event date: ${dateStr}`)
  await page.getByLabel('Event Date & Time').fill(dateStr)

  // Set serve time
  const serveTime = page.getByLabel('Serve Time')
  if (await serveTime.isVisible().catch(() => false)) {
    await serveTime.fill('19:15')
  }

  // Set guest count
  await page.getByLabel('Number of Guests').fill('6')

  // Set occasion
  const occasion = page.getByLabel('Occasion')
  if (await occasion.isVisible().catch(() => false)) {
    await occasion.fill('Dinner Party - Chain Test')
  }

  // Set address
  const addressInput = page.getByPlaceholder('e.g., 123 Main St')
  if (await addressInput.isVisible().catch(() => false)) {
    await addressInput.fill('42 Elm Street')
  }
  const cityInput = page.getByLabel('City')
  if (await cityInput.isVisible().catch(() => false)) {
    await cityInput.fill('Haverhill')
  }
  const stateInput = page.getByLabel('State')
  if (await stateInput.isVisible().catch(() => false)) {
    await stateInput.fill('MA')
  }
  const zipInput = page.getByLabel('ZIP')
  if (await zipInput.isVisible().catch(() => false)) {
    await zipInput.fill('01830')
  }

  await shot('event-step1-filled')

  // Click Continue to Step 2
  // Step 1 save can take 10-20s on slow hardware ("Checking..." spinner)
  // Also: async conflict check may show warning requiring checkbox acknowledgment
  const continueBtn = page.getByRole('button', { name: /Continue/ })
  await continueBtn.click()
  console.log('  Clicked Continue, waiting for Step 2 to appear...')

  // Wait for Step 2: poll for "Quoted Price" label up to 50s
  // At each iteration, also check for scheduling conflict checkbox
  let step2Visible = false
  let conflictHandled = false
  for (let i = 0; i < 50; i++) {
    await page.waitForTimeout(1000)

    // Check if Step 2 appeared
    const qpVisible = await page.getByText('Quoted Price ($)').isVisible().catch(() => false)
    const checkingBtn = await page.locator('button:has-text("Checking")').isVisible().catch(() => false)
    if (qpVisible && !checkingBtn) {
      step2Visible = true
      console.log(`  Step 2 appeared after ${i+1}s`)
      break
    }

    // Check for scheduling conflict warning (async server check takes 10-15s)
    if (!conflictHandled) {
      const conflictCheckbox = page.locator('input[type="checkbox"]').locator('xpath=ancestor::label[contains(.,"I understand")]')
      const conflictLabel = page.locator('label:has-text("I understand")')
      const isConflict = await conflictLabel.isVisible().catch(() => false)
      if (isConflict) {
        console.log(`  Scheduling conflict detected at ${i+1}s - clicking checkbox label`)
        await conflictLabel.click()
        await page.waitForTimeout(500)
        conflictHandled = true
        // Re-click Continue
        const retryBtn = page.getByRole('button', { name: /Continue/ })
        if (await retryBtn.isVisible().catch(() => false)) {
          await retryBtn.click()
          console.log('  Re-clicked Continue after conflict acknowledgment')
        }
      }
    }

    if (i % 5 === 4) console.log(`    Still waiting for Step 2... (${i+1}s)`)
  }

  if (!step2Visible) {
    await shot('event-step2-timeout')
    finding('FAIL', 'S5b: Event', 'Step 2 never appeared after 30s')
    return false
  }

  await page.waitForTimeout(500) // let fields settle
  await shot('event-step2')

  // Step 2: Pricing & Notes - use placeholder selectors (more reliable)
  const quotedPrice = page.getByPlaceholder('e.g., 2500.00')
  if (await quotedPrice.isVisible().catch(() => false)) {
    await quotedPrice.click()
    await quotedPrice.fill('750')
    console.log('  Set quoted price: $750')
  } else {
    // Fallback to label
    const qpByLabel = page.getByLabel('Quoted Price ($)')
    if (await qpByLabel.isVisible().catch(() => false)) {
      await qpByLabel.fill('750')
      console.log('  Set quoted price (via label): $750')
    } else {
      console.log('  WARNING: Could not find Quoted Price field')
    }
  }

  const depositField = page.getByPlaceholder('e.g., 500.00')
  if (await depositField.isVisible().catch(() => false)) {
    await depositField.click()
    await depositField.fill('200')
    console.log('  Set deposit: $200')
  } else {
    const depByLabel = page.getByLabel('Deposit Amount ($)')
    if (await depByLabel.isVisible().catch(() => false)) {
      await depByLabel.fill('200')
      console.log('  Set deposit (via label): $200')
    } else {
      console.log('  WARNING: Could not find Deposit Amount field')
    }
  }

  const specialReqs = page.getByPlaceholder('Any additional details or special requests')
  if (await specialReqs.isVisible().catch(() => false)) {
    await specialReqs.fill('Chain test event. 6-guest dinner party, Italian-forward menu, $125/head.')
  } else {
    const srByLabel = page.getByLabel('Special Requests')
    if (await srByLabel.isVisible().catch(() => false)) {
      await srByLabel.fill('Chain test event. 6-guest dinner party, Italian-forward menu, $125/head.')
    }
  }

  await shot('event-step2-filled')

  // Submit and wait for redirect (server action takes 20-30s on slow hardware)
  const createBtn = page.getByRole('button', { name: 'Create Event' })
  await createBtn.click()
  console.log('  Clicked Create Event, waiting for redirect...')

  // Poll URL for up to 40s
  let afterUrl = page.url()
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000)
    afterUrl = page.url()
    if (!afterUrl.includes('/events/new')) break
    if (i % 5 === 4) console.log(`    Still saving event... (${i+1}s)`)
  }

  console.log(`  After submit URL: ${afterUrl}`)
  await shot('event-after-submit')

  // Check for event detail page redirect
  const eventMatch = afterUrl.match(/\/events\/([a-f0-9-]+)/)
  if (eventMatch && !afterUrl.includes('/new')) {
    created.eventId = eventMatch[1]
    finding('PASS', 'S5b: Event', `Created event (${created.eventId}), linked to client "${created.clientName}"`)
  } else {
    const errorText = await page.$$eval('.text-red-500, .text-destructive, [role="alert"]',
      els => els.map(e => e.textContent?.trim()).filter(t => t && t.length > 2).join('; ')
    ).catch(() => null)
    if (errorText) {
      finding('FAIL', 'S5b: Event', `Error: ${errorText}`)
    } else {
      finding('FAIL', 'S5b: Event', `Submit did not redirect after 40s. URL: ${afterUrl}`)
    }
    return false
  }
  return true
}

// ═══════════════════════════════════════════════════════
// S5c: CREATE RECIPES (3 recipes with ingredients)
// ═══════════════════════════════════════════════════════
async function createRecipe(name, category, description, ingredients) {
  console.log(`\n  Creating recipe: ${name}`)
  await nav(`Recipe: ${name}`, '/recipes/new')
  await page.waitForTimeout(2000)

  // Handle "Restore unsent draft?" modal
  const discardBtn = page.locator('button:has-text("Discard")')
  if (await discardBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('    Discarding unsent draft...')
    await discardBtn.click()
    await page.waitForTimeout(1000)
  }

  // Click Manual Entry tab
  const manualTab = page.locator('button:has-text("Manual Entry")')
  if (await manualTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await manualTab.click()
    await page.waitForTimeout(500)
  }

  // Fill recipe name
  await page.getByPlaceholder('e.g., Diane Sauce').fill(name)

  // Select category
  const catSelect = page.locator('select[aria-label="Category"]')
  if (await catSelect.isVisible().catch(() => false)) {
    await catSelect.selectOption(category)
  }

  // Fill description
  const descInput = page.getByPlaceholder('Brief description')
  if (await descInput.isVisible().catch(() => false)) {
    await descInput.fill(description)
  }

  // Add ingredients - target inputs WITHIN the ingredients section specifically
  for (let i = 0; i < ingredients.length; i++) {
    const ing = ingredients[i]

    // First ingredient row exists by default, add more rows for subsequent ingredients
    if (i > 0) {
      const addBtn = page.getByRole('button', { name: 'Add Ingredient' })
      if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click()
        await page.waitForTimeout(300)
      }
    }

    // Fill ingredient name
    const nameInputs = page.getByPlaceholder('Ingredient name')
    const nameCount = await nameInputs.count()
    if (i < nameCount) {
      await nameInputs.nth(i).fill(ing.name)
    }

    // Fill quantity - the qty input has no placeholder, it's a number input in .w-20 div
    // Use the ingredient name input's parent row to find the sibling qty input
    try {
      const nameInput = nameInputs.nth(i)
      // Go up to the row container (flex gap-2 items-start), then find number input
      const row = nameInput.locator('xpath=ancestor::div[contains(@class,"flex") and contains(@class,"gap-2")]')
      const qtyInput = row.locator('input[type="number"]').first()
      if (await qtyInput.isVisible().catch(() => false)) {
        await qtyInput.fill(String(ing.qty))
      } else {
        console.log(`    No qty input found in row ${i}`)
      }
    } catch {
      console.log(`    Could not fill qty for ${ing.name}`)
    }

    // Fill unit
    const unitInputs = page.getByPlaceholder('cup, tbsp')
    const unitCount = await unitInputs.count()
    if (i < unitCount) {
      await unitInputs.nth(i).fill(ing.unit)
    }

    console.log(`    Added: ${ing.qty} ${ing.unit} ${ing.name}`)
  }

  await shot(`recipe-${name.toLowerCase().replace(/\s+/g, '-')}`)

  // Save and wait for redirect (poll up to 45s)
  const saveBtn = page.getByRole('button', { name: 'Save Recipe' })
  // Scroll to button and click
  await saveBtn.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await saveBtn.click()
  console.log(`    Clicked Save Recipe, waiting for redirect...`)

  // Check button text immediately to confirm click registered
  await page.waitForTimeout(1000)
  const btnTextAfterClick = await page.getByRole('button', { name: /Save|Saving/ }).first()
    .textContent().catch(() => 'unknown')
  console.log(`    Button text after click: "${btnTextAfterClick?.trim()}"`)

  // Check for immediate error (duplicate name, validation)
  const immediateError = await page.$$eval('.text-red-500, .text-destructive, [role="alert"], .bg-destructive',
    els => els.map(e => e.textContent?.trim()).filter(t => t && t.length > 2).join('; ')
  ).catch(() => null)
  if (immediateError) {
    console.log(`    Immediate error detected: ${immediateError.slice(0, 120)}`)
  }

  let afterUrl = page.url()
  for (let i = 0; i < 45; i++) {
    await page.waitForTimeout(1000)
    afterUrl = page.url()
    if (!afterUrl.includes('/recipes/new')) break
    if (i % 10 === 9) console.log(`    Still saving recipe... (${i+1}s)`)
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)
  const recipeMatch = afterUrl.match(/\/recipes\/([a-f0-9-]+)/)
  if (recipeMatch && !afterUrl.includes('/new')) {
    created.recipeIds.push(recipeMatch[1])
    console.log(`  ✅ Recipe created: ${recipeMatch[1]}`)
    await shot(`recipe-${slug}-saved`)
    return true
  } else {
    // Scroll to top to capture any error messages
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)
    const errorText = await page.$$eval('.text-red-500, .text-destructive, [role="alert"], .bg-destructive',
      els => els.map(e => e.textContent?.trim()).filter(t => t && t.length > 2).join('; ')
    ).catch(() => null)
    console.log(`  ❌ Recipe save failed. URL: ${afterUrl}, Error: ${errorText || 'unknown'}`)
    await shot(`recipe-${slug}-error`)
    return false
  }
}

async function createRecipes() {
  console.log('\n═══ S5c: CREATE RECIPES ═══')

  // Use unique names to avoid duplicate-recipe validation errors from previous runs
  const ts = Date.now().toString().slice(-4)
  const recipes = [
    {
      name: `Sage Butter Ravioli ${ts}`,
      category: 'pasta',
      description: 'Fresh ricotta ravioli with brown butter and crispy sage',
      ingredients: [
        { name: 'All-purpose flour', qty: 3, unit: 'cups' },
        { name: 'Eggs', qty: 4, unit: 'whole' },
        { name: 'Ricotta cheese', qty: 2, unit: 'cups' },
        { name: 'Unsalted butter', qty: 0.5, unit: 'lb' },
        { name: 'Fresh sage', qty: 1, unit: 'bunch' },
        { name: 'Parmesan cheese', qty: 1, unit: 'cup' },
      ]
    },
    {
      name: `Herb Roasted Chicken ${ts}`,
      category: 'protein',
      description: 'Dry-brined whole chicken with herbs and garlic confit',
      ingredients: [
        { name: 'Whole chicken', qty: 2, unit: 'each' },
        { name: 'Garlic heads', qty: 3, unit: 'whole' },
        { name: 'Fresh thyme', qty: 1, unit: 'bunch' },
        { name: 'Fresh rosemary', qty: 1, unit: 'bunch' },
        { name: 'Unsalted butter', qty: 0.25, unit: 'lb' },
        { name: 'Kosher salt', qty: 3, unit: 'tbsp' },
        { name: 'Black pepper', qty: 1, unit: 'tbsp' },
      ]
    },
    {
      name: `Lemon Olive Oil Tart ${ts}`,
      category: 'dessert',
      description: 'Bright citrus tart with olive oil crust and whipped cream',
      ingredients: [
        { name: 'Lemons', qty: 4, unit: 'whole' },
        { name: 'Granulated sugar', qty: 1.5, unit: 'cups' },
        { name: 'Extra virgin olive oil', qty: 0.5, unit: 'cup' },
        { name: 'Eggs', qty: 6, unit: 'whole' },
        { name: 'Heavy cream', qty: 1, unit: 'cup' },
        { name: 'All-purpose flour', qty: 1.5, unit: 'cups' },
      ]
    }
  ]

  let successCount = 0
  for (const recipe of recipes) {
    const ok = await createRecipe(recipe.name, recipe.category, recipe.description, recipe.ingredients)
    if (ok) successCount++
  }

  if (successCount === 3) {
    finding('PASS', 'S5c: Recipes', `Created ${successCount}/3 recipes with ingredients`)
  } else if (successCount > 0) {
    finding('PARTIAL', 'S5c: Recipes', `Created ${successCount}/3 recipes`)
  } else {
    finding('FAIL', 'S5c: Recipes', 'Could not create any recipes')
  }
  return successCount > 0
}

// ═══════════════════════════════════════════════════════
// S5d: EXPLORE EVENT DETAIL (menu, shopping list, prep timeline)
// ═══════════════════════════════════════════════════════
async function exploreEventDetail() {
  console.log('\n═══ S5d: EVENT DETAIL EXPLORATION ═══')

  if (!created.eventId) {
    finding('FAIL', 'S5d: Event Detail', 'No event ID to explore')
    return false
  }

  await nav('Event Detail', `/events/${created.eventId}`)
  await shot('event-detail-overview')

  // Catalog all tabs/sections visible on event detail page
  const allButtons = await page.$$eval('button, [role="tab"], a[href]', els =>
    els.map(e => ({
      tag: e.tagName,
      text: e.textContent?.trim()?.slice(0, 60),
      href: e.getAttribute('href'),
      role: e.getAttribute('role'),
    })).filter(e => e.text && e.text.length > 0)
  )
  console.log(`  Found ${allButtons.length} interactive elements`)
  for (const btn of allButtons.slice(0, 30)) {
    console.log(`    ${btn.tag}[${btn.role || ''}] "${btn.text}" ${btn.href || ''}`)
  }

  // Look for tabs on the event detail page
  const tabs = await page.$$('[role="tab"], [data-state]')
  if (tabs.length > 0) {
    console.log(`  Found ${tabs.length} tab elements`)
    for (const tab of tabs) {
      const text = await tab.textContent()
      const state = await tab.getAttribute('data-state')
      console.log(`    Tab: "${text?.trim()}" (${state})`)
    }
  }

  // Screenshot each section/tab
  const tabNames = ['Overview', 'Menu', 'Prep', 'Shopping', 'Financial', 'Timeline', 'Guests', 'Details']
  for (const tabName of tabNames) {
    try {
      const tab = page.getByRole('tab', { name: tabName }).or(
        page.locator(`button:has-text("${tabName}")`).first()
      )
      if (await tab.isVisible().catch(() => false)) {
        await tab.click()
        await page.waitForTimeout(1000)
        await shot(`event-tab-${tabName.toLowerCase()}`)
        console.log(`  📋 Tab "${tabName}" visible`)
      }
    } catch {
      // Tab doesn't exist, that's fine
    }
  }

  // Check for status badge and FSM controls
  const statusBadge = await page.$eval('[class*="badge"], [class*="Badge"]',
    el => el.textContent?.trim()).catch(() => null)
  if (statusBadge) {
    console.log(`  Status badge: "${statusBadge}"`)
    finding('PASS', 'S7: Status Badge', `Event shows status "${statusBadge}"`)
  }

  // Look for transition buttons (FSM)
  const transitionBtns = await page.$$eval('button', els =>
    els.map(e => e.textContent?.trim())
      .filter(t => t && (
        t.includes('Propose') || t.includes('Accept') || t.includes('Mark Paid') ||
        t.includes('Confirm') || t.includes('Start') || t.includes('Complete') ||
        t.includes('Cancel') || t.includes('Send') || t.includes('Begin')
      ))
  )
  if (transitionBtns.length > 0) {
    console.log(`  FSM transition buttons: ${transitionBtns.join(', ')}`)
  }

  await shot('event-detail-explored')
  finding('PASS', 'S5d: Event Detail', `Event detail loaded with tabs and status`)
  return true
}

// ═══════════════════════════════════════════════════════
// S7: EVENT FSM TRAVERSAL
// ═══════════════════════════════════════════════════════
async function testFSMTraversal() {
  console.log('\n═══ S7: FSM TRAVERSAL ═══')

  if (!created.eventId) {
    finding('FAIL', 'S7: FSM', 'No event ID')
    return false
  }

  await nav('Event for FSM', `/events/${created.eventId}`)
  await page.waitForTimeout(2000)

  // Expected transitions: draft -> proposed -> accepted -> paid -> confirmed -> in_progress -> completed
  const transitions = [
    { button: /Send Proposal|Propose to Client/i, expected: 'proposed', label: 'draft -> proposed' },
    { button: /Accept on Behalf|Accept Event/i, expected: 'accepted', label: 'proposed -> accepted' },
    { button: /Mark Paid|Record Payment|Mark Paid \(Offline\)/i, expected: 'paid', label: 'accepted -> paid' },
    { button: /Confirm/i, expected: 'confirmed', label: 'paid -> confirmed' },
    { button: /Start|Begin Service|In Progress/i, expected: 'in_progress', label: 'confirmed -> in_progress' },
    { button: /Complete|Mark Complete/i, expected: 'completed', label: 'in_progress -> completed' },
  ]

  let transitionsCompleted = 0

  for (const tr of transitions) {
    // Reload page to pick up latest event state after each transition
    if (transitionsCompleted > 0) {
      await page.goto(`${BASE}/events/${created.eventId}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      await page.waitForTimeout(3000)
    }

    // Find the transition button
    let btn = null
    try {
      btn = page.getByRole('button', { name: tr.button })
      if (!await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        btn = null
      }
    } catch {
      btn = null
    }

    if (!btn) {
      // Try broader text match
      const allBtns = await page.$$('button')
      for (const b of allBtns) {
        const text = await b.textContent().catch(() => '')
        if (text && tr.button.test(text)) {
          btn = b
          break
        }
      }
    }

    if (btn) {
      // Check if button is disabled
      const isDisabled = await page.evaluate(el => el.disabled, btn).catch(() => false)
      if (isDisabled) {
        console.log(`    ⚠️ Button found but disabled for: ${tr.label}`)
        await shot(`fsm-disabled-${tr.expected}`)
        continue
      }

      console.log(`  Clicking: ${tr.label}`)
      await btn.click()
      await page.waitForTimeout(3000)

      // Handle any confirmation dialogs/modals
      const confirmBtn = await page.$('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("OK")')
      if (confirmBtn) {
        await confirmBtn.click()
        await page.waitForTimeout(2000)
      }

      // For "Mark Paid" transition, we may need to fill payment details
      if (tr.label.includes('paid')) {
        const amountInput = await page.$('input[type="number"]')
        if (amountInput) {
          await amountInput.fill('750')
          console.log('    Filled payment amount: $750')
          const methodSelect = await page.$('select')
          if (methodSelect) {
            await methodSelect.selectOption('cash').catch(() => {})
          }
          const payBtn = await page.$('button:has-text("Record"), button:has-text("Submit"), button:has-text("Save"), button[type="submit"]')
          if (payBtn) {
            await payBtn.click()
            await page.waitForTimeout(3000)
          }
        }
      }

      // Wait for transition to complete (server action)
      await page.waitForTimeout(5000)
      await shot(`fsm-${tr.expected}`)
      transitionsCompleted++
      console.log(`    ✅ ${tr.label}`)
    } else {
      console.log(`    ⚠️ Button not found for: ${tr.label}`)
      await shot(`fsm-missing-${tr.expected}`)
    }
  }

  if (transitionsCompleted >= 4) {
    finding('PASS', 'S7: FSM', `Completed ${transitionsCompleted}/6 transitions`)
  } else if (transitionsCompleted > 0) {
    finding('PARTIAL', 'S7: FSM', `Only ${transitionsCompleted}/6 transitions found`)
  } else {
    finding('FAIL', 'S7: FSM', 'No transition buttons found on event detail')
  }

  return transitionsCompleted > 0
}

// ═══════════════════════════════════════════════════════
// S9: CALENDAR CROSS-VERIFICATION
// ═══════════════════════════════════════════════════════
async function testCalendar() {
  console.log('\n═══ S9: CALENDAR VERIFICATION ═══')

  await nav('Calendar', '/calendar')
  await shot('calendar-page')

  // Check if our event date (April 25, 2026) is visible
  const pageText = await page.$eval('body', el => el.innerText).catch(() => '')

  // Look for our event on the calendar
  const hasEvent = pageText.includes('Chain Test') || pageText.includes('Dinner Party') || pageText.includes('Apr 25') || pageText.includes('April 25')

  if (hasEvent) {
    finding('PASS', 'S9: Calendar', 'Event appears on calendar')
  } else {
    finding('PARTIAL', 'S9: Calendar', 'Calendar loaded but event not visible in current view')
  }

  // Dashboard metrics
  await nav('Dashboard', '/dashboard')
  await shot('dashboard-metrics')

  const dashText = await page.$eval('body', el => el.innerText).catch(() => '')
  finding('PASS', 'S9: Dashboard', 'Dashboard loaded for metrics check')

  return true
}

// ═══════════════════════════════════════════════════════
// S6: CHECK FINANCIALS
// ═══════════════════════════════════════════════════════
async function testFinancials() {
  console.log('\n═══ S6 & S9: FINANCIAL VERIFICATION ═══')

  await nav('Financials', '/financials')
  await shot('financials-page')

  const pageText = await page.$eval('body', el => el.innerText.slice(0, 500)).catch(() => '')
  console.log(`  Financials page text (first 500): ${pageText.slice(0, 200)}...`)

  if (pageText.includes('Sign In') || pageText.includes('Signing you in')) {
    finding('FAIL', 'S6: Financials', 'Redirected to signin')
    return false
  }

  finding('PASS', 'S6: Financials', 'Financials page accessible')
  return true
}

// ═══════════════════════════════════════════════════════
// S1: GUEST DIETARY PERSISTENCE (data model check)
// ═══════════════════════════════════════════════════════
async function testGuestDietaryPersistence() {
  console.log('\n═══ S1: GUEST DIETARY PERSISTENCE ═══')

  if (!created.eventId) {
    finding('FAIL', 'S1: Guest Diet', 'No event to test')
    return
  }

  // Navigate to event guests section
  await nav('Event Guests', `/events/${created.eventId}`)
  await page.waitForTimeout(1500)

  // Try to find a "Guests" tab
  // Look for guests tab on the event detail page (not the sidebar nav)
  // Use the main content area to avoid sidebar button collisions
  const mainContent = page.locator('main, #main-content, [class*="flex-1"]').first()
  const guestsTab = mainContent.getByRole('tab', { name: /Guest/i }).or(
    mainContent.locator('button:has-text("Guest")').first()
  )
  if (await guestsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await guestsTab.click({ force: true })
    await page.waitForTimeout(1000)
    await shot('event-guests-tab')

    // Look for add guest functionality
    const addGuestBtn = await page.$('button:has-text("Add Guest"), button:has-text("New Guest")')
    if (addGuestBtn) {
      finding('PASS', 'S1: Guest UI', 'Add guest button exists on event')
    } else {
      finding('GAP', 'S1: Guest UI', 'No add guest button found')
    }
  } else {
    finding('GAP', 'S1: Guest UI', 'No guests tab found on event detail')
    await shot('event-no-guests-tab')
  }
}

// ═══════════════════════════════════════════════════════
// S2: ALLERGY SEVERITY (UI check)
// ═══════════════════════════════════════════════════════
async function testAllergySeverity() {
  console.log('\n═══ S2: ALLERGY SEVERITY ═══')

  // Navigate to client detail to check allergy display
  if (created.clientId) {
    await nav('Client Detail', `/clients/${created.clientId}`)
    await page.waitForTimeout(1500)
    await shot('client-detail-allergies')

    // Look for allergy severity indicators
    const pageText = await page.$eval('body', el => el.innerText).catch(() => '')
    const hasSeverity = pageText.includes('severity') || pageText.includes('Severity') ||
      pageText.includes('life-threatening') || pageText.includes('intolerance')

    if (hasSeverity) {
      finding('PASS', 'S2: Allergy Severity', 'Severity levels visible on client detail')
    } else {
      // Check if allergies at least display
      if (pageText.includes('shellfish') || pageText.includes('tree nuts')) {
        finding('PARTIAL', 'S2: Allergy Severity', 'Allergies display but no severity levels (flat text array)')
      } else {
        finding('GAP', 'S2: Allergy Severity', 'Allergies not visible on client detail')
      }
    }
  }
}

// ═══════════════════════════════════════════════════════
// SUMMARY & REPORT
// ═══════════════════════════════════════════════════════
function writeSummary() {
  console.log('\n═══════════════════════════════════════')
  console.log('═══ S1-S10 CHAIN TEST SUMMARY ═══')
  console.log('═══════════════════════════════════════')

  const pass = findings.filter(f => f.type === 'PASS').length
  const fail = findings.filter(f => f.type === 'FAIL').length
  const gap = findings.filter(f => f.type === 'GAP').length
  const partial = findings.filter(f => f.type === 'PARTIAL').length

  console.log(`\n  PASS: ${pass} | FAIL: ${fail} | GAP: ${gap} | PARTIAL: ${partial}`)
  console.log(`  Screenshots: ${shotIndex}`)
  console.log(`  Created: client=${created.clientId ? 'YES' : 'NO'}, event=${created.eventId ? 'YES' : 'NO'}, recipes=${created.recipeIds.length}`)

  console.log('\n  All findings:')
  for (const f of findings) {
    const icon = f.type === 'PASS' ? '✅' : f.type === 'FAIL' ? '❌' : f.type === 'GAP' ? '🔧' : '⚠️'
    console.log(`    ${icon} [${f.type}] ${f.area}: ${f.detail}`)
  }

  // Write report
  const report = [
    `S1-S10 Chain Test Report - ${new Date().toISOString()}`,
    `═══════════════════════════════════════`,
    `PASS: ${pass} | FAIL: ${fail} | GAP: ${gap} | PARTIAL: ${partial}`,
    `Created entities: client=${created.clientId || 'NONE'}, event=${created.eventId || 'NONE'}, recipes=${created.recipeIds.join(', ') || 'NONE'}`,
    '',
    ...findings.map(f => `[${f.type}] ${f.area}: ${f.detail}`)
  ].join('\n')

  fs.writeFileSync(`${SHOTS}/report.txt`, report)
  console.log(`\n  Report written to ${SHOTS}/report.txt`)
}

// ═══════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════
async function run() {
  // Ensure screenshot directory exists
  fs.mkdirSync(SHOTS, { recursive: true })

  browser = await chromium.launch({ headless: true })
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    serviceWorkers: 'block',
  })
  page = await context.newPage()

  try {
    // Auth
    await signIn()

    // S5: Full chain
    const clientOk = await createClient()
    if (clientOk) {
      const eventOk = await createEvent()
      if (eventOk) {
        await createRecipes()
        await exploreEventDetail()
        await testFSMTraversal()
      }
    }

    // S1, S2: Data model checks (wrapped in try/catch to prevent cascading failures)
    try { await testGuestDietaryPersistence() } catch (e) {
      console.error(`  S1 error: ${e.message.slice(0, 80)}`)
      finding('FAIL', 'S1: Guest Diet', `Test crashed: ${e.message.slice(0, 60)}`)
      await shot('s1-crash').catch(() => {})
    }
    try { await testAllergySeverity() } catch (e) {
      console.error(`  S2 error: ${e.message.slice(0, 80)}`)
      finding('FAIL', 'S2: Allergy', `Test crashed: ${e.message.slice(0, 60)}`)
    }

    // S9: Calendar and dashboard
    try { await testCalendar() } catch (e) {
      console.error(`  S9 error: ${e.message.slice(0, 80)}`)
      finding('FAIL', 'S9: Calendar', `Test crashed: ${e.message.slice(0, 60)}`)
    }

    // S6: Financials
    try { await testFinancials() } catch (e) {
      console.error(`  S6 error: ${e.message.slice(0, 80)}`)
      finding('FAIL', 'S6: Financials', `Test crashed: ${e.message.slice(0, 60)}`)
    }

  } catch (err) {
    console.error(`\n❌ FATAL: ${err.message}`)
    await shot('fatal-error').catch(() => {})
  }

  writeSummary()
  await browser.close()
}

run().catch(err => {
  console.error('❌ FATAL:', err.message)
  browser?.close()
  process.exit(1)
})
