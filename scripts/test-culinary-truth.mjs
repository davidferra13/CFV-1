/**
 * Culinary Truth Integration Test
 *
 * Runs canonical menus from culinary education standards through the
 * ChefFlow menu creation wizard and validates the breakdown panel output.
 *
 * Data sources:
 *   - Escoffier, Le Guide Culinaire (1903) - classical French sequence
 *   - CIA (Culinary Institute of America) curriculum
 *   - ACF (American Culinary Federation) classification standards
 *
 * Usage:
 *   node scripts/test-culinary-truth.mjs
 *   node scripts/test-culinary-truth.mjs --fixture vegan   (run one fixture)
 *   node scripts/test-culinary-truth.mjs --headed          (show browser)
 */

import { chromium } from 'playwright'
import { mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const BASE_URL = 'http://localhost:3100'
const EMAIL = 'agent@chefflow.test'
const PASSWORD = 'AgentChefFlow!2026'
const SCREENSHOTS_DIR = 'C:/Users/david/Documents/CFv1/screenshots/culinary-truth'
const NAV_TIMEOUT = 180000
const ACTION_TIMEOUT = 60000

const args = process.argv.slice(2)
const HEADED = args.includes('--headed')
const FIXTURE_FILTER = args.includes('--fixture') ? args[args.indexOf('--fixture') + 1] : null

// ─── Canonical Menu Fixtures ───────────────────────────────────────────────────
// Ground truth from culinary education. Each fixture specifies exactly what a
// correctly constructed menu looks like and what the breakdown must show.

const CANONICAL_MENUS = [
  {
    id: 'escoffier',
    name: 'Escoffier Classical French Dinner',
    source: 'Escoffier, Le Guide Culinaire (1903)',
    scene_type: 'Intimate Dinner',
    cuisine_type: 'French',
    service_style: 'plated',
    guest_count: '10',
    courses: [
      { label: 'Amuse-Bouche', dish: 'Gougeres with Gruyere' },
      { label: 'First Course', dish: 'Pate de Campagne' },
      { label: 'Soup', dish: 'Veloute de Champignon' },
      { label: 'Fish Course', dish: 'Sole Meuniere' },
      { label: 'Intermezzo', dish: 'Calvados Granite' },
      { label: 'Main Course', dish: "Carre d'Agneau Persille" },
      { label: 'Cheese Course', dish: 'Plateau de Fromages' },
      { label: 'Dessert', dish: 'Tarte Tatin' },
    ],
    expect: {
      course_count: 8,
      tagline_includes: ['8-course', 'Plated', 'French', 'Intimate Dinner'],
    },
  },
  {
    id: 'vegan',
    name: 'Vegan Wellness Dinner',
    source: 'Le Cordon Bleu plant-based curriculum',
    scene_type: 'Intimate Dinner',
    cuisine_type: 'Plant-Based',
    service_style: 'plated',
    guest_count: '4',
    courses: [
      { label: 'Amuse-Bouche', dish: 'Gazpacho Shooter' },
      { label: 'First Course', dish: 'Beet Carpaccio' },
      { label: 'Main Course', dish: 'Wild Mushroom Risotto' },
      { label: 'Dessert', dish: 'Coconut Panna Cotta' },
    ],
    expect: {
      course_count: 4,
      tagline_includes: ['4-course', 'Plated', 'Plant-Based', 'Intimate Dinner'],
    },
  },
  {
    id: 'cocktail',
    name: 'Corporate Cocktail Reception',
    source: 'ACF Catering and Banquet Service standards',
    scene_type: 'Corporate Event',
    cuisine_type: 'American',
    service_style: 'cocktail',
    guest_count: '75',
    courses: [
      { label: 'Canapes', dish: 'Smoked Salmon Blinis' },
      { label: 'Canapes', dish: 'Beef Tartare Crostini' },
      { label: 'Canapes', dish: 'Mushroom Bruschetta' },
      { label: 'Canapes', dish: 'Caprese Skewer' },
      { label: 'Canapes', dish: 'Shrimp Cocktail Shooter' },
    ],
    expect: {
      course_count: 5,
      tagline_includes: ['5-course', 'Cocktail', 'American', 'Corporate Event'],
    },
  },
  {
    id: 'holiday',
    name: 'Holiday Family Dinner',
    source: 'CIA American Cuisine curriculum',
    scene_type: 'Holiday Dinner',
    cuisine_type: 'American',
    service_style: 'plated',
    guest_count: '12',
    courses: [
      { label: 'Soup', dish: 'Butternut Squash Bisque' },
      { label: 'Salad', dish: 'Winter Citrus Salad' },
      { label: 'Main Course', dish: 'Prime Rib with Horseradish Cream' },
      { label: 'Dessert', dish: 'Pumpkin Pie with Bourbon Whipped Cream' },
    ],
    expect: {
      course_count: 4,
      tagline_includes: ['4-course', 'Plated', 'American', 'Holiday Dinner'],
    },
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

let screenshotIndex = 0
async function screenshot(page, label) {
  screenshotIndex++
  const filename = `${String(screenshotIndex).padStart(3, '0')}-${label}.png`
  const filepath = path.join(SCREENSHOTS_DIR, filename)
  await page.screenshot({ path: filepath, fullPage: true })
  return filepath
}

async function goto(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT })
  await page.waitForTimeout(2000)
}

async function clickViaEval(page, locator) {
  const el = locator.first()
  await el.waitFor({ state: 'visible', timeout: ACTION_TIMEOUT })
  await page.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })), await el.elementHandle())
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(SCREENSHOTS_DIR)) {
    await mkdir(SCREENSHOTS_DIR, { recursive: true })
  }

  const fixtures = FIXTURE_FILTER
    ? CANONICAL_MENUS.filter((m) => m.id === FIXTURE_FILTER)
    : CANONICAL_MENUS

  if (fixtures.length === 0) {
    console.error(`No fixture found with id "${FIXTURE_FILTER}". Available: ${CANONICAL_MENUS.map((m) => m.id).join(', ')}`)
    process.exit(1)
  }

  console.log(`\nCulinary Truth Test Harness`)
  console.log(`Running ${fixtures.length} canonical fixture(s)`)
  console.log(`Data sources: Escoffier, CIA, ACF, Le Cordon Bleu\n`)

  const browser = await chromium.launch({ headless: !HEADED })
  const context = await browser.newContext()
  const page = await context.newPage()
  page.setDefaultTimeout(ACTION_TIMEOUT)
  page.setDefaultNavigationTimeout(NAV_TIMEOUT)

  const consoleErrors = []
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
  page.on('pageerror', (err) => consoleErrors.push(err.message))

  // ─── Auth ────────────────────────────────────────────────────────────────────
  console.log('Authenticating...')
  const authResp = await page.request.post(`${BASE_URL}/api/e2e/auth`, {
    data: { email: EMAIL, password: PASSWORD },
    timeout: 90000,
  })
  if (!authResp.ok()) {
    console.error(`Auth failed: ${await authResp.text()}`)
    await browser.close()
    process.exit(1)
  }
  await context.addCookies([{ name: 'cookieConsent', value: 'declined', url: BASE_URL }])
  console.log('Authenticated OK\n')

  // ─── Run each fixture ─────────────────────────────────────────────────────────
  const results = []

  for (const fixture of fixtures) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`Fixture: ${fixture.name}`)
    console.log(`Source:  ${fixture.source}`)
    console.log(`Courses: ${fixture.courses.length} | Style: ${fixture.service_style} | Guests: ${fixture.guest_count}`)
    console.log('─'.repeat(60))

    const result = { id: fixture.id, name: fixture.name, checks: [], pass: true }

    try {
      // Navigate to /menus/new
      await goto(page, `${BASE_URL}/menus/new`)
      await screenshot(page, `${fixture.id}-step1`)

      // ─── Step 1: Fill metadata ────────────────────────────────────────────────
      console.log('  Filling metadata...')

      await page.locator('input[placeholder*="Summer BBQ"]').fill(fixture.name)

      const cuisineInput = page.locator('input[list="cuisine-suggestions"]')
      if (await cuisineInput.count() > 0) await cuisineInput.fill(fixture.cuisine_type)

      // Scene type dropdown
      const sceneSelect = page.locator('select').filter({ has: page.locator('option[value="Intimate Dinner"], option[value="Corporate Event"], option[value="Wedding"]') }).first()
      if (await sceneSelect.count() > 0) {
        await sceneSelect.selectOption({ label: fixture.scene_type }).catch(() => {})
      }

      // Service style
      const styleSelect = page.locator('select').filter({ has: page.locator('option[value="plated"]') }).first()
      if (await styleSelect.count() > 0) {
        await styleSelect.selectOption(fixture.service_style).catch(() => {})
      }

      // Guest count
      const guestInput = page.locator('input[type="number"]')
      if (await guestInput.count() > 0) await guestInput.fill(fixture.guest_count)

      await screenshot(page, `${fixture.id}-step1-filled`)

      // ─── Step 2: Advance to courses ───────────────────────────────────────────
      console.log('  Advancing to courses...')
      const nextBtn = page.locator('button', { hasText: 'Next: Add Courses' })
      await clickViaEval(page, nextBtn)
      await page.waitForTimeout(1500)

      const step2Visible = await page.locator('text=Add Your Courses').first().isVisible({ timeout: 10000 }).catch(() => false)
      result.checks.push({ name: 'Step 2 loads', pass: step2Visible })
      console.log(`    Step 2 visible: ${step2Visible}`)

      await screenshot(page, `${fixture.id}-step2`)

      // ─── Fill courses ─────────────────────────────────────────────────────────
      console.log(`  Filling ${fixture.courses.length} courses...`)

      for (let i = 0; i < fixture.courses.length; i++) {
        const course = fixture.courses[i]

        if (i > 0) {
          const addBtn = page.locator('button', { hasText: '+ Add Course' })
          if (await addBtn.count() > 0) {
            await clickViaEval(page, addBtn)
            await page.waitForTimeout(300)
          }
        }

        // Fill label
        const labelInputs = page.locator('input[list^="course-labels-"]')
        const lCnt = await labelInputs.count()
        if (lCnt > i) {
          await labelInputs.nth(i).fill(course.label)
        }

        // Fill dish name
        const dishInputs = page.locator('input[placeholder*="Duck Breast"]')
        const dCnt = await dishInputs.count()
        if (dCnt > i) {
          await dishInputs.nth(i).fill(course.dish)
        }

        console.log(`    [${i + 1}] ${course.label}: ${course.dish}`)
      }

      await screenshot(page, `${fixture.id}-step2-filled`)

      // ─── Count courses in preview pane ───────────────────────────────────────
      const previewItems = page.locator('[data-testid="course-preview-item"]')
      const previewCnt = await previewItems.count().catch(() => -1)
      // Fall back to counting dish input rows
      const dishRowCnt = await page.locator('input[placeholder*="Duck Breast"]').count()
      const actualCourseCount = previewCnt > 0 ? previewCnt : dishRowCnt
      const courseCountOk = actualCourseCount === fixture.expect.course_count
      result.checks.push({ name: `Course count = ${fixture.expect.course_count}`, pass: courseCountOk })
      console.log(`    Courses in builder: ${actualCourseCount} (expected ${fixture.expect.course_count}) ${courseCountOk ? 'PASS' : 'FAIL'}`)

      // ─── Submit ───────────────────────────────────────────────────────────────
      console.log('  Submitting...')
      const submitBtn = page.locator('button').filter({ hasText: /Create Menu/ })
      if (await submitBtn.count() > 0) {
        await clickViaEval(page, submitBtn)

        // Wait for breakdown panel
        let breakdownVisible = false
        for (let i = 0; i < 20; i++) {
          await page.waitForTimeout(3000)
          breakdownVisible = await page.locator('text=Open Editor').first().isVisible().catch(() => false)
          const errVisible = await page.locator('[role="alert"]').first().isVisible().catch(() => false)
          if (breakdownVisible) { console.log(`    Breakdown appeared after ~${(i + 1) * 3}s`); break }
          if (errVisible) {
            const errText = await page.locator('[role="alert"]').first().textContent().catch(() => '')
            console.log(`    Error: ${errText}`)
            break
          }
        }

        result.checks.push({ name: 'Breakdown panel renders', pass: breakdownVisible })
        console.log(`    Breakdown visible: ${breakdownVisible}`)

        await screenshot(page, `${fixture.id}-breakdown`)

        if (breakdownVisible) {
          // ─── Validate tagline ───────────────────────────────────────────────
          const taglineEl = page.locator('p.text-stone-400').first()
          const taglineText = await taglineEl.textContent().catch(() => '')
          console.log(`    Tagline: "${taglineText}"`)

          for (const part of fixture.expect.tagline_includes) {
            const found = taglineText.includes(part)
            result.checks.push({ name: `Tagline includes "${part}"`, pass: found })
            console.log(`      "${part}": ${found ? 'PASS' : 'FAIL'}`)
          }

          // ─── Validate course list ───────────────────────────────────────────
          const courseSectionText = await page.locator('text=Courses').first().isVisible().catch(() => false)
          result.checks.push({ name: 'Courses section visible', pass: courseSectionText })

          // Check each dish name appears somewhere in the breakdown
          let dishesFound = 0
          for (const course of fixture.courses) {
            const visible = await page.locator(`text=${course.dish.substring(0, 20)}`).first().isVisible().catch(() => false)
            if (visible) dishesFound++
          }
          const allDishesShown = dishesFound === fixture.courses.length
          result.checks.push({ name: `All ${fixture.courses.length} dishes shown in breakdown`, pass: allDishesShown })
          console.log(`    Dishes shown: ${dishesFound}/${fixture.courses.length} ${allDishesShown ? 'PASS' : 'FAIL'}`)

          // ─── Open Editor button present ─────────────────────────────────────
          const openEditorBtn = await page.locator('button', { hasText: 'Open Editor' }).first().isVisible().catch(() => false)
          result.checks.push({ name: 'Open Editor button visible immediately', pass: openEditorBtn })
          console.log(`    Open Editor button: ${openEditorBtn ? 'PASS' : 'FAIL'}`)
        }
      } else {
        result.checks.push({ name: 'Submit button found', pass: false })
        console.log('    ERROR: Submit button not found')
      }

    } catch (err) {
      result.checks.push({ name: 'No unhandled error', pass: false })
      console.error(`  EXCEPTION: ${err.message}`)
      await screenshot(page, `${fixture.id}-error`).catch(() => {})
    }

    // Tally results
    const failed = result.checks.filter((c) => !c.pass)
    result.pass = failed.length === 0
    results.push(result)

    console.log(`\n  Result: ${result.pass ? 'PASS' : 'FAIL'} (${result.checks.filter((c) => c.pass).length}/${result.checks.length} checks)`)
    if (failed.length > 0) {
      failed.forEach((c) => console.log(`    FAIL: ${c.name}`))
    }
  }

  await browser.close()

  // ─── Summary ──────────────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(60)}`)
  console.log('CULINARY TRUTH TEST RESULTS')
  console.log('='.repeat(60))

  let totalChecks = 0, passedChecks = 0
  for (const r of results) {
    const passed = r.checks.filter((c) => c.pass).length
    totalChecks += r.checks.length
    passedChecks += passed
    const status = r.pass ? 'PASS' : 'FAIL'
    console.log(`  [${status}] ${r.name} (${passed}/${r.checks.length})`)
  }

  console.log(`\nTotal: ${passedChecks}/${totalChecks} checks passed`)
  if (consoleErrors.length > 0) {
    console.log(`\nConsole errors (${consoleErrors.length}):`)
    consoleErrors.slice(0, 5).forEach((e) => console.log(`  ${e}`))
  }

  console.log(`\nScreenshots: ${SCREENSHOTS_DIR}`)

  const allPassed = results.every((r) => r.pass)
  if (!allPassed) {
    console.log('\nRESULT: FAIL')

    // Write JSON report
    const reportPath = path.join(SCREENSHOTS_DIR, 'report.json')
    await writeFile(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), results, consoleErrors }, null, 2))
    console.log(`Report: ${reportPath}`)

    process.exit(1)
  }

  console.log('\nRESULT: PASS - All canonical menus validated correctly')
}

main().catch((err) => {
  console.error('\nFatal:', err.message || err)
  process.exit(1)
})
