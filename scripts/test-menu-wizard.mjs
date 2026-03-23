/**
 * Menu Creation Wizard - End-to-End Verification
 * Runs against localhost:3100 using agent credentials
 */

import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const BASE_URL = 'http://localhost:3100'
const SCREENSHOTS_DIR = 'C:/Users/david/Documents/CFv1/screenshots'
const EMAIL = 'agent@chefflow.test'
const PASSWORD = 'AgentChefFlow!2026'
const NAV_TIMEOUT = 180000
const ACTION_TIMEOUT = 120000

let screenshotIndex = 0
async function screenshot(page, name) {
  screenshotIndex++
  const filename = `${String(screenshotIndex).padStart(2, '0')}-${name}.png`
  const filepath = path.join(SCREENSHOTS_DIR, filename)
  await page.screenshot({ path: filepath, fullPage: true })
  console.log(`  Screenshot saved: ${filename}`)
  return filepath
}

async function goto(page, url) {
  console.log(`  Navigating to ${url} ...`)
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT })
  await page.waitForTimeout(3000)
  console.log(`  Arrived at: ${page.url()}`)
}

async function main() {
  if (!existsSync(SCREENSHOTS_DIR)) {
    await mkdir(SCREENSHOTS_DIR, { recursive: true })
  }

  console.log('Launching browser...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()
  page.setDefaultTimeout(ACTION_TIMEOUT)
  page.setDefaultNavigationTimeout(NAV_TIMEOUT)

  const consoleErrors = []
  const consoleWarnings = []
  const failedRequests = []
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
    if (msg.type() === 'warning') consoleWarnings.push(msg.text().slice(0, 300))
  })
  page.on('pageerror', err => consoleErrors.push(err.message))
  page.on('requestfailed', req => {
    if (req.url().includes('/_next/') || req.url().includes('.js')) {
      failedRequests.push(`${req.failure()?.errorText} - ${req.url().slice(-60)}`)
    }
  })

  // ─── Step 1: Sign in ─────────────────────────────────────────────────────────
  console.log('\n=== STEP 1: Sign in via API ===')
  const authResp = await page.request.post(`${BASE_URL}/api/e2e/auth`, {
    data: { email: EMAIL, password: PASSWORD },
    timeout: 90000,
  })
  console.log(`  Auth status: ${authResp.status()}`)
  if (!authResp.ok()) {
    console.error(`  Auth failed: ${await authResp.text()}`)
    await browser.close()
    process.exit(1)
  }
  const authData = await authResp.json()
  console.log(`  Auth OK, userId=${authData.userId}`)

  await context.addCookies([{ name: 'cookieConsent', value: 'declined', url: BASE_URL }])
  console.log('  Added cookieConsent=declined cookie')

  // ─── Step 2: Menus list ───────────────────────────────────────────────────────
  console.log('\n=== STEP 2: Navigate to /menus ===')
  await goto(page, `${BASE_URL}/menus`)
  await screenshot(page, 'menus-list')
  const onMenusPage = page.url().includes('/menus')
  console.log(`  On menus page: ${onMenusPage}`)

  // ─── Step 3: Navigate to /menus/new ──────────────────────────────────────────
  console.log('\n=== STEP 3: Navigate to /menus/new ===')
  await goto(page, `${BASE_URL}/menus/new`)

  await screenshot(page, 'menus-new-step1')
  const step1Visible = await page.locator('text=Menu Details').first().isVisible({ timeout: 15000 }).catch(() => false)
  console.log(`  "Menu Details" heading visible: ${step1Visible}`)

  // Check if React actually hydrated the page
  await page.waitForTimeout(5000) // wait longer for JS to execute
  const reactHydrationStatus = await page.evaluate(() => {
    // Check for Next.js app router root
    const nextRoot = document.getElementById('__next') || document.querySelector('[data-reactroot]')
    // Check if any DOM element has a React fiber
    const anyEl = document.querySelector('main') || document.querySelector('div')
    const fiberKeys = anyEl ? Object.getOwnPropertyNames(anyEl).filter(k => k.includes('react') || k.includes('fiber') || k.includes('Fiber')) : []
    // Check __NEXT_DATA__
    const nextData = document.getElementById('__NEXT_DATA__')
    // Check window.__next_f (RSC payload indicator)
    const hasRSC = typeof window.__next_f !== 'undefined'
    const hasNextLoaded = typeof window.next !== 'undefined'
    return {
      hasNextRoot: !!nextRoot,
      fiberKeysOnMain: fiberKeys.slice(0, 3),
      hasNextData: !!nextData,
      hasRSC,
      hasNextLoaded,
      windowKeys: Object.keys(window).filter(k => k.includes('next') || k.includes('Next') || k.includes('React')).slice(0, 5),
    }
  })
  console.log(`  React hydration status: ${JSON.stringify(reactHydrationStatus)}`)

  // ─── Dismiss DraftRestorePrompt if it appears ─────────────────────────────────

  const draftDialogCount = await page.locator('[role="dialog"]').count()
  console.log(`  Dialogs after load: ${draftDialogCount}`)
  if (draftDialogCount > 0) {
    const dialogBtns = await page.locator('[role="dialog"] button').allTextContents()
    console.log(`  Dialog buttons: ${dialogBtns.join(' | ')}`)
    const discardBtn = page.locator('[role="dialog"] button', { hasText: /Discard/ })
    if (await discardBtn.count() > 0) {
      await discardBtn.first().click()
      await page.waitForTimeout(500)
      console.log('  Dismissed DraftRestorePrompt')
    }
  }

  // Dismiss checklist overlay
  const dismissChecklist = page.locator('button[aria-label="Dismiss checklist"]')
  if (await dismissChecklist.count() > 0) {
    await dismissChecklist.first().click({ force: true })
    await page.waitForTimeout(400)
    console.log('  Dismissed checklist')
  }

  // ─── Step 4: Fill Step 1 ─────────────────────────────────────────────────────
  console.log('\n=== STEP 4: Fill in Step 1 (Menu Details) ===')

  // Click the name field to focus it, then use keyboard to type
  // This ensures React's synthetic events fire correctly for controlled inputs
  const nameInput = page.locator('input[placeholder*="Summer BBQ"]').first()
  await nameInput.click()
  await page.waitForTimeout(100)
  await page.keyboard.press('Control+a')
  await page.keyboard.type('Agent Test Menu - March 2026')
  await page.keyboard.press('Tab')
  await page.waitForTimeout(200)

  const nameValue = await nameInput.inputValue()
  console.log(`  Name input value: "${nameValue}"`)

  // Description
  const textarea = page.locator('textarea').first()
  if (await textarea.isVisible().catch(() => false)) {
    await textarea.click()
    await textarea.fill('Playwright verification menu')
    await textarea.press('Tab')
    console.log('  Filled description')
  }

  // Cuisine
  const cuisineInput = page.locator('input[list="cuisine-suggestions"]')
  if (await cuisineInput.count() > 0) {
    await cuisineInput.fill('American')
    console.log('  Filled cuisine: American')
  }

  // Scene type
  const sceneSelect = page.locator('select[aria-label="Scene type"]')
  if (await sceneSelect.count() > 0) {
    await sceneSelect.selectOption('Intimate Dinner')
    console.log('  Selected scene: Intimate Dinner')
  }

  // Service style
  const styleSelect = page.locator('select[aria-label="Service style"]')
  if (await styleSelect.count() > 0) {
    await styleSelect.selectOption('plated')
    console.log('  Selected service style: plated')
  }

  // Guest count
  const guestInput = page.locator('input[type="number"]')
  if (await guestInput.count() > 0) {
    await guestInput.fill('8')
    console.log('  Filled guest count: 8')
  }

  await screenshot(page, 'menus-new-step1-filled')

  // ─── Step 5: Click "Next: Add Courses" ────────────────────────────────────────
  console.log('\n=== STEP 5: Click "Next: Add Courses" ===')

  // Verify name in React state
  const nameInReact = await nameInput.inputValue()
  console.log(`  Name input value before click: "${nameInReact}"`)

  // Dismiss the Getting Started checklist - it renders AFTER mount and covers the Next button
  // It appears in the bottom-right corner overlapping the Next button area
  for (let attempt = 0; attempt < 5; attempt++) {
    const dismissBtn = page.locator('button[aria-label="Dismiss checklist"]')
    const dismissCount = await dismissBtn.count()
    if (dismissCount === 0) break
    await dismissBtn.first().click({ force: true })
    await page.waitForTimeout(600)
    console.log(`  Dismissed Getting Started checklist (attempt ${attempt + 1})`)
    // Check if it's gone
    const stillVisible = await page.locator('text=Getting Started').isVisible().catch(() => false)
    if (!stillVisible) break
  }

  // Also check for any WelcomeModal/dialog
  const dialogsBefore = await page.locator('[role="dialog"]').count()
  console.log(`  Dialogs before click: ${dialogsBefore}`)
  if (dialogsBefore > 0) {
    // Close any dialogs
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
  }

  const nextBtn = page.locator('button', { hasText: 'Next: Add Courses' })
  const nextCount = await nextBtn.count()
  console.log(`  "Next: Add Courses" button count: ${nextCount}`)

  if (nextCount > 0) {
    // Scroll button into view and take screenshot to verify it's not covered
    await nextBtn.first().scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    await screenshot(page, 'before-next-click')

    const btnBbox = await nextBtn.first().boundingBox()
    console.log(`  Button bbox: ${JSON.stringify(btnBbox)}`)

    // Check what element is actually AT the button center
    if (btnBbox) {
      const cx = btnBbox.x + btnBbox.width / 2
      const cy = btnBbox.y + btnBbox.height / 2
      const elemAtCenter = await page.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y)
        if (!el) return 'null'
        const btn = el.closest('button')
        return btn ? `BUTTON text="${btn.textContent?.trim().slice(0,30)}"` : `${el.tagName} class="${el.className?.slice(0,50)}"`
      }, [cx, cy])
      console.log(`  Element at center (${cx.toFixed(0)},${cy.toFixed(0)}): ${elemAtCenter}`)
    }

    // Check React keys (including non-enumerable) and React version
    const reactDebugInfo = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Next: Add Courses')
      if (!btn) return 'button not found'
      // Check all own property names including non-enumerable
      const allOwn = Object.getOwnPropertyNames(btn)
      const reactOwn = allOwn.filter(k => k.includes('react') || k.includes('React') || k.includes('fiber') || k.includes('Fiber'))
      // Also try the input
      const input = document.querySelector('input[placeholder*="Summer BBQ"]')
      const inputOwn = input ? Object.getOwnPropertyNames(input).filter(k => k.includes('react') || k.includes('fiber')) : []
      // Try to get React version
      const version = window.React?.version || 'unknown'
      return `btn react props: [${reactOwn.join(',')}] | input react props: [${inputOwn.join(',')}] | React version: ${version}`
    })
    console.log(`  React debug: ${reactDebugInfo}`)

    // Click using the actual center coordinates via mouse
    if (btnBbox) {
      const cx = btnBbox.x + btnBbox.width / 2
      const cy = btnBbox.y + btnBbox.height / 2
      await page.mouse.click(cx, cy)
      console.log(`  Clicked Next (mouse at ${cx.toFixed(0)},${cy.toFixed(0)})`)
    } else {
      await nextBtn.first().click()
      console.log('  Clicked Next (locator.click)')
    }

    // Wait up to 30s for step to change
    let step2Found = false
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(5000)
      step2Found = await page.locator('text=Add Your Courses').isVisible().catch(() => false)
      const h2s = await page.locator('h2, h3').allTextContents().catch(() => [])
      const errText = await page.locator('[role="alert"]').first().textContent().catch(() => '')
      console.log(`  After ${(i+1)*5}s: step2=${step2Found} headings="${h2s.slice(0,3).join('|')}" error="${errText.trim()}"`)
      if (step2Found) break
    }

    if (!step2Found) {
      // Last resort: use keyboard Tab to reach button and press Enter
      console.log('  Trying keyboard Tab+Enter approach...')
      await page.keyboard.press('Tab')
      await page.waitForTimeout(200)
      // Check what's focused
      const focusedEl = await page.evaluate(() => {
        const el = document.activeElement
        return el ? `${el.tagName} text="${el.textContent?.trim().slice(0,30)}"` : 'none'
      })
      console.log(`  Focused element: ${focusedEl}`)
      // Keep tabbing until we find the Next button
      for (let t = 0; t < 20; t++) {
        const isFocused = await page.evaluate(() => {
          const el = document.activeElement
          return el?.textContent?.trim() === 'Next: Add Courses'
        })
        if (isFocused) {
          console.log('  "Next: Add Courses" has focus - pressing Enter')
          await page.keyboard.press('Enter')
          break
        }
        await page.keyboard.press('Tab')
        await page.waitForTimeout(100)
      }
      await page.waitForTimeout(3000)
      step2Found = await page.locator('text=Add Your Courses').isVisible().catch(() => false)
      console.log(`  After Tab+Enter: step2=${step2Found}`)
    }
  } else {
    const btns = await page.locator('button').allTextContents()
    console.log(`  Buttons on page: ${btns.slice(0, 20).join(' | ')}`)
  }

  await screenshot(page, 'menus-new-step2')
  const step2Visible = await page.locator('text=Add Your Courses').first().isVisible({ timeout: 2000 }).catch(() => false)
  console.log(`  "Add Your Courses" visible: ${step2Visible}`)

  // ─── Step 6: Fill Courses ─────────────────────────────────────────────────────
  console.log('\n=== STEP 6: Fill in courses ===')

  if (step2Visible) {
    const courseLabels = page.locator('input[list^="course-labels-"]')
    const dishInputs = page.locator('input[placeholder*="Duck Breast"]')
    const descInputs = page.locator('input[placeholder*="Brief description"]')

    const labelCnt = await courseLabels.count()
    const dishCnt = await dishInputs.count()
    console.log(`  ${labelCnt} course label inputs, ${dishCnt} dish inputs`)

    if (labelCnt > 0) {
      await courseLabels.first().fill('First Course')
    }
    if (dishCnt > 0) {
      await dishInputs.first().fill('Roasted Beet Salad')
    }
    if (await descInputs.count() > 0) {
      await descInputs.first().fill('Golden beets with goat cheese')
    }
    console.log('  Filled course 1')

    // Add second course
    const addBtn = page.locator('button', { hasText: '+ Add Course' })
    if (await addBtn.count() > 0) {
      await addBtn.first().click()
      await page.waitForTimeout(400)

      const labelsAfter = page.locator('input[list^="course-labels-"]')
      if (await labelsAfter.count() >= 2) {
        await labelsAfter.nth(1).fill('Main Course')
      }
      const dishesAfter = page.locator('input[placeholder*="Duck Breast"]')
      if (await dishesAfter.count() >= 2) {
        await dishesAfter.nth(1).fill('Pan-Seared Salmon')
      }
      const descsAfter = page.locator('input[placeholder*="Brief description"]')
      if (await descsAfter.count() >= 2) {
        await descsAfter.nth(1).fill('With lemon caper butter sauce')
      }
      console.log('  Filled course 2')
    }
  } else {
    console.log('  Skipping course fill (step 2 not visible)')
  }

  await screenshot(page, 'menus-new-step2-filled')

  // ─── Step 7: Submit ──────────────────────────────────────────────────────────
  console.log('\n=== STEP 7: Submit form ===')
  const submitBtn = page.locator('button').filter({ hasText: /Create Menu/ })
  const submitCnt = await submitBtn.count()
  console.log(`  Submit button count: ${submitCnt}`)

  let menuCreated = false
  if (submitCnt > 0) {
    const btnText = await submitBtn.first().textContent()
    console.log(`  Button text: "${btnText}"`)
    await submitBtn.first().click()
    console.log('  Clicked submit - waiting for breakdown panel...')

    for (let i = 0; i < 24; i++) {
      await page.waitForTimeout(5000)
      menuCreated = await page.locator('text=Menu Created').first().isVisible().catch(() => false)
      if (menuCreated) {
        console.log(`  Breakdown panel appeared after ~${(i + 1) * 5}s`)
        break
      }
      const errText = await page.locator('[role="alert"]').first().textContent().catch(() => '').then(t => t.trim())
      if (errText) {
        console.log(`  Alert after ${(i + 1) * 5}s: "${errText}"`)
        break
      }
      const stillCreating = await page.locator('button', { hasText: 'Creating...' }).first().isVisible().catch(() => false)
      console.log(`  Still waiting... ${(i + 1) * 5}s (still creating: ${stillCreating})`)
    }
  } else {
    console.log('  No submit button - still on step 1 or wizard did not advance')
  }

  await screenshot(page, 'menus-post-submit')
  await screenshot(page, 'menus-breakdown')
  console.log(`  "Menu Created" visible: ${menuCreated}`)

  // ─── Step 8: Verify in list ──────────────────────────────────────────────────
  console.log('\n=== STEP 8: Check menus list ===')
  await goto(page, `${BASE_URL}/menus`)
  await screenshot(page, 'menus-list-final')

  const newMenuVisible = await page.locator('text=Agent Test Menu - March 2026').first().isVisible({ timeout: 10000 }).catch(() => false)
  console.log(`  New menu in list: ${newMenuVisible}`)

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n=== Console Errors ===')
  if (consoleErrors.length === 0) {
    console.log('  None')
  } else {
    consoleErrors.slice(0, 5).forEach(e => console.log(`  ERROR: ${e.slice(0, 200)}`))
  }

  console.log('\n=== Console Warnings ===')
  const hydrationWarnings = consoleWarnings.filter(w => w.includes('hydrat') || w.includes('Hydrat') || w.includes('client render'))
  if (hydrationWarnings.length === 0) {
    console.log(`  No hydration warnings (${consoleWarnings.length} total warnings)`)
    consoleWarnings.slice(0, 3).forEach(w => console.log(`  WARN: ${w.slice(0, 200)}`))
  } else {
    hydrationWarnings.forEach(w => console.log(`  HYDRATION: ${w.slice(0, 200)}`))
  }

  console.log('\n=== Failed Requests ===')
  if (failedRequests.length === 0) {
    console.log('  None')
  } else {
    failedRequests.forEach(r => console.log(`  FAIL: ${r}`))
  }

  await browser.close()

  console.log('\n=== FINAL SUMMARY ===')
  console.log(`  Auth sign-in: OK`)
  console.log(`  /menus page loaded: ${onMenusPage}`)
  console.log(`  Step 1 (Menu Details): ${step1Visible}`)
  console.log(`  Step 2 (Add Courses): ${step2Visible}`)
  console.log(`  Breakdown panel shown: ${menuCreated}`)
  console.log(`  Menu appears in list: ${newMenuVisible}`)
  console.log(`  Console errors: ${consoleErrors.length}`)
  console.log(`  Screenshots: ${SCREENSHOTS_DIR}`)

  if (!menuCreated || !newMenuVisible) {
    console.log('\n  RESULT: FAIL')
    process.exit(1)
  }
  console.log('\n  RESULT: PASS')
}

let onMenusPage = false
let step1Visible = false
let step2Visible = false
let menuCreated = false
let newMenuVisible = false

main().catch(err => {
  console.error('\nFatal error:', err.message || err)
  process.exit(1)
})
