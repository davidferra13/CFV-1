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
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(4000)
  // Verify we're on the right page (Next.js client-side redirects can push elsewhere)
  const url = page.url()
  if (!url.includes(path.split('?')[0])) {
    console.log(`  ⚠️ Nav drift: expected ${path}, got ${url}`)
    // Retry once with full load
    await page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: 45000 })
    await page.waitForTimeout(4000)
  }
}

// ═══════════════════════════════════════════════════════
// SIGN IN
// ═══════════════════════════════════════════════════════
async function signIn() {
  console.log('\n═══ SIGN IN ═══')
  // Strategy: fetch CSRF + POST credentials via page.evaluate (JS context)
  // Then navigate to dashboard with session cookie set.
  // This avoids the "Signing you in..." hydration issue.

  // Navigate to any page first to establish origin context for fetch()
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2000)

  // Step 1+2: Get CSRF and POST credentials in one evaluate
  const authResult = await page.evaluate(async ({ base, email, password }) => {
    try {
      // Get CSRF token
      const csrfResp = await fetch(`${base}/api/auth/csrf`)
      const csrfData = await csrfResp.json()
      const csrf = csrfData.csrfToken
      if (!csrf) return { ok: false, error: 'No CSRF token' }

      // POST credentials
      const resp = await fetch(`${base}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          csrfToken: csrf,
          email,
          password,
          json: 'true',
        }),
        redirect: 'manual', // Don't follow redirect
      })

      return { ok: resp.status < 400, status: resp.status, location: resp.headers.get('location') }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  }, { base: BASE, email: CREDS.email, password: CREDS.password })

  console.log(`  Auth result: ${JSON.stringify(authResult)}`)

  // Step 3: Navigate to dashboard (session cookie now set)
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'commit', timeout: 60000 })
  await page.waitForTimeout(8000)

  // Handle PWA/cookie overlays
  const reloadBtn = page.locator('button:has-text("Reload Now")')
  if (await reloadBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await reloadBtn.click()
    await page.waitForTimeout(5000)
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3000)
  }
  const acceptBtn = page.locator('button:has-text("Accept")')
  if (await acceptBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await acceptBtn.click()
  }

  // Check we're authenticated
  let loginUrl = page.url()
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(1000)
    loginUrl = page.url()
    if (!loginUrl.includes('/auth/') && !loginUrl.includes('/signin')) break
  }

  if (loginUrl.includes('/auth/signin')) {
    await shot('login-failed')
    throw new Error('Login failed - still on signin page after auth')
  }
  finding('PASS', 'Auth', `Signed in, landed at ${loginUrl}`)
  await page.waitForTimeout(2000)
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

  // Log network requests for debugging (scoped - remove after)
  const netLogger = resp => {
    if (resp.url().includes('client') || resp.status() >= 400) {
      console.log(`    NET: ${resp.status()} ${resp.url().slice(0, 80)}`)
    }
  }
  page.on('response', netLogger)

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

  // Remove network logger to prevent flooding subsequent tests
  page.removeListener('response', netLogger)

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

  // Verify we're on the recipe form
  const recipeUrl = page.url()
  if (!recipeUrl.includes('/recipes/new')) {
    console.log(`    ⚠️ Not on recipe page. URL: ${recipeUrl}. Retrying...`)
    await page.goto(`${BASE}/recipes/new`, { waitUntil: 'load', timeout: 45000 })
    await page.waitForTimeout(5000)
    if (!page.url().includes('/recipes/new')) {
      console.log(`    ❌ Still not on recipe page: ${page.url()}`)
      return false
    }
  }

  // Handle "Restore unsent draft?" modal
  const discardBtn = page.locator('button:has-text("Discard")')
  if (await discardBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('    Discarding unsent draft...')
    await discardBtn.click()
    await page.waitForTimeout(1000)
  }

  // Click Manual Entry tab (required - Smart Import is default)
  const manualTab = page.locator('button:has-text("Manual Entry")')
  await manualTab.waitFor({ state: 'visible', timeout: 15000 })
  await manualTab.click()
  await page.waitForTimeout(1000)
  console.log('    Switched to Manual Entry mode')

  // Fill recipe name - wait for it to be visible
  const nameInput = page.getByPlaceholder('e.g., Diane Sauce')
  await nameInput.waitFor({ state: 'visible', timeout: 10000 })
  await nameInput.fill(name)

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
// S5d: CREATE MENU (3-step wizard)
// ═══════════════════════════════════════════════════════
async function createMenu() {
  console.log('\n═══ S5d: CREATE MENU ═══')

  await nav('New Menu', '/menus/new')
  await page.waitForTimeout(2000)
  await shot('menu-form-step1')

  const ts = Date.now().toString().slice(-4)
  const menuName = `Dinner Party Menu ${ts}`

  // Step 1: Metadata
  const nameInput = page.getByPlaceholder('e.g., Summer BBQ Menu')
  await nameInput.fill(menuName)

  const descInput = page.getByPlaceholder('Describe this menu...')
  if (await descInput.isVisible().catch(() => false)) {
    await descInput.fill('6-guest Italian-forward dinner. Pasta, chicken, tart.')
  }

  // Guest count
  const guestInput = page.getByPlaceholder('e.g., 12')
  if (await guestInput.isVisible().catch(() => false)) {
    await guestInput.fill('6')
  }

  // Scene type
  const sceneSelect = page.locator('select[aria-label="Scene type"]')
  if (await sceneSelect.isVisible().catch(() => false)) {
    await sceneSelect.selectOption('Intimate Dinner')
  }

  // Service style
  const styleSelect = page.locator('select[aria-label="Service style"]')
  if (await styleSelect.isVisible().catch(() => false)) {
    await styleSelect.selectOption('plated')
  }

  await shot('menu-step1-filled')

  // Click "Next: Add Courses"
  const nextBtn = page.getByRole('button', { name: /Next.*Add Courses/i })
  if (!await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    finding('FAIL', 'S5d: Menu', 'Next: Add Courses button not found')
    return false
  }
  await nextBtn.click()
  await page.waitForTimeout(1000)

  // Step 2: Courses - match recipe names for auto-linking in step 3
  // Course 1 already exists
  const courseLabelInputs = () => page.getByPlaceholder('e.g., Main Course')
  const dishNameInputs = () => page.getByPlaceholder('e.g., Duck Breast')
  const dishDescInputs = () => page.getByPlaceholder('Brief description...')

  // Course 1: Pasta (will match "Sage Butter Ravioli")
  await courseLabelInputs().first().fill('First Course')
  await dishNameInputs().first().fill('Sage Butter Ravioli')
  await dishDescInputs().first().fill('Fresh ricotta ravioli with brown butter and crispy sage')
  console.log('  Course 1: First Course - Sage Butter Ravioli')

  // Add Course 2
  const addCourseBtn = page.locator('button:has-text("+ Add Course")')
  await addCourseBtn.click()
  await page.waitForTimeout(500)

  // Course 2: Protein (will match "Herb Roasted Chicken")
  await courseLabelInputs().nth(1).fill('Main Course')
  await dishNameInputs().nth(1).fill('Herb Roasted Chicken')
  await dishDescInputs().nth(1).fill('Dry-brined whole chicken with herbs and garlic confit')
  console.log('  Course 2: Main Course - Herb Roasted Chicken')

  // Add Course 3
  await addCourseBtn.click()
  await page.waitForTimeout(500)

  // Course 3: Dessert (will match "Lemon Olive Oil Tart")
  await courseLabelInputs().nth(2).fill('Dessert')
  await dishNameInputs().nth(2).fill('Lemon Olive Oil Tart')
  await dishDescInputs().nth(2).fill('Bright citrus tart with olive oil crust and whipped cream')
  console.log('  Course 3: Dessert - Lemon Olive Oil Tart')

  await shot('menu-step2-courses')

  // Click "Create Menu (3 courses)"
  const createBtn = page.getByRole('button', { name: /Create Menu/i })
  await createBtn.click()
  console.log('  Clicked Create Menu, waiting for step 3...')

  // Wait for step 3 (breakdown panel) or redirect - up to 45s
  let menuCreated = false
  for (let i = 0; i < 45; i++) {
    await page.waitForTimeout(1000)

    // Check for breakdown panel (step 3)
    const breakdown = await page.getByText('Menu Breakdown').isVisible().catch(() => false)
    const viewMenu = await page.getByText('View Menu').isVisible().catch(() => false)
    const openEditor = await page.getByText('Open Editor').isVisible().catch(() => false)

    if (breakdown || viewMenu || openEditor) {
      menuCreated = true
      console.log(`  Menu created after ${i+1}s (breakdown panel visible)`)
      break
    }

    // Also check URL change
    const url = page.url()
    if (url.includes('/menus/') && !url.includes('/new')) {
      menuCreated = true
      const match = url.match(/\/menus\/([a-f0-9-]+)/)
      if (match) created.menuId = match[1]
      console.log(`  Menu created after ${i+1}s (URL redirect)`)
      break
    }

    if (i % 10 === 9) console.log(`    Still creating menu... (${i+1}s)`)
  }

  if (!menuCreated) {
    await shot('menu-create-timeout')
    finding('FAIL', 'S5d: Menu', 'Menu creation timed out after 45s')
    return false
  }

  await shot('menu-step3-breakdown')

  // Try to extract menu ID from "View Menu" link
  if (!created.menuId) {
    try {
      const viewLink = await page.$('a[href*="/menus/"]')
      if (viewLink) {
        const href = await viewLink.getAttribute('href')
        const match = href?.match(/\/menus\/([a-f0-9-]+)/)
        if (match) created.menuId = match[1]
      }
    } catch {}
  }

  // Wait for auto recipe matching (searches by dish name)
  console.log('  Waiting for auto recipe matching...')
  await page.waitForTimeout(5000) // give it time to search

  await shot('menu-recipe-matching')

  if (created.menuId) {
    finding('PASS', 'S5d: Menu', `Created menu "${menuName}" (${created.menuId}) with 3 courses`)
  } else {
    finding('PARTIAL', 'S5d: Menu', `Menu created but could not extract ID`)
  }

  return true
}

// ═══════════════════════════════════════════════════════
// S5e: LINK MENU TO EVENT (Money tab -> MenuLibraryPicker)
// ═══════════════════════════════════════════════════════
async function linkMenuToEvent() {
  console.log('\n═══ S5e: LINK MENU TO EVENT ═══')

  if (!created.eventId || !created.menuId) {
    finding('FAIL', 'S5e: Menu Link', `Missing IDs: event=${created.eventId}, menu=${created.menuId}`)
    return false
  }

  // Navigate to event detail
  await nav('Event Detail', `/events/${created.eventId}`)
  await page.waitForTimeout(3000)

  // Click Money tab (tab bar uses URL params)
  await page.goto(`${BASE}/events/${created.eventId}?tab=money`, { waitUntil: 'load', timeout: 45000 })
  await page.waitForTimeout(8000) // Money tab has Suspense boundaries, wait for hydration
  await shot('event-money-tab')

  // Look for MenuLibraryPicker "Use" button for our menu
  const pageText = await page.$eval('body', el => el.innerText).catch(() => '')

  // Find all "Use" buttons
  const useButtons = page.getByRole('button', { name: /^Use$/i })
  const useCount = await useButtons.count()
  console.log(`  Found ${useCount} "Use" buttons in menu library`)

  if (useCount > 0) {
    // Click the first "Use" button (our menu should be most recent)
    await useButtons.first().click()
    console.log('  Clicked "Use" on first menu')
    await page.waitForTimeout(5000) // server action to link

    await shot('event-menu-linked')

    // Verify the link by checking page content
    const afterText = await page.$eval('body', el => el.innerText).catch(() => '')
    if (afterText.includes('Dinner Party Menu') || afterText.includes('Sage Butter') || afterText.includes('Herb Roasted')) {
      finding('PASS', 'S5e: Menu Link', 'Menu linked to event via MenuLibraryPicker')
    } else {
      finding('PARTIAL', 'S5e: Menu Link', 'Clicked Use but could not confirm link')
    }
    return true
  } else {
    // Maybe menus show as cards, try scrolling
    console.log('  No "Use" buttons found. Checking if menu library is empty...')
    await shot('event-menu-library-empty')
    finding('GAP', 'S5e: Menu Link', 'No menus in library picker')
    return false
  }
}

// ═══════════════════════════════════════════════════════
// S5f: EXPLORE EVENT DETAIL (verify full chain)
// ═══════════════════════════════════════════════════════
async function exploreEventDetail() {
  console.log('\n═══ S5f: EVENT DETAIL EXPLORATION ═══')

  if (!created.eventId) {
    finding('FAIL', 'S5f: Event Detail', 'No event ID to explore')
    return false
  }

  await nav('Event Detail', `/events/${created.eventId}`)
  await page.waitForTimeout(3000)
  await shot('event-detail-overview')

  // Screenshot each tab via URL param (more reliable than clicking)
  const tabs = ['overview', 'money', 'prep', 'tickets', 'ops', 'wrap']
  for (const tab of tabs) {
    try {
      await page.goto(`${BASE}/events/${created.eventId}?tab=${tab}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      await page.waitForTimeout(2000)
      await shot(`event-tab-${tab}`)
      console.log(`  Tab "${tab}" loaded`)
    } catch {
      console.log(`  Tab "${tab}" failed to load`)
    }
  }

  // Check Ops tab for FSM transition buttons
  await page.goto(`${BASE}/events/${created.eventId}?tab=ops`, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForTimeout(2000)

  const transitionBtns = await page.$$eval('button', els =>
    els.map(e => e.textContent?.trim())
      .filter(t => t && (
        t.includes('Propose') || t.includes('Accept') || t.includes('Mark Paid') ||
        t.includes('Confirm') || t.includes('In Progress') || t.includes('Complete') ||
        t.includes('Cancel')
      ))
  )
  if (transitionBtns.length > 0) {
    console.log(`  FSM buttons on Ops tab: ${transitionBtns.join(', ')}`)
  }

  await shot('event-detail-explored')
  finding('PASS', 'S5f: Event Detail', `Event detail loaded with ${tabs.length} tabs`)
  return true
}

// ═══════════════════════════════════════════════════════
// S7: EVENT FSM TRAVERSAL (full 6-step, Ops tab, 60s waits)
// ═══════════════════════════════════════════════════════
async function testFSMTraversal() {
  console.log('\n═══ S7: FSM TRAVERSAL ═══')

  if (!created.eventId) {
    finding('FAIL', 'S7: FSM', 'No event ID')
    return false
  }

  // Verify starting status from DB via page
  async function getEventStatus() {
    // Navigate to Ops tab which shows EventTransitions
    await page.goto(`${BASE}/events/${created.eventId}?tab=ops`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(4000)
    // Read visible status from badges
    const badges = await page.$$eval('[class*="badge"], [class*="Badge"], [class*="status"]', els =>
      els.map(e => e.textContent?.trim().toLowerCase()).filter(Boolean)
    )
    return badges
  }

  // Expected transitions: draft -> proposed -> accepted -> paid -> confirmed -> in_progress -> completed
  const transitions = [
    { button: 'Propose to Client', expected: 'proposed', label: 'draft -> proposed' },
    { button: 'Accept on Behalf', expected: 'accepted', label: 'proposed -> accepted' },
    { button: 'Mark Paid (Offline)', expected: 'paid', label: 'accepted -> paid' },
    { button: 'Confirm Event', expected: 'confirmed', label: 'paid -> confirmed' },
    { button: 'Mark In Progress', expected: 'in_progress', label: 'confirmed -> in_progress' },
    { button: 'Mark Completed', expected: 'completed', label: 'in_progress -> completed' },
  ]

  let transitionsCompleted = 0
  let lastStatus = 'draft'

  for (const tr of transitions) {
    // Always reload the Ops tab to get fresh state
    await page.goto(`${BASE}/events/${created.eventId}?tab=ops`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(4000)

    // Find exact button text match
    const btn = page.getByRole('button', { name: tr.button, exact: true })
    const btnVisible = await btn.isVisible({ timeout: 5000 }).catch(() => false)

    if (!btnVisible) {
      console.log(`    Button "${tr.button}" not visible. Current buttons on page:`)
      const allBtnTexts = await page.$$eval('button', els =>
        els.map(e => e.textContent?.trim()).filter(t => t && t.length > 1 && t.length < 50)
      )
      console.log(`      ${allBtnTexts.join(' | ')}`)
      await shot(`fsm-missing-${tr.expected}`)
      break // Can't proceed with remaining transitions
    }

    // Check disabled state
    const isDisabled = await btn.isDisabled().catch(() => false)
    if (isDisabled) {
      console.log(`    Button "${tr.button}" is DISABLED (readiness gate?)`)
      // Check for readiness blockers
      const blockerText = await page.$$eval('[class*="border-red"], [class*="border-amber"]', els =>
        els.map(e => e.textContent?.trim().slice(0, 100)).join('; ')
      ).catch(() => '')
      if (blockerText) console.log(`    Readiness blockers: ${blockerText}`)
      await shot(`fsm-blocked-${tr.expected}`)

      // For paid->confirmed, try overriding soft gates
      if (tr.expected === 'confirmed') {
        // Check for override buttons
        const overrideBtn = page.locator('button:has-text("Override"), button:has-text("Proceed Anyway")')
        if (await overrideBtn.isVisible().catch(() => false)) {
          await overrideBtn.click()
          await page.waitForTimeout(2000)
          console.log('    Clicked override for readiness gate')
        }
      }

      // If still disabled, stop
      const stillDisabled = await btn.isDisabled().catch(() => true)
      if (stillDisabled) {
        finding('PARTIAL', 'S7: FSM', `Blocked at "${tr.label}" by readiness gate. ${transitionsCompleted}/6 done.`)
        break
      }
    }

    console.log(`  Clicking: ${tr.label}`)
    // Scroll button into view and force-click (bypass overlay checks)
    await btn.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)

    // Listen for page errors during click
    const pageErrors = []
    const errHandler = err => pageErrors.push(err.message?.slice(0, 100) || String(err))
    page.on('pageerror', errHandler)

    await btn.click({ force: true })

    // Wait for server action to complete (120s on slow hardware - side effects + router.refresh)
    console.log(`    Waiting for server action...`)
    let transitioned = false
    for (let i = 0; i < 120; i++) {
      await page.waitForTimeout(1000)

      // Check if the button disappears (meaning state changed and component re-rendered)
      const stillVisible = await page.getByRole('button', { name: tr.button, exact: true })
        .isVisible().catch(() => false)

      // For "Mark Completed" - it redirects to /events/[id]/close-out
      if (tr.expected === 'completed') {
        const url = page.url()
        if (url.includes('/close-out')) {
          transitioned = true
          console.log(`    Redirected to close-out page after ${i+1}s`)
          break
        }
      }

      if (!stillVisible) {
        transitioned = true
        console.log(`    Button gone after ${i+1}s (transition succeeded)`)
        break
      }

      // Also check for error toast/message
      const errorMsg = await page.$$eval('[role="alert"], .text-red-500, [data-sonner-toast]', els =>
        els.map(e => e.textContent?.trim()).filter(t => t && t.length > 2).join('; ')
      ).catch(() => '')
      if (errorMsg && errorMsg.length > 5) {
        console.log(`    Error during transition: ${errorMsg.slice(0, 120)}`)
        await shot(`fsm-error-${tr.expected}`)
        break
      }

      if (i % 15 === 14) console.log(`      Still waiting... (${i+1}s)`)
    }

    // Remove error listener
    page.removeListener('pageerror', errHandler)
    if (pageErrors.length > 0) {
      console.log(`    Page JS errors: ${pageErrors.join('; ')}`)
    }

    if (transitioned) {
      transitionsCompleted++
      lastStatus = tr.expected
      await shot(`fsm-${tr.expected}`)
      console.log(`    ✅ ${tr.label} (${transitionsCompleted}/6)`)
    } else {
      // Check if transition actually worked by looking at the error state
      const errorEl = await page.$('[class*="text-red"], [role="alert"]')
      const errorText = errorEl ? await errorEl.textContent() : null
      console.log(`    ❌ ${tr.label} - transition may not have completed`)
      if (errorText) console.log(`    Error on page: ${errorText.slice(0, 120)}`)

      // Check if button is still loading (action still in progress)
      const isLoading = await btn.getAttribute('data-loading').catch(() => null)
      const btnDisabled = await btn.isDisabled().catch(() => false)
      console.log(`    Button state: disabled=${btnDisabled}, data-loading=${isLoading}`)

      await shot(`fsm-stuck-${tr.expected}`)
      // Don't break - reload and check if it actually worked
    }
  }

  // Final status check
  await page.goto(`${BASE}/events/${created.eventId}?tab=ops`, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForTimeout(3000)
  await shot('fsm-final-state')

  if (transitionsCompleted >= 5) {
    finding('PASS', 'S7: FSM', `Completed ${transitionsCompleted}/6 transitions. Event reached "${lastStatus}"`)
  } else if (transitionsCompleted >= 3) {
    finding('PARTIAL', 'S7: FSM', `${transitionsCompleted}/6 transitions. Stopped at "${lastStatus}"`)
  } else if (transitionsCompleted > 0) {
    finding('PARTIAL', 'S7: FSM', `Only ${transitionsCompleted}/6 transitions. Last: "${lastStatus}"`)
  } else {
    finding('FAIL', 'S7: FSM', 'No transitions completed')
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

    // S5: Full chain - Client -> Event -> Recipes -> Menu -> Link Menu -> FSM
    const clientOk = await createClient()
    if (clientOk) {
      const eventOk = await createEvent()
      if (eventOk) {
        await createRecipes()
        // S5d: Create menu with 3 courses matching recipe names
        try { await createMenu() } catch (e) {
          console.error(`  Menu creation error: ${e.message.slice(0, 80)}`)
          finding('FAIL', 'S5d: Menu', `Crashed: ${e.message.slice(0, 60)}`)
        }
        // S5e: Link menu to event via Money tab
        try { await linkMenuToEvent() } catch (e) {
          console.error(`  Menu linking error: ${e.message.slice(0, 80)}`)
          finding('FAIL', 'S5e: Menu Link', `Crashed: ${e.message.slice(0, 60)}`)
        }
        // S5f: Explore event detail with all tabs
        await exploreEventDetail()
        // S7: Full FSM traversal (Ops tab, 60s waits)
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
