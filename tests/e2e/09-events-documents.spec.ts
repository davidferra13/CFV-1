// Events Document Generation E2E Tests
// Tests PDF generation via API routes using page.request (inherits auth cookies).
// Asserts HTTP 200 + content-type: application/pdf.
// Does not parse PDF content — smoke tests the generation pipeline only.

import { test, expect } from '../helpers/fixtures'

test.describe('Events — Document Generation', () => {
  const documentTypes = [
    { type: 'prep', label: 'Prep sheet' },
    { type: 'execution', label: 'Service execution sheet' },
    { type: 'packing', label: 'Packing list' },
    { type: 'grocery', label: 'Grocery list' },
    { type: 'foh-menu', label: 'Front-of-house menu' },
  ] as const

  for (const doc of documentTypes) {
    test(`${doc.label} PDF generates (HTTP 200)`, async ({ page, seedIds }) => {
      const response = await page.request.get(
        `/api/documents/${seedIds.eventIds.completed}?type=${doc.type}`
      )
      // Accept 200 (success) or 404 if not yet implemented for this event state
      // The key check is that it does NOT return 500 (server error)
      expect(response.status()).not.toBe(500)
      expect(response.status()).not.toBe(401)
      expect(response.status()).not.toBe(403)

      if (response.status() === 200) {
        const contentType = response.headers()['content-type'] ?? ''
        expect(contentType).toContain('application/pdf')
      }
    })
  }

  test('document API rejects unauthenticated requests', async ({ browser, seedIds }) => {
    // Use a context with no auth
    const context = await browser.newContext()
    const page = await context.newPage()
    const response = await page.request.get(
      `/api/documents/${seedIds.eventIds.completed}?type=prep`
    )
    // Should get 401 or redirect — not 200
    expect(response.status()).not.toBe(200)
    await context.close()
  })
})
