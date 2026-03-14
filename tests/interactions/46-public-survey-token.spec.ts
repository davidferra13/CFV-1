import { test, expect } from '../helpers/fixtures'

test.describe('Public Survey Token', () => {
  test('invalid survey token does not 500', async ({ page }) => {
    const resp = await page.goto('/survey/not-a-real-survey-token')
    await page.waitForLoadState('networkidle')

    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
    expect(status).toBeLessThan(500)
  })

  test('invalid survey token stays public', async ({ page }) => {
    await page.goto('/survey/not-a-real-survey-token')
    await page.waitForLoadState('networkidle')

    expect(page.url()).not.toMatch(/auth\/signin|login/i)
  })

  test('invalid survey token has no page errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/survey/not-a-real-survey-token')
    await page.waitForLoadState('networkidle')

    expect(errors).toHaveLength(0)
  })
})
