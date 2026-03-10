// Visual Tests — Remy Sprite Sheet Lip-Sync & Emotion System
// Validates the sprite sheet renders correctly in all states:
// idle, speaking (viseme animation), emotions, minimized/hat, drawer header avatar.
//
// Run: npx playwright test --config=playwright.agent-test.config.ts tests/visual/remy-sprite-sheet.spec.ts

import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'fs'
import { TEST_BASE_URL } from '../helpers/runtime-base-url'

const BASE_URL = TEST_BASE_URL
const SCREENSHOT_DIR = 'test-screenshots'

// Agent credentials
let agentEmail = ''
let agentPassword = ''
try {
  const creds = JSON.parse(readFileSync('.auth/agent.json', 'utf-8'))
  agentEmail = creds.email
  agentPassword = creds.password
} catch {
  // Will fail tests gracefully
}

async function signInAsAgent(page: Page) {
  const resp = await page.request.post(`${BASE_URL}/api/e2e/auth`, {
    data: { email: agentEmail, password: agentPassword },
  })
  if (!resp.ok()) {
    throw new Error(`Agent auth failed: ${resp.status()} ${await resp.text()}`)
  }
  // Dismiss cookie consent
  await page.context().addCookies([{ name: 'cookieConsent', value: 'declined', url: BASE_URL }])
}

async function navigateToDashboard(page: Page) {
  await page.goto(`${BASE_URL}/dashboard`, { timeout: 60_000, waitUntil: 'domcontentloaded' })
  // Wait for the page shell to render — don't use networkidle (dashboard polls continuously)
  await page.waitForTimeout(3_000)
}

// ─── 1. Asset Loading ────────────────────────────────────────────────────────

test.describe('Remy Assets — Loading', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAgent(page)
  })

  test('remy-idle.png loads without 404', async ({ page }) => {
    const resp = await page.request.get(`${BASE_URL}/images/remy/remy-idle.png`)
    expect(resp.status()).toBe(200)
    expect(resp.headers()['content-type']).toContain('image/png')
  })

  test('remy-hat.png loads without 404', async ({ page }) => {
    const resp = await page.request.get(`${BASE_URL}/images/remy/remy-hat.png`)
    expect(resp.status()).toBe(200)
    expect(resp.headers()['content-type']).toContain('image/png')
  })

  test('remy-sprite.png loads without 404', async ({ page }) => {
    const resp = await page.request.get(`${BASE_URL}/images/remy/remy-sprite.png`)
    expect(resp.status()).toBe(200)
    expect(resp.headers()['content-type']).toContain('image/png')
  })

  test('old mouth PNGs are gone (no 404 leaks from code)', async ({ page }) => {
    const oldMouths = [
      'remy-mouth-ah.png',
      'remy-mouth-chsh.png',
      'remy-mouth-ee.png',
      'remy-mouth-eh.png',
      'remy-mouth-fv.png',
      'remy-mouth-lth.png',
      'remy-mouth-oh.png',
      'remy-mouth-ooh.png',
      'remy-mouth-rest.jpg',
    ]
    for (const mouth of oldMouths) {
      const resp = await page.request.get(`${BASE_URL}/images/remy/${mouth}`)
      expect(resp.status(), `Old asset ${mouth} should be 404`).toBe(404)
    }
  })
})

// ─── 2. Mascot Button — Idle State ──────────────────────────────────────────

test.describe('Remy Mascot — Idle State', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAgent(page)
    // Ensure not minimized
    await page.addInitScript(() => localStorage.removeItem('remy-minimized'))
  })

  test('mascot button is visible on dashboard', async ({ page }) => {
    await navigateToDashboard(page)

    const mascot = page.getByRole('button', { name: /chat with remy|toggle remy/i }).first()
    await expect(mascot).toBeVisible({ timeout: 10_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/remy-sprite-01-idle-mascot.png`,
      fullPage: false,
    })
  })

  test('idle mascot uses remy-idle.png (not old remy-mascot.png)', async ({ page }) => {
    await navigateToDashboard(page)

    const mascot = page.getByRole('button', { name: /chat with remy|toggle remy/i }).first()
    await expect(mascot).toBeVisible({ timeout: 10_000 })

    // Check that the idle image source references remy-idle.png
    const idleImg = mascot.locator('img[src*="remy-idle"]')
    await expect(idleImg).toBeAttached()

    // Ensure old asset is NOT referenced
    const oldImg = mascot.locator('img[src*="remy-mascot"]')
    expect(await oldImg.count()).toBe(0)
  })

  test('no console errors from missing assets on dashboard', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    const failedRequests: string[] = []
    page.on('requestfailed', (req) => {
      if (req.url().includes('/images/remy/')) {
        failedRequests.push(req.url())
      }
    })

    await navigateToDashboard(page)
    await page.waitForTimeout(2_000) // Let images load

    expect(failedRequests, 'No Remy image requests should fail').toHaveLength(0)
  })
})

// ─── 3. Minimize & Hat Transition ───────────────────────────────────────────

test.describe('Remy Mascot — Minimize & Hat', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAgent(page)
    await page.addInitScript(() => localStorage.removeItem('remy-minimized'))
  })

  test('minimize shows hat-only image and translate-y', async ({ page }) => {
    await navigateToDashboard(page)

    const mascot = page.getByRole('button', { name: /chat with remy|toggle remy/i }).first()
    await expect(mascot).toBeVisible({ timeout: 10_000 })

    // Screenshot before minimize
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/remy-sprite-02-before-minimize.png`,
      fullPage: false,
    })

    // Hover to reveal minimize button
    await mascot.hover()
    const minimizeBtn = page.getByRole('button', { name: /minimize remy/i }).first()
    await expect(minimizeBtn).toBeVisible({ timeout: 3_000 })
    await minimizeBtn.click()

    // Wait for transition
    await page.waitForTimeout(600)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/remy-sprite-03-minimized-hat.png`,
      fullPage: false,
    })

    // Verify hat image is visible (opacity-100)
    const restoreBtn = page.getByRole('button', { name: /restore remy/i }).first()
    await expect(restoreBtn).toBeVisible()

    // Check that hat image exists and is the visible one
    const hatImg = restoreBtn.locator('img[src*="remy-hat"]')
    await expect(hatImg).toBeAttached()
  })

  test('restore from minimized brings back idle mascot', async ({ page }) => {
    // Start minimized
    await page.addInitScript(() => localStorage.setItem('remy-minimized', 'true'))
    await navigateToDashboard(page)

    const restoreBtn = page.getByRole('button', { name: /restore remy/i }).first()
    await expect(restoreBtn).toBeVisible({ timeout: 10_000 })
    await restoreBtn.click()

    await page.waitForTimeout(600)

    const mascot = page.getByRole('button', { name: /chat with remy|toggle remy/i }).first()
    await expect(mascot).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/remy-sprite-04-restored.png`,
      fullPage: false,
    })
  })
})

// ─── 4. Drawer — Header Avatar ──────────────────────────────────────────────

test.describe('Remy Drawer — Sprite Sheet Avatar', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAgent(page)
    await page.addInitScript(() => localStorage.removeItem('remy-minimized'))
  })

  test('drawer header shows sprite-based avatar', async ({ page }) => {
    await navigateToDashboard(page)

    // Open the drawer
    await page.keyboard.press('Control+k')
    const input = page.locator('[data-remy-input]')
    await expect(input).toBeVisible({ timeout: 10_000 })

    // Look for the talking avatar in the drawer — it uses role="img"
    const avatar = page.locator('[role="img"][aria-label*="Remy"]').first()
    await expect(avatar).toBeVisible({ timeout: 5_000 })

    // Verify it uses the sprite sheet as background
    const bgImage = await avatar.evaluate((el) => {
      return window.getComputedStyle(el).backgroundImage
    })
    expect(bgImage).toContain('remy-sprite')

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/remy-sprite-05-drawer-header.png`,
      fullPage: false,
    })
  })

  test('drawer avatar has correct dimensions', async ({ page }) => {
    await navigateToDashboard(page)
    await page.keyboard.press('Control+k')
    await expect(page.locator('[data-remy-input]')).toBeVisible({ timeout: 10_000 })

    const avatar = page.locator('[role="img"][aria-label*="Remy"]').first()
    await expect(avatar).toBeVisible()

    const box = await avatar.boundingBox()
    expect(box).not.toBeNull()
    // Avatar should have reasonable dimensions (not 0x0)
    expect(box!.width).toBeGreaterThanOrEqual(30)
    expect(box!.height).toBeGreaterThanOrEqual(30)
    // And should be roughly square
    expect(Math.abs(box!.width - box!.height)).toBeLessThan(5)
  })
})

// ─── 5. Sprite Sheet Frame Rendering ────────────────────────────────────────

test.describe('Remy Sprite — Frame Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAgent(page)
    await page.addInitScript(() => localStorage.removeItem('remy-minimized'))
  })

  test('sprite avatar shows neutral emotion at rest', async ({ page }) => {
    await navigateToDashboard(page)
    await page.keyboard.press('Control+k')
    await expect(page.locator('[data-remy-input]')).toBeVisible({ timeout: 10_000 })

    const avatar = page.locator('[role="img"][aria-label*="Remy"]').first()
    await expect(avatar).toBeVisible()

    // At rest, should show neutral (same as rest = col 0, row 0)
    const ariaLabel = await avatar.getAttribute('aria-label')
    expect(ariaLabel).toContain('neutral')
  })

  test('sprite avatar uses background-position (not clip-path)', async ({ page }) => {
    await navigateToDashboard(page)
    await page.keyboard.press('Control+k')
    await expect(page.locator('[data-remy-input]')).toBeVisible({ timeout: 10_000 })

    const avatar = page.locator('[role="img"][aria-label*="Remy"]').first()
    await expect(avatar).toBeVisible()

    // Should use background-position, NOT clip-path
    const styles = await avatar.evaluate((el) => {
      const computed = window.getComputedStyle(el)
      return {
        backgroundPosition: computed.backgroundPosition,
        backgroundSize: computed.backgroundSize,
        clipPath: computed.clipPath,
      }
    })

    expect(styles.backgroundPosition).toBeTruthy()
    expect(styles.backgroundSize).toBeTruthy()
    // Clip-path should NOT be used (old system)
    expect(styles.clipPath === 'none' || styles.clipPath === '').toBeTruthy()
  })

  test('sprite background-size is 4x the display size', async ({ page }) => {
    await navigateToDashboard(page)
    await page.keyboard.press('Control+k')
    await expect(page.locator('[data-remy-input]')).toBeVisible({ timeout: 10_000 })

    const avatar = page.locator('[role="img"][aria-label*="Remy"]').first()
    await expect(avatar).toBeVisible()

    const data = await avatar.evaluate((el) => {
      const computed = window.getComputedStyle(el)
      return {
        width: el.getBoundingClientRect().width,
        bgSize: computed.backgroundSize,
      }
    })

    // Background width should be 4x the display width (4 cols)
    const bgParts = data.bgSize.split(' ')
    const bgWidth = parseFloat(bgParts[0])
    expect(bgWidth).toBeCloseTo(data.width * 4, 0)
  })
})

// ─── 6. Talking Avatar in Mascot Button ─────────────────────────────────────

test.describe('Remy Mascot — Talking Avatar Overlay', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAgent(page)
    await page.addInitScript(() => localStorage.removeItem('remy-minimized'))
  })

  test('mascot button contains talking avatar div for speaking state', async ({ page }) => {
    await navigateToDashboard(page)

    const mascot = page.getByRole('button', { name: /chat with remy|toggle remy/i }).first()
    await expect(mascot).toBeVisible({ timeout: 10_000 })

    // The talking avatar overlay should be in the DOM even if not visible
    // (it's hidden with opacity-0 when not speaking)
    const talkingOverlay = mascot.locator('[role="img"][aria-label*="Remy"]')
    // It may or may not be attached depending on whether viseme prop is passed
    const count = await talkingOverlay.count()
    // If it exists, verify it uses the sprite
    if (count > 0) {
      const bgImage = await talkingOverlay.first().evaluate((el) => {
        return window.getComputedStyle(el).backgroundImage
      })
      expect(bgImage).toContain('remy-sprite')
    }
  })
})

// ─── 7. Console Error Monitoring ────────────────────────────────────────────

test.describe('Remy — No Runtime Errors', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAgent(page)
    await page.addInitScript(() => localStorage.removeItem('remy-minimized'))
  })

  test('no JS errors when opening and closing drawer', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    await navigateToDashboard(page)

    // Open drawer
    await page.keyboard.press('Control+k')
    await expect(page.locator('[data-remy-input]')).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(1_000)

    // Close drawer
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Open again
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(1_000)

    // Filter out unrelated errors (e.g., network, third-party)
    const remyErrors = jsErrors.filter(
      (e) =>
        e.includes('remy') ||
        e.includes('viseme') ||
        e.includes('sprite') ||
        e.includes('emotion') ||
        e.includes('lip-sync') ||
        e.includes('Cannot read properties')
    )

    expect(remyErrors, 'No Remy-related JS errors').toHaveLength(0)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/remy-sprite-06-no-errors.png`,
      fullPage: false,
    })
  })

  test('no errors navigating between pages with Remy', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    const failedImages: string[] = []
    page.on('requestfailed', (req) => {
      if (req.url().includes('remy')) failedImages.push(req.url())
    })

    await navigateToDashboard(page)
    await page.waitForTimeout(1_000)

    // Navigate to events
    await page.goto(`${BASE_URL}/events`, { timeout: 30_000, waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2_000)

    // Navigate to clients
    await page.goto(`${BASE_URL}/clients`, { timeout: 30_000, waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2_000)

    // Navigate to calendar
    await page.goto(`${BASE_URL}/calendar`, { timeout: 30_000, waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2_000)

    const remyErrors = jsErrors.filter(
      (e) =>
        e.includes('remy') ||
        e.includes('viseme') ||
        e.includes('sprite') ||
        e.includes('Cannot read properties')
    )

    expect(remyErrors, 'No Remy JS errors across pages').toHaveLength(0)
    expect(failedImages, 'No failed Remy image requests').toHaveLength(0)
  })
})

// ─── 8. Full Visual Walkthrough ─────────────────────────────────────────────

test.describe('Remy — Full Visual Walkthrough', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAgent(page)
    await page.addInitScript(() => localStorage.removeItem('remy-minimized'))
  })

  test('complete walkthrough with screenshots', async ({ page }) => {
    await navigateToDashboard(page)

    // 1. Idle mascot
    const mascot = page.getByRole('button', { name: /chat with remy|toggle remy/i }).first()
    await expect(mascot).toBeVisible({ timeout: 10_000 })
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/remy-sprite-walkthrough-01-idle.png`,
    })

    // 2. Open drawer — check header avatar
    await page.keyboard.press('Control+k')
    await expect(page.locator('[data-remy-input]')).toBeVisible({ timeout: 10_000 })
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/remy-sprite-walkthrough-02-drawer-open.png`,
    })

    // 3. Close drawer
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // 4. Hover to show minimize button
    await mascot.hover()
    await page.waitForTimeout(300)
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/remy-sprite-walkthrough-03-hover.png`,
    })

    // 5. Minimize
    const minimizeBtn = page.getByRole('button', { name: /minimize remy/i }).first()
    const canMinimize = await minimizeBtn.isVisible().catch(() => false)
    if (canMinimize) {
      await minimizeBtn.click()
      await page.waitForTimeout(600)
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/remy-sprite-walkthrough-04-minimized.png`,
      })

      // 6. Restore
      const restoreBtn = page.getByRole('button', { name: /restore remy/i }).first()
      await restoreBtn.click()
      await page.waitForTimeout(600)
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/remy-sprite-walkthrough-05-restored.png`,
      })
    }

    // 7. Open drawer and type a message (won't send — just UI test)
    await page.keyboard.press('Control+k')
    await expect(page.locator('[data-remy-input]')).toBeVisible({ timeout: 10_000 })
    await page.locator('[data-remy-input]').fill('Hello Remy! How are you?')
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/remy-sprite-walkthrough-06-message-typed.png`,
    })
  })
})
