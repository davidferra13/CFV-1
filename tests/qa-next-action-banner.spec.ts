import { test, expect } from '@playwright/test'
import { chromium } from '@playwright/test'

test('NextActionBanner - dashboard and inquiry detail', async ({ page }) => {
  const BASE = 'http://localhost:3100'

  // Sign in
  const resp = await page.request.post(`${BASE}/api/e2e/auth`, {
    data: { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' },
  })
  const data = await resp.json()
  console.log('Auth:', JSON.stringify(data).slice(0, 150))

  if (data.cookies) {
    await page.context().addCookies(data.cookies)
  }

  // Dashboard
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: 'test-results/qa-dashboard.png', fullPage: false })

  const dashText = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        'h1,h2,h3,h4,[class*="respond"],[class*="Respond"],[class*="next"],[class*="Next"],[class*="action"],[class*="Action"]'
      ),
    ]
      .slice(0, 30)
      .map((el) => el.textContent?.trim())
      .filter(Boolean)
  )
  console.log('Dashboard elements:', JSON.stringify(dashText))

  // Inquiries
  await page.goto(`${BASE}/inquiries`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  const firstLink = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href*="/inquiries/"]')]
    return links[0]?.getAttribute('href') || null
  })
  console.log('First inquiry link:', firstLink)

  if (firstLink) {
    await page.goto(`${BASE}${firstLink}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'test-results/qa-inquiry-detail.png', fullPage: false })

    const topEls = await page.evaluate(() =>
      [...document.querySelectorAll('main > *, main > div > *, main > div > div > *')]
        .slice(0, 15)
        .map((el) => ({
          tag: el.tagName,
          cls: el.className?.toString().slice(0, 80),
          text: el.textContent?.trim().slice(0, 100),
        }))
    )
    console.log('Inquiry detail top elements:', JSON.stringify(topEls, null, 2))
  }
})
