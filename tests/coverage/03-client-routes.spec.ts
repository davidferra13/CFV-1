// Coverage Layer â€” Client Portal Routes
// Visits every client-portal URL authenticated as the E2E test client (Alice).
// Asserts: page loads, no crash, no JS error, has content.
// Also verifies chef-portal routes correctly reject the client session.
//
// Run: npm run test:coverage:client

import { test, expect } from '../helpers/fixtures'

async function gotoClientPage(
  page: Parameters<Parameters<typeof test>[1]>[0]['page'],
  url: string
) {
  let lastResponse: Awaited<ReturnType<typeof page.goto>> = null
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      lastResponse = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 })
      const status = lastResponse?.status() ?? 0
      if (status >= 500 && attempt < 2) {
        await page.waitForTimeout(400)
        continue
      }
      const redirectedToSignIn = /auth\/signin/i.test(page.url())
      if (redirectedToSignIn && attempt < 2) {
        await page.waitForTimeout(400)
        continue
      }
      return lastResponse
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const retryable = /ERR_ABORTED|ERR_CONNECTION|timeout|frame was detached/i.test(message)
      if (!retryable || attempt === 2) throw error
      await page.waitForTimeout(400)
    }
  }
  return lastResponse
}

// â”€â”€â”€ Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function assertClientPageLoads(
  page: Parameters<Parameters<typeof test>[1]>[0]['page'],
  url: string
) {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))

  const response = await gotoClientPage(page, url)
  const status = response?.status() ?? 0

  expect(status, `[client] ${url} returned HTTP ${status}`).toBeLessThan(500)
  expect(errors, `[client] ${url} had JS errors: ${errors.join('; ')}`).toHaveLength(0)

  const currentUrl = page.url()
  expect(currentUrl, `[client] ${url} redirected to login`).not.toMatch(/auth\/signin/)

  const bodyText = await page.locator('body').innerText()
  expect(bodyText.trim().length, `[client] ${url} rendered blank`).toBeGreaterThan(10)
}

// â”€â”€â”€ Core Client Pages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Client Portal â€” Core Pages', () => {
  test('/my-events â€” events list', async ({ page }) => {
    await assertClientPageLoads(page, '/my-events')
    await page.waitForLoadState('networkidle')
    // Should show some event content (seeded completed event is visible)
  })

  test('/my-events/history â€” past events', async ({ page }) => {
    await assertClientPageLoads(page, '/my-events/history')
  })

  test('/my-inquiries â€” inquiries list', async ({ page }) => {
    await assertClientPageLoads(page, '/my-inquiries')
  })

  test('/my-quotes â€” quotes list', async ({ page }) => {
    await assertClientPageLoads(page, '/my-quotes')
  })

  test('/my-profile â€” client profile', async ({ page }) => {
    await assertClientPageLoads(page, '/my-profile')
    await page.waitForLoadState('networkidle')
  })

  test('/my-chat â€” chat list', async ({ page }) => {
    await assertClientPageLoads(page, '/my-chat')
  })

  test('/my-rewards â€” loyalty rewards', async ({ page }) => {
    await assertClientPageLoads(page, '/my-rewards')
  })

  test('/book-now â€” browse chefs', async ({ page }) => {
    await assertClientPageLoads(page, '/book-now')
  })
})

// â”€â”€â”€ Client Event Detail Pages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Client Portal â€” Event Detail Pages', () => {
  test('/my-events/[completed] â€” completed event detail', async ({ page, seedIds }) => {
    await assertClientPageLoads(page, `/my-events/${seedIds.eventIds.completed}`)
  })

  test('/my-events/[confirmed] â€” confirmed event detail', async ({ page, seedIds }) => {
    // confirmed event is scoped to a different client (Dave), so this may redirect
    // We just verify no 500 crash
    const response = await page.goto(`/my-events/${seedIds.eventIds.confirmed}`, {
      waitUntil: 'domcontentloaded',
    })
    expect(response?.status() ?? 0).toBeLessThan(500)
  })

  test('/my-events/[completed]/invoice â€” invoice page', async ({ page, seedIds }) => {
    await assertClientPageLoads(page, `/my-events/${seedIds.eventIds.completed}/invoice`)
  })

  test('/my-events/[completed]/countdown â€” countdown page', async ({ page, seedIds }) => {
    // Countdown for a past event may redirect or show a different view
    const response = await page.goto(`/my-events/${seedIds.eventIds.completed}/countdown`, {
      waitUntil: 'domcontentloaded',
    })
    expect(response?.status() ?? 0).toBeLessThan(500)
  })
})

// â”€â”€â”€ Client Quote Pages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Client Portal â€” Quote Detail Pages', () => {
  test('/my-quotes/[sent] â€” sent quote detail', async ({ page, seedIds }) => {
    // The sent quote is for Bob (secondary), not Alice â€” may redirect
    const response = await page.goto(`/my-quotes/${seedIds.quoteIds.sent}`, {
      waitUntil: 'domcontentloaded',
    })
    expect(response?.status() ?? 0).toBeLessThan(500)
  })

  test('/my-quotes/[draft] â€” draft quote detail', async ({ page, seedIds }) => {
    await assertClientPageLoads(page, `/my-quotes/${seedIds.quoteIds.draft}`)
  })
})

// â”€â”€â”€ Client Inquiry Detail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Client Portal â€” Inquiry Detail Pages', () => {
  test('/my-inquiries/[awaitingChef] â€” inquiry detail', async ({ page, seedIds }) => {
    await assertClientPageLoads(page, `/my-inquiries/${seedIds.inquiryIds.awaitingChef}`)
  })
})

// â”€â”€â”€ Chef Portal Rejection (Client Role) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Client Portal â€” Chef Route Rejection', () => {
  test('/dashboard â€” client redirected away from chef dashboard', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    // Should redirect to client portal or unauthorized â€” not actually show chef dashboard
    const url = page.url()
    expect(url).not.toMatch(/\/dashboard$/)
  })

  test('/events â€” client redirected away from chef events', async ({ page }) => {
    await page.goto('/events', { waitUntil: 'domcontentloaded' })
    const url = page.url()
    expect(url).not.toMatch(/\/events$/)
  })

  test('/clients â€” client cannot access chef client list', async ({ page }) => {
    await page.goto('/clients', { waitUntil: 'domcontentloaded' })
    const url = page.url()
    expect(url).not.toMatch(/\/clients$/)
  })

  test('/financials â€” client cannot access chef financials', async ({ page }) => {
    await page.goto('/financials', { waitUntil: 'domcontentloaded' })
    const url = page.url()
    expect(url).not.toMatch(/\/financials$/)
  })
})

test.describe('Client Portal - Additional Route Coverage', () => {
  test('/my-cannabis - client cannabis page loads', async ({ page }) => {
    await assertClientPageLoads(page, '/my-cannabis')
  })

  test('/my-chat/[id] - conversation detail route is reachable', async ({ page }) => {
    await assertClientPageLoads(page, '/my-chat')

    const conversationLink = page.locator('a[href^="/my-chat/"]').first()
    if ((await conversationLink.count()) === 0) return

    const href = await conversationLink.getAttribute('href')
    if (!href) return

    const response = await page.goto(href, { waitUntil: 'domcontentloaded' })
    expect(response?.status() ?? 0).toBeLessThan(500)
  })

  test('/my-events/[id]/event-summary - completed event summary loads', async ({
    page,
    seedIds,
  }) => {
    const response = await page.goto(`/my-events/${seedIds.eventIds.completed}/event-summary`, {
      waitUntil: 'domcontentloaded',
    })
    expect(response?.status() ?? 0).toBeLessThan(500)
  })

  test('/my-events/[id]/pre-event-checklist - checklist route responds', async ({
    page,
    seedIds,
  }) => {
    const response = await page.goto(
      `/my-events/${seedIds.eventIds.completed}/pre-event-checklist`,
      {
        waitUntil: 'domcontentloaded',
      }
    )
    expect(response?.status() ?? 0).toBeLessThan(500)
  })

  test('/survey/[token] - invalid survey token handled gracefully', async ({ page }) => {
    const response = await page.goto('/survey/not-a-real-survey-token', {
      waitUntil: 'domcontentloaded',
    })
    expect(response?.status() ?? 0).toBeLessThan(500)
  })
})
