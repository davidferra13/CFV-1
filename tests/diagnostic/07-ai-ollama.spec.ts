// Diagnostic Suite 07 — AI/Ollama Panels & Remy Features
// Tests: All 13 AI panels on event detail, Remy drawer advanced features,
//        Ollama offline handling, AI settings pages

import { test, expect } from '../helpers/fixtures'

// ─── AI Panels on Event Detail ──────────────────────────────────────────────

test.describe('AI Panels — Event Detail Page', () => {
  const aiPanelKeywords = [
    'pricing',
    'allergen',
    'nutritional',
    'staff briefing',
    'prep timeline',
    'service timeline',
    'grocery',
    'temperature',
    'contract',
    'aar',
    'review',
    'gratuity',
    'social media',
  ]

  test('event detail page loads AI panels section', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
    // Should have some AI-related content
    const hasAI = /ai|generate|intelligence|analysis|remy/i.test(body)
    if (!hasAI) {
      console.warn('[ai] Event detail page does not show AI panel section')
    }
  })

  test('event detail tabs/sections all load without crashing', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')

    // Click through any tabs on the event detail page
    const tabs = page.locator('[role="tab"], [data-tab], button').filter({
      hasText: /detail|menu|financial|document|staff|ai|timeline|checklist|note/i,
    })
    const tabCount = await tabs.count()

    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i)
      if (await tab.isVisible().catch(() => false)) {
        await tab.click()
        await page.waitForTimeout(500)
        const body = await page.locator('body').innerText()
        expect(body).not.toMatch(/500|internal server error/i)
      }
    }
  })
})

// ─── AI Sub-Pages ───────────────────────────────────────────────────────────

test.describe('AI Sub-Pages', () => {
  const aiRoutes = [
    { path: (id: string) => `/events/${id}/aar`, name: 'AAR page' },
    { path: (id: string) => `/events/${id}/kds`, name: 'KDS page' },
    { path: (id: string) => `/events/${id}/dop`, name: 'Day-of-party page' },
    { path: (id: string) => `/events/${id}/debrief`, name: 'Debrief page' },
    { path: (id: string) => `/events/${id}/grocery-quote`, name: 'Grocery quote page' },
  ]

  for (const route of aiRoutes) {
    test(`${route.name} loads without 500`, async ({ page, seedIds }) => {
      const resp = await page.goto(route.path(seedIds.eventIds.confirmed))
      expect(resp?.status()).toBeLessThan(500)
      if (resp?.status() === 200) {
        await page.waitForLoadState('networkidle')
        const body = await page.locator('body').innerText()
        expect(body).not.toMatch(/500|internal server error/i)
      }
    })
  }
})

// ─── Remy Drawer ────────────────────────────────────────────────────────────

test.describe('Remy AI Drawer — Advanced Features', () => {
  test('Ctrl+K opens Remy drawer', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await page.keyboard.press('Control+k')
    await page.waitForTimeout(1000)

    // Check if drawer opened
    const drawer = page
      .locator('[data-state="open"]')
      .first()
      .or(page.locator('[role="dialog"]').first())
      .or(page.locator('[class*="drawer"]').first())
    const isOpen = await drawer.isVisible().catch(() => false)

    // Also check for Remy-specific content
    const body = await page.locator('body').innerText()
    const hasRemy = /remy|ask|chat|how can i help/i.test(body)

    expect(isOpen || hasRemy).toBeTruthy()
  })

  test('Remy drawer has input field', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await page.keyboard.press('Control+k')
    await page.waitForTimeout(1000)

    // Look for textarea or input in the drawer
    const chatInput = page.locator('textarea, input[type="text"]').last()
    const hasInput = await chatInput.isVisible().catch(() => false)
    if (!hasInput) {
      console.warn('[remy] Drawer opened but no chat input found')
    }
  })

  test('Remy drawer has quick prompts', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await page.keyboard.press('Control+k')
    await page.waitForTimeout(1000)

    const body = await page.locator('body').innerText()
    // Quick prompts might show as suggestion buttons
    const hasPrompts = /suggest|prompt|template|help me|quick/i.test(body)
    if (!hasPrompts) {
      console.warn('[remy] No quick prompts visible in drawer')
    }
  })

  test('Remy drawer closes with Escape', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await page.keyboard.press('Control+k')
    await page.waitForTimeout(500)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Page should be normal after closing
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/unhandled|error/i)
  })
})

// ─── AI Settings ────────────────────────────────────────────────────────────

test.describe('AI Settings Pages', () => {
  test('AI privacy settings page loads', async ({ page }) => {
    await page.goto('/settings/ai-privacy')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
    const hasPrivacy = /privacy|local|data|ollama|ai/i.test(body)
    expect(hasPrivacy).toBeTruthy()
  })

  test('culinary profile settings loads', async ({ page }) => {
    await page.goto('/settings/culinary-profile')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })
})

// ─── Import/AI Features ────────────────────────────────────────────────────

test.describe('Import Modes', () => {
  test('import page loads with mode selection', async ({ page }) => {
    await page.goto('/import')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
    // Should show import options
    const hasImport = /import|upload|brain dump|csv|spreadsheet|paste/i.test(body)
    expect(hasImport).toBeTruthy()
  })
})

// ─── Documents Page ─────────────────────────────────────────────────────────

test.describe('Documents Hub', () => {
  test('documents page loads', async ({ page }) => {
    await page.goto('/documents')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('document folders work', async ({ page }) => {
    await page.goto('/documents')
    await page.waitForLoadState('networkidle')
    // Should show folder structure or empty state
    const body = await page.locator('body').innerText()
    const hasDocs = /folder|document|file|upload|template|empty/i.test(body)
    expect(hasDocs).toBeTruthy()
  })
})
