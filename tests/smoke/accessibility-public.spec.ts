import AxeBuilder from '@axe-core/playwright'
import { test, expect, type Page } from '@playwright/test'

const PUBLIC_ROUTES = ['/', '/pricing', '/client-relationships', '/sign-in']

async function expectNoSeriousAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('[data-sonner-toaster]')
    .analyze()

  const seriousViolations = violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.length,
      help: violation.help,
    }))

  expect(
    seriousViolations,
    `serious/critical axe violations:\n${JSON.stringify(seriousViolations, null, 2)}`
  ).toEqual([])
}

async function expectNoNestedInteractiveElements(page: Page) {
  const invalidNodes = await page.evaluate(() => {
    const selectors = ['a button', 'button a']
    const issues: string[] = []

    for (const selector of selectors) {
      const nodes = document.querySelectorAll(selector)
      for (const node of Array.from(nodes).slice(0, 5)) {
        const html = node.outerHTML.replace(/\s+/g, ' ').slice(0, 180)
        issues.push(`${selector}: ${html}`)
      }
    }

    return issues
  })

  expect(
    invalidNodes,
    `nested interactive elements found:\n${JSON.stringify(invalidNodes, null, 2)}`
  ).toEqual([])
}

test.describe('Smoke Accessibility - Public Routes', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} has no serious a11y violations`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'load', timeout: 60_000 })
      await expect(page.locator('body')).toBeVisible()
      await expectNoSeriousAxeViolations(page)
      await expectNoNestedInteractiveElements(page)
    })
  }
})
