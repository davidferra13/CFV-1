import { expect, test } from '@playwright/test'

test.setTimeout(90_000)

test('homepage location search does not load Google Maps', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const locationInput = page.getByLabel('Location')
  await locationInput.fill('01832')
  await page.waitForTimeout(1000)

  const googleMapsScripts = await page.evaluate(() =>
    Array.from(document.scripts)
      .map((script) => script.src)
      .filter((src) => src.includes('maps.googleapis.com'))
  )

  expect(googleMapsScripts).toEqual([])

  await Promise.all([
    page.waitForURL(/\/chefs/, { waitUntil: 'domcontentloaded' }),
    page.getByRole('button', { name: /browse chefs/i }).click(),
  ])

  expect(new URL(page.url()).searchParams.get('location')).toBe('01832')
})
