import { test, expect } from '../helpers/fixtures'

const BASE_URL = 'http://localhost:3100'

test.describe('Client RLS Negative', () => {
  test.setTimeout(90_000)

  test('client cannot access another tenant event routes or documents', async ({
    browser,
    seedIds,
  }) => {
    const clientContext = await browser.newContext({
      baseURL: BASE_URL,
      storageState: '.auth/client.json',
    })
    const page = await clientContext.newPage()

    try {
      await page.goto('/my-events')
      await expect(page.getByText(/chef b private dinner/i)).toHaveCount(0)

      await page.goto(`/my-events/${seedIds.chefBEventId}`)
      const currentUrl = page.url()
      const blocked =
        !currentUrl.includes(seedIds.chefBEventId) ||
        (await page
          .getByText(/404|page not found|not found|doesn't exist/i)
          .first()
          .isVisible()
          .catch(() => false))
      expect(blocked).toBeTruthy()

      const invoiceResp = await page.request.get(
        `/api/documents/invoice-pdf/${seedIds.chefBEventId}`
      )
      expect(invoiceResp.status()).not.toBe(200)
      expect(invoiceResp.status()).toBeLessThan(500)

      const fohResp = await page.request.get(`/api/documents/foh-menu/${seedIds.chefBEventId}`)
      expect(fohResp.status()).not.toBe(200)
      expect(fohResp.status()).toBeLessThan(500)
    } finally {
      await clientContext.close()
    }
  })
})
