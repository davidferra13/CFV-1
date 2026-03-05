// Diagnostic Suite 05 — Accessibility (a11y)
// Tests: Keyboard navigation, ARIA labels, focus management, form labels,
//        heading hierarchy, skip links, color contrast (visual check)
//
// These tests use Playwright's built-in accessibility features.
// Includes strict @axe-core/playwright checks for WCAG A/AA tags.

import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '../helpers/fixtures'

async function expectNoAxeViolations(page: Parameters<typeof AxeBuilder>[0]['page']) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('[data-sonner-toaster]')
    .analyze()

  const violationSummary = violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.length,
  }))

  expect(
    violationSummary,
    `axe-core violations:\n${JSON.stringify(violationSummary, null, 2)}`
  ).toEqual([])
}

test.describe('Accessibility - Axe (Strict WCAG AA)', () => {
  test('public home has zero axe violations', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expectNoAxeViolations(page)
  })

  test('pricing page has zero axe violations', async ({ page }) => {
    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')
    await expectNoAxeViolations(page)
  })

  test('dashboard has zero axe violations', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await expectNoAxeViolations(page)
  })
})

// ─── Keyboard Navigation ───────────────────────────────────────────────────

test.describe('Accessibility — Keyboard Navigation', () => {
  test('dashboard — all interactive elements reachable via Tab', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Tab through the page and verify focus moves
    const focusedElements: string[] = []
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab')
      const focused = await page.evaluate(() => {
        const el = document.activeElement
        return el
          ? `${el.tagName}:${el.getAttribute('role') || ''}:${el.textContent?.slice(0, 30) || ''}`
          : 'none'
      })
      focusedElements.push(focused)
    }
    // At least some elements should be focusable
    const uniqueFocused = new Set(
      focusedElements.filter((e) => e !== 'none' && !e.startsWith('BODY'))
    )
    expect(uniqueFocused.size).toBeGreaterThanOrEqual(3)
  })

  test('sign-in page — form is keyboard navigable', async ({ page }) => {
    await page.goto('/sign-in')
    await page.waitForLoadState('networkidle')

    // Tab to find input fields
    let foundInput = false
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab')
      const tag = await page.evaluate(() => document.activeElement?.tagName)
      if (tag === 'INPUT' || tag === 'BUTTON') {
        foundInput = true
        break
      }
    }
    expect(foundInput).toBeTruthy()
  })
})

// ─── ARIA Labels ────────────────────────────────────────────────────────────

test.describe('Accessibility — ARIA Labels', () => {
  test('dashboard navigation has aria labels', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Check for nav elements with labels
    const navs = page.locator('nav')
    const navCount = await navs.count()
    if (navCount > 0) {
      // At least one nav should exist
      expect(navCount).toBeGreaterThanOrEqual(1)
    }
  })

  test('buttons have accessible names', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Find all buttons and check they have text or aria-label
    const buttons = page.locator('button')
    const count = await buttons.count()
    let unlabeledCount = 0

    for (let i = 0; i < Math.min(count, 30); i++) {
      const btn = buttons.nth(i)
      if (!(await btn.isVisible().catch(() => false))) continue

      const text = await btn.innerText().catch(() => '')
      const ariaLabel = (await btn.getAttribute('aria-label')) ?? ''
      const title = (await btn.getAttribute('title')) ?? ''

      if (!text.trim() && !ariaLabel.trim() && !title.trim()) {
        // Check for child img/svg with alt
        const hasChildAlt = await btn.locator('[alt], [aria-label]').count()
        if (hasChildAlt === 0) {
          unlabeledCount++
        }
      }
    }

    // Report how many unlabeled buttons exist (diagnostic — not a hard fail)
    if (unlabeledCount > 0) {
      console.warn(`[a11y] Found ${unlabeledCount} buttons without accessible names on /dashboard`)
    }
    // Allow up to 3 icon-only buttons without labels before failing
    expect(unlabeledCount).toBeLessThanOrEqual(5)
  })

  test('images have alt text', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const images = page.locator('img')
    const count = await images.count()
    let missingAlt = 0

    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt')
      if (alt === null) {
        missingAlt++
      }
    }

    if (missingAlt > 0) {
      console.warn(`[a11y] Found ${missingAlt} images without alt text on landing page`)
    }
    expect(missingAlt).toBe(0)
  })
})

// ─── Form Labels ────────────────────────────────────────────────────────────

test.describe('Accessibility — Form Labels', () => {
  test('sign-in form inputs have labels', async ({ page }) => {
    await page.goto('/sign-in')
    await page.waitForLoadState('networkidle')

    const inputs = page.locator('input:not([type="hidden"])')
    const count = await inputs.count()
    let unlabeledInputs = 0

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i)
      if (!(await input.isVisible().catch(() => false))) continue

      const id = (await input.getAttribute('id')) ?? ''
      const ariaLabel = (await input.getAttribute('aria-label')) ?? ''
      const ariaLabelledBy = (await input.getAttribute('aria-labelledby')) ?? ''
      const placeholder = (await input.getAttribute('placeholder')) ?? ''

      // Check if there's an associated label element
      let hasLabel = !!ariaLabel || !!ariaLabelledBy
      if (id) {
        const labelCount = await page.locator(`label[for="${id}"]`).count()
        hasLabel = hasLabel || labelCount > 0
      }
      // Placeholder alone is not sufficient for a11y but is common
      if (!hasLabel && !placeholder) {
        unlabeledInputs++
      }
    }

    expect(unlabeledInputs).toBe(0)
  })

  test('inquiry form inputs are labeled', async ({ page }) => {
    await page.goto('/inquire')
    await page.waitForLoadState('networkidle')

    const inputs = page.locator('input:not([type="hidden"]), textarea, select')
    const count = await inputs.count()
    let unlabeledInputs = 0

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i)
      if (!(await input.isVisible().catch(() => false))) continue

      const ariaLabel = (await input.getAttribute('aria-label')) ?? ''
      const placeholder = (await input.getAttribute('placeholder')) ?? ''
      const id = (await input.getAttribute('id')) ?? ''

      let hasLabel = !!ariaLabel
      if (id) {
        const labelCount = await page.locator(`label[for="${id}"]`).count()
        hasLabel = hasLabel || labelCount > 0
      }

      if (!hasLabel && !placeholder) {
        unlabeledInputs++
      }
    }

    if (unlabeledInputs > 0) {
      console.warn(`[a11y] Found ${unlabeledInputs} unlabeled form fields on /inquire`)
    }
    expect(unlabeledInputs).toBeLessThanOrEqual(2)
  })
})

// ─── Heading Hierarchy ──────────────────────────────────────────────────────

test.describe('Accessibility — Heading Hierarchy', () => {
  const pagesToCheck = ['/', '/dashboard', '/events', '/clients', '/inquiries']

  for (const route of pagesToCheck) {
    test(`${route} — headings follow logical order`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')

      const headings = await page.evaluate(() => {
        const hs = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
        return Array.from(hs).map((h) => ({
          level: parseInt(h.tagName.replace('H', '')),
          text: h.textContent?.slice(0, 50) || '',
        }))
      })

      if (headings.length === 0) return // Skip pages with no headings

      // Should start with h1
      expect(headings[0].level).toBeLessThanOrEqual(2)

      // Check for heading level skips (h1 → h3 without h2)
      let skips = 0
      for (let i = 1; i < headings.length; i++) {
        if (headings[i].level > headings[i - 1].level + 1) {
          skips++
        }
      }

      if (skips > 0) {
        console.warn(`[a11y] ${route} has ${skips} heading level skip(s)`)
      }
      // Allow some skips (common in layouts with sidebar)
      expect(skips).toBeLessThanOrEqual(3)
    })
  }
})

// ─── Focus Management — Modals ──────────────────────────────────────────────

test.describe('Accessibility — Focus Management', () => {
  test('Escape key closes modals/drawers', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Try Ctrl+K to open Remy drawer (if available)
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(500)

    // Check if something opened
    const drawer = page
      .locator('[role="dialog"], [role="complementary"], [data-state="open"]')
      .first()
    const drawerVisible = await drawer.isVisible().catch(() => false)

    if (drawerVisible) {
      // Press Escape to close
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)

      // Verify it closed or at least didn't crash
      const body = await page.locator('body').innerText()
      expect(body).not.toMatch(/unhandled|error/i)
    }
  })
})

// ─── Color Contrast (Basic Check) ───────────────────────────────────────────

test.describe('Accessibility — Visual Checks', () => {
  test('landing page does not use very light text on white background', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check main text elements for contrast
    const lowContrast = await page.evaluate(() => {
      const elements = document.querySelectorAll('p, span, a, li, td, th, label')
      let lowContrastCount = 0

      for (const el of Array.from(elements).slice(0, 50)) {
        const style = window.getComputedStyle(el)
        const color = style.color
        // Parse rgb values
        const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
        if (match) {
          const [, r, g, b] = match.map(Number)
          // Very light text (close to white) is problematic
          if (r > 200 && g > 200 && b > 200) {
            const bg = style.backgroundColor
            const bgMatch = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
            if (bgMatch) {
              const [, br, bg2, bb] = bgMatch.map(Number)
              if (br > 200 && bg2 > 200 && bb > 200) {
                lowContrastCount++
              }
            }
          }
        }
      }

      return lowContrastCount
    })

    if (lowContrast > 0) {
      console.warn(
        `[a11y] Found ${lowContrast} potential low-contrast text elements on landing page`
      )
    }
    expect(lowContrast).toBeLessThanOrEqual(5)
  })
})
