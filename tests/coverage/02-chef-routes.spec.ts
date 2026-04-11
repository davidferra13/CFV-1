// Coverage Layer â€” Chef Routes
// Visits every chef-portal URL authenticated as the E2E test chef.
// Asserts: page loads (no crash), no JS errors, has content.
// Dynamic [id] segments are filled from seedIds fixture.
//
// Run: npm run test:coverage:chef

import { test, expect } from '../helpers/fixtures'

async function gotoChefPage(page: Parameters<Parameters<typeof test>[1]>[0]['page'], url: string) {
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

async function assertChefPageLoads(
  page: Parameters<Parameters<typeof test>[1]>[0]['page'],
  url: string,
  label?: string
) {
  const tag = label ?? url
  let status = 0
  let currentUrl = ''
  let bodyText = ''
  let errors: string[] = []

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    errors = []
    const onPageError = (err: Error) => errors.push(err.message)
    page.on('pageerror', onPageError)

    const response = await gotoChefPage(page, url)
    page.off('pageerror', onPageError)

    status = response?.status() ?? 0
    currentUrl = page.url()
    bodyText = await page.locator('body').innerText()

    const hasKnownTransientError = errors.some((msg) =>
      /Cannot read properties of null \(reading 'useContext'\)/i.test(msg)
    )
    const redirectedToSignIn = /auth\/signin/.test(currentUrl)
    if (attempt < 2 && (status >= 500 || redirectedToSignIn || hasKnownTransientError)) {
      await page.waitForTimeout(400)
      continue
    }
    break
  }

  expect(status, `[chef] ${tag} returned HTTP ${status}`).toBeLessThan(500)
  expect(errors, `[chef] ${tag} had JS errors: ${errors.join('; ')}`).toHaveLength(0)
  expect(currentUrl, `[chef] ${tag} redirected to login`).not.toMatch(/auth\/signin/)
  expect(bodyText.trim().length, `[chef] ${tag} rendered blank`).toBeGreaterThan(10)
}

async function assertChefPageRedirects(
  page: Parameters<Parameters<typeof test>[1]>[0]['page'],
  url: string,
  expectedPath: string
) {
  const response = await gotoChefPage(page, url)
  const escapedExpectedPath = expectedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  await page.waitForURL(new RegExp(`${escapedExpectedPath}(?:\\?|$)`), {
    timeout: 30_000,
  })
  const currentUrl = new URL(page.url())
  const bodyText = await page.locator('body').innerText()

  expect(
    response?.status() ?? 0,
    `[chef] ${url} returned HTTP ${response?.status() ?? 0}`
  ).toBeLessThan(500)
  expect(currentUrl.pathname, `[chef] ${url} should redirect to ${expectedPath}`).toBe(expectedPath)
  expect(bodyText.trim().length, `[chef] ${url} redirected blank`).toBeGreaterThan(10)
}

// â”€â”€â”€ Dashboard & Quick Access â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Chef â€” Dashboard & Quick Access', () => {
  test('/dashboard', async ({ page }) => {
    await assertChefPageLoads(page, '/dashboard')
  })

  test('/queue', async ({ page }) => {
    await assertChefPageLoads(page, '/queue')
  })

  test('/activity', async ({ page }) => {
    await assertChefPageLoads(page, '/activity')
  })
})

// â”€â”€â”€ Events â€” List Views â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Chef â€” Events (List Views)', () => {
  test('/events', async ({ page }) => {
    await assertChefPageLoads(page, '/events')
  })

  test('/events/board', async ({ page }) => {
    await assertChefPageLoads(page, '/events/board')
  })

  test('/events/upcoming', async ({ page }) => {
    await assertChefPageLoads(page, '/events/upcoming')
  })

  test('/events/confirmed', async ({ page }) => {
    await assertChefPageLoads(page, '/events/confirmed')
  })

  test('/events/awaiting-deposit', async ({ page }) => {
    await assertChefPageLoads(page, '/events/awaiting-deposit')
  })

  test('/events/completed', async ({ page }) => {
    await assertChefPageLoads(page, '/events/completed')
  })

  test('/events/cancelled', async ({ page }) => {
    await assertChefPageLoads(page, '/events/cancelled')
  })

  test('/events/new', async ({ page }) => {
    await assertChefPageLoads(page, '/events/new')
  })

  test('/events/new/from-text', async ({ page }) => {
    await assertChefPageLoads(page, '/events/new/from-text')
  })

  test('/events/new/wizard', async ({ page }) => {
    await assertChefPageLoads(page, '/events/new/wizard')
  })
})

// â”€â”€â”€ Events â€” Detail Sub-Pages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Chef â€” Events (Detail: Draft)', () => {
  test('/events/[draft] â€” detail', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.draft}`)
  })

  test('/events/[draft]/edit', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.draft}/edit`)
  })

  test('/events/[draft]/schedule', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.draft}/schedule`)
  })

  test('/events/[draft]/travel', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.draft}/travel`)
  })

  test('/events/[draft]/pack', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.draft}/pack`)
  })

  test('/events/[draft]/kds', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.draft}/kds`)
  })

  test('/events/[draft]/dop/mobile', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.draft}/dop/mobile`)
  })

  test('/events/[draft]/grocery-quote', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.draft}/grocery-quote`)
  })

  test('/events/[draft]/invoice', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.draft}/invoice`)
  })

  test('/events/[draft]/receipts', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.draft}/receipts`)
  })

  test('/events/[draft]/financial', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.draft}/financial`)
  })

  test('/events/[draft]/split-billing', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.draft}/split-billing`)
  })

  test('/events/[draft]/interactive', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.draft}/interactive`)
  })
})

test.describe('Chef â€” Events (Detail: Completed)', () => {
  test('/events/[completed] â€” detail', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.completed}`)
  })

  test('/events/[completed]/close-out', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.completed}/close-out`)
  })

  test('/events/[completed]/aar', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.completed}/aar`)
  })

  test('/events/[completed]/debrief', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.completed}/debrief`)
  })

  test('/events/[completed]/financial', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.completed}/financial`)
  })

  test('/events/[completed]/receipts', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.completed}/receipts`)
  })
})

test.describe('Chef â€” Events (Detail: Confirmed)', () => {
  test('/events/[confirmed] â€” detail', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.confirmed}`)
  })

  test('/events/[confirmed]/schedule', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.confirmed}/schedule`)
  })

  test('/events/[confirmed]/pack', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.confirmed}/pack`)
  })

  test('/events/[confirmed]/kds', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.confirmed}/kds`)
  })
})

test.describe('Chef â€” Events (Detail: Paid)', () => {
  test('/events/[paid] â€” detail', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.paid}`)
  })

  test('/events/[paid]/financial', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.paid}/financial`)
  })
})

test.describe('Chef â€” Events (Detail: Proposed)', () => {
  test('/events/[proposed] â€” detail', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/events/${seedIds.eventIds.proposed}`)
  })
})

// â”€â”€â”€ Inquiries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Chef â€” Inquiries', () => {
  test('/inquiries', async ({ page }) => {
    await assertChefPageLoads(page, '/inquiries')
  })

  test('/inquiries/new', async ({ page }) => {
    await assertChefPageLoads(page, '/inquiries/new')
  })

  test('/inquiries/awaiting-response', async ({ page }) => {
    await assertChefPageLoads(page, '/inquiries/awaiting-response')
  })

  test('/inquiries/awaiting-client-reply', async ({ page }) => {
    await assertChefPageLoads(page, '/inquiries/awaiting-client-reply')
  })

  test('/inquiries/menu-drafting', async ({ page }) => {
    await assertChefPageLoads(page, '/inquiries/menu-drafting')
  })

  test('/inquiries/sent-to-client', async ({ page }) => {
    await assertChefPageLoads(page, '/inquiries/sent-to-client')
  })

  test('/inquiries/declined', async ({ page }) => {
    await assertChefPageLoads(page, '/inquiries/declined')
  })

  test('/inquiries/[awaitingChef] â€” detail', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/inquiries/${seedIds.inquiryIds.awaitingChef}`)
  })

  test('/inquiries/[awaitingClient] â€” detail', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/inquiries/${seedIds.inquiryIds.awaitingClient}`)
  })
})

// â”€â”€â”€ Quotes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Chef â€” Quotes', () => {
  test('/quotes', async ({ page }) => {
    await assertChefPageLoads(page, '/quotes')
  })

  test('/quotes/new', async ({ page }) => {
    await assertChefPageLoads(page, '/quotes/new')
  })

  test('/quotes/draft', async ({ page }) => {
    await assertChefPageLoads(page, '/quotes/draft')
  })

  test('/quotes/sent', async ({ page }) => {
    await assertChefPageLoads(page, '/quotes/sent')
  })

  test('/quotes/viewed', async ({ page }) => {
    await assertChefPageLoads(page, '/quotes/viewed')
  })

  test('/quotes/accepted', async ({ page }) => {
    await assertChefPageLoads(page, '/quotes/accepted')
  })

  test('/quotes/rejected', async ({ page }) => {
    await assertChefPageLoads(page, '/quotes/rejected')
  })

  test('/quotes/expired', async ({ page }) => {
    await assertChefPageLoads(page, '/quotes/expired')
  })

  test('/quotes/[draft] â€” detail', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/quotes/${seedIds.quoteIds.draft}`)
  })

  test('/quotes/[sent] â€” detail', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/quotes/${seedIds.quoteIds.sent}`)
  })

  test('/quotes/[accepted] â€” detail', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/quotes/${seedIds.quoteIds.accepted}`)
  })

  test('/quotes/[draft]/edit', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/quotes/${seedIds.quoteIds.draft}/edit`)
  })
})

// â”€â”€â”€ Clients â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Chef â€” Clients (List Views)', () => {
  test('/clients', async ({ page }) => {
    await assertChefPageLoads(page, '/clients')
  })

  test('/clients/new', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/new')
  })

  test('/clients/active', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/active')
  })

  test('/clients/inactive', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/inactive')
  })

  test('/clients/vip', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/vip')
  })

  test('/clients/duplicates', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/duplicates')
  })

  test('/clients/presence', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/presence')
  })

  test('/clients/segments', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/segments')
  })

  test('/clients/gift-cards', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/gift-cards')
  })
})

test.describe('Chef â€” Clients (Detail)', () => {
  test('/clients/[primary] â€” detail', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/clients/${seedIds.clientIds.primary}`)
  })

  test('/clients/[secondary] â€” detail', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/clients/${seedIds.clientIds.secondary}`)
  })

  test('/clients/[dormant] â€” detail', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/clients/${seedIds.clientIds.dormant}`)
  })

  test('/clients/[primary]/recurring', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/clients/${seedIds.clientIds.primary}/recurring`)
  })
})

test.describe('Chef â€” Clients (Preferences)', () => {
  test('/clients/preferences', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/preferences')
  })

  test('/clients/preferences/allergies', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/preferences/allergies')
  })

  test('/clients/preferences/dietary-restrictions', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/preferences/dietary-restrictions')
  })

  test('/clients/preferences/dislikes', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/preferences/dislikes')
  })

  test('/clients/preferences/favorite-dishes', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/preferences/favorite-dishes')
  })
})

test.describe('Chef â€” Clients (Insights & Communication)', () => {
  test('/clients/insights', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/insights')
  })

  test('/clients/insights/at-risk', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/insights/at-risk')
  })

  test('/clients/insights/top-clients', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/insights/top-clients')
  })

  test('/clients/insights/most-frequent', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/insights/most-frequent')
  })

  test('/clients/communication', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/communication')
  })

  test('/clients/communication/notes', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/communication/notes')
  })

  test('/clients/communication/follow-ups', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/communication/follow-ups')
  })

  test('/clients/communication/upcoming-touchpoints', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/communication/upcoming-touchpoints')
  })

  test('/clients/history', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/history')
  })

  test('/clients/history/event-history', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/history/event-history')
  })

  test('/clients/history/past-menus', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/history/past-menus')
  })

  test('/clients/history/spending-history', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/history/spending-history')
  })
})

test.describe('Chef â€” Clients (Loyalty)', () => {
  test('/clients/loyalty', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/loyalty')
  })

  test('/clients/loyalty/points', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/loyalty/points')
  })

  test('/clients/loyalty/referrals', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/loyalty/referrals')
  })

  test('/clients/loyalty/rewards', async ({ page }) => {
    await assertChefPageLoads(page, '/clients/loyalty/rewards')
  })
})

// â”€â”€â”€ Menus â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Chef â€” Menus', () => {
  test('/menus', async ({ page }) => {
    await assertChefPageLoads(page, '/menus')
  })

  test('/menus/new', async ({ page }) => {
    await assertChefPageLoads(page, '/menus/new')
  })

  test('/menus/[menu] â€” detail', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/menus/${seedIds.menuId}`)
  })

  test('/menus/[menu]/editor', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/menus/${seedIds.menuId}/editor`)
  })
})

// â”€â”€â”€ Recipes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Chef â€” Recipes', () => {
  test('/recipes', async ({ page }) => {
    await assertChefPageLoads(page, '/recipes')
  })

  test('/recipes/new', async ({ page }) => {
    await assertChefPageLoads(page, '/recipes/new')
  })

  test('/recipes/drafts', async ({ page }) => {
    await assertChefPageLoads(page, '/recipes/drafts')
  })

  test('/recipes/sprint', async ({ page }) => {
    await assertChefPageLoads(page, '/recipes/sprint')
  })

  test('/recipes/[recipe] â€” detail', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/recipes/${seedIds.recipeId}`)
  })

  test('/recipes/[recipe]/edit', async ({ page, seedIds }) => {
    await assertChefPageLoads(page, `/recipes/${seedIds.recipeId}/edit`)
  })

  test('/recipes/ingredients', async ({ page }) => {
    await assertChefPageLoads(page, '/recipes/ingredients')
  })
})

// â”€â”€â”€ Culinary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Chef â€” Culinary', () => {
  test('/culinary', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary')
  })

  test('/culinary/ingredients', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/ingredients')
  })

  test('/culinary/ingredients/seasonal-availability', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/ingredients/seasonal-availability')
  })

  test('/culinary/ingredients/vendor-notes', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/ingredients/vendor-notes')
  })

  test('/culinary/components', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/components')
  })

  test('/culinary/components/sauces', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/components/sauces')
  })

  test('/culinary/components/stocks', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/components/stocks')
  })

  test('/culinary/components/garnishes', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/components/garnishes')
  })

  test('/culinary/components/ferments', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/components/ferments')
  })

  test('/culinary/components/shared-elements', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/components/shared-elements')
  })

  test('/culinary/menus', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/menus')
  })

  test('/culinary/menus/drafts', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/menus/drafts')
  })

  test('/culinary/menus/approved', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/menus/approved')
  })

  test('/culinary/menus/templates', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/menus/templates')
  })

  test('/culinary/menus/scaling', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/menus/scaling')
  })

  test('/culinary/menus/substitutions', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/menus/substitutions')
  })

  test('/culinary/recipes', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/recipes')
  })

  test('/culinary/recipes/drafts', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/recipes/drafts')
  })

  test('/culinary/recipes/seasonal-notes', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/recipes/seasonal-notes')
  })

  test('/culinary/recipes/dietary-flags', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/recipes/dietary-flags')
  })

  test('/culinary/recipes/tags', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/recipes/tags')
  })

  test('/culinary/costing', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/costing')
  })

  test('/culinary/costing/recipe', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/costing/recipe')
  })

  test('/culinary/costing/menu', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/costing/menu')
  })

  test('/culinary/costing/food-cost', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/costing/food-cost')
  })

  test('/culinary/prep', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/prep')
  })

  test('/culinary/prep/shopping', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/prep/shopping')
  })

  test('/culinary/prep/timeline', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/prep/timeline')
  })

  test('/culinary/vendors', async ({ page }) => {
    await assertChefPageLoads(page, '/culinary/vendors')
  })
})

// â”€â”€â”€ Calendar & Scheduling â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Chef â€” Calendar & Scheduling', () => {
  test('/calendar', async ({ page }) => {
    await assertChefPageLoads(page, '/calendar')
  })

  test('/calendar/day', async ({ page }) => {
    await assertChefPageLoads(page, '/calendar/day')
  })

  test('/calendar/week', async ({ page }) => {
    await assertChefPageLoads(page, '/calendar/week')
  })

  test('/calendar/year', async ({ page }) => {
    await assertChefPageLoads(page, '/calendar/year')
  })

  test('/schedule', async ({ page }) => {
    await assertChefPageLoads(page, '/schedule')
  })
})

// â”€â”€â”€ Finance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Chef â€” Finance (Overview)', () => {
  test('/finance', async ({ page }) => {
    await assertChefPageLoads(page, '/finance')
  })

  test('/financials', async ({ page }) => {
    await assertChefPageLoads(page, '/financials')
  })

  test('/finance/overview', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/overview')
  })

  test('/finance/overview/cash-flow', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/overview/cash-flow')
  })

  test('/finance/overview/outstanding-payments', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/overview/outstanding-payments')
  })

  test('/finance/overview/revenue-summary', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/overview/revenue-summary')
  })
})

test.describe('Chef â€” Finance (Invoices)', () => {
  test('/finance/invoices', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/invoices')
  })

  test('/finance/invoices/draft', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/invoices/draft')
  })

  test('/finance/invoices/sent', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/invoices/sent')
  })

  test('/finance/invoices/paid', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/invoices/paid')
  })

  test('/finance/invoices/overdue', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/invoices/overdue')
  })

  test('/finance/invoices/refunded', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/invoices/refunded')
  })

  test('/finance/invoices/cancelled', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/invoices/cancelled')
  })
})

test.describe('Chef â€” Finance (Payments)', () => {
  test('/finance/payments', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/payments')
  })

  test('/finance/payments/deposits', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/payments/deposits')
  })

  test('/finance/payments/installments', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/payments/installments')
  })

  test('/finance/payments/refunds', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/payments/refunds')
  })

  test('/finance/payments/failed', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/payments/failed')
  })
})

test.describe('Chef â€” Finance (Ledger)', () => {
  test('/finance/ledger', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/ledger')
  })

  test('/finance/ledger/transaction-log', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/ledger/transaction-log')
  })

  test('/finance/ledger/adjustments', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/ledger/adjustments')
  })
})

test.describe('Chef â€” Finance (Payouts)', () => {
  test('/finance/payouts', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/payouts')
  })

  test('/finance/payouts/stripe-payouts', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/payouts/stripe-payouts')
  })

  test('/finance/payouts/manual-payments', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/payouts/manual-payments')
  })

  test('/finance/payouts/reconciliation', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/payouts/reconciliation')
  })
})

test.describe('Chef â€” Finance (Expenses)', () => {
  test('/finance/expenses', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/expenses')
  })

  test('/finance/expenses/food-ingredients', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/expenses/food-ingredients')
  })

  test('/finance/expenses/labor', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/expenses/labor')
  })

  test('/finance/expenses/rentals-equipment', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/expenses/rentals-equipment')
  })

  test('/finance/expenses/marketing', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/expenses/marketing')
  })

  test('/finance/expenses/travel', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/expenses/travel')
  })

  test('/finance/expenses/software', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/expenses/software')
  })

  test('/finance/expenses/miscellaneous', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/expenses/miscellaneous')
  })
})

test.describe('Chef â€” Finance (Reporting & Goals)', () => {
  test('/finance/recurring', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/recurring')
  })

  test('/finance/forecast', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/forecast')
  })

  test('/finance/goals', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/goals')
  })

  test('/finance/tax', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/tax')
  })

  test('/finance/tax/quarterly', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/tax/quarterly')
  })

  test('/finance/tax/year-end', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/tax/year-end')
  })

  test('/finance/year-end', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/year-end')
  })

  test('/finance/disputes', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/disputes')
  })

  test('/finance/contractors', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/contractors')
  })

  test('/finance/bank-feed', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/bank-feed')
  })

  test('/finance/cash-flow', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/cash-flow')
  })

  test('/finance/reporting', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/reporting')
  })

  test('/finance/reporting/profit-loss', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/reporting/profit-loss')
  })

  test('/finance/reporting/profit-by-event', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/reporting/profit-by-event')
  })

  test('/finance/reporting/revenue-by-event', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/reporting/revenue-by-event')
  })

  test('/finance/reporting/revenue-by-client', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/reporting/revenue-by-client')
  })

  test('/finance/reporting/revenue-by-month', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/reporting/revenue-by-month')
  })

  test('/finance/reporting/expense-by-category', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/reporting/expense-by-category')
  })

  test('/finance/reporting/tax-summary', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/reporting/tax-summary')
  })

  test('/finance/reporting/year-to-date-summary', async ({ page }) => {
    await assertChefPageLoads(page, '/finance/reporting/year-to-date-summary')
  })
})

// â”€â”€â”€ Expenses (Standalone) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Chef â€” Expenses (Standalone)', () => {
  test('/expenses', async ({ page }) => {
    await assertChefPageLoads(page, '/expenses')
  })

  test('/expenses/new', async ({ page }) => {
    await assertChefPageLoads(page, '/expenses/new')
  })
})

// â”€â”€â”€ Analytics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Chef â€” Analytics & Insights', () => {
  test('/analytics', async ({ page }) => {
    await assertChefPageLoads(page, '/analytics')
  })

  test('/analytics/pipeline', async ({ page }) => {
    await assertChefPageLoads(page, '/analytics/pipeline')
  })

  test('/analytics/demand', async ({ page }) => {
    await assertChefPageLoads(page, '/analytics/demand')
  })

  test('/analytics/client-ltv', async ({ page }) => {
    await assertChefPageLoads(page, '/analytics/client-ltv')
  })

  test('/analytics/benchmarks', async ({ page }) => {
    await assertChefPageLoads(page, '/analytics/benchmarks')
  })

  test('/analytics/reports', async ({ page }) => {
    await assertChefPageLoads(page, '/analytics/reports')
  })

  test('/insights', async ({ page }) => {
    await assertChefPageLoads(page, '/insights')
  })

  test('/insights/time-analysis', async ({ page }) => {
    await assertChefPageLoads(page, '/insights/time-analysis')
  })
})

// â”€â”€â”€ Inventory & Costing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Chef â€” Inventory', () => {
  test('/inventory', async ({ page }) => {
    await assertChefPageLoads(page, '/inventory')
  })

  test('/inventory/counts', async ({ page }) => {
    await assertChefPageLoads(page, '/inventory/counts')
  })

  test('/inventory/food-cost', async ({ page }) => {
    await assertChefPageLoads(page, '/inventory/food-cost')
  })

  test('/inventory/vendor-invoices', async ({ page }) => {
    await assertChefPageLoads(page, '/inventory/vendor-invoices')
  })

  test('/inventory/waste', async ({ page }) => {
    await assertChefPageLoads(page, '/inventory/waste')
  })
})

// â”€â”€â”€ Staff â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Chef â€” Staff & Team', () => {
  test('/staff', async ({ page }) => {
    await assertChefPageLoads(page, '/staff')
  })

  test('/staff/availability', async ({ page }) => {
    await assertChefPageLoads(page, '/staff/availability')
  })

  test('/staff/schedule', async ({ page }) => {
    await assertChefPageLoads(page, '/staff/schedule')
  })

  test('/staff/labor', async ({ page }) => {
    await assertChefPageLoads(page, '/staff/labor')
  })

  test('/staff/clock', async ({ page }) => {
    await assertChefPageLoads(page, '/staff/clock')
  })

  test('/staff/performance', async ({ page }) => {
    await assertChefPageLoads(page, '/staff/performance')
  })
})

// â”€â”€â”€ Calls & Chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Chef â€” Calls & Chat', () => {
  test('/calls', async ({ page }) => {
    await assertChefPageLoads(page, '/calls')
  })

  test('/calls/new', async ({ page }) => {
    await assertChefPageLoads(page, '/calls/new')
  })

  test('/chat', async ({ page }) => {
    await assertChefPageLoads(page, '/chat')
  })
})

// â”€â”€â”€ Marketing & Growth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Chef â€” Marketing & Growth', () => {
  test('/marketing', async ({ page }) => {
    await assertChefPageLoads(page, '/marketing')
  })

  test('/marketing/templates', async ({ page }) => {
    await assertChefPageLoads(page, '/marketing/templates')
  })

  test('/marketing/sequences', async ({ page }) => {
    await assertChefPageLoads(page, '/marketing/sequences')
  })

  test('/social', async ({ page }) => {
    await assertChefPageLoads(page, '/social')
  })

  test('/social/planner', async ({ page }) => {
    await assertChefPageLoads(page, '/social/planner')
  })

  test('/social/vault', async ({ page }) => {
    await assertChefPageLoads(page, '/social/vault')
  })

  test('/social/connections', async ({ page }) => {
    await assertChefPageLoads(page, '/social/connections')
  })

  test('/social/settings', async ({ page }) => {
    await assertChefPageLoads(page, '/social/settings')
  })

  test('/leads', async ({ page }) => {
    await assertChefPageLoads(page, '/leads')
  })

  test('/leads/new', async ({ page }) => {
    await assertChefPageLoads(page, '/leads/new')
  })

  test('/leads/contacted', async ({ page }) => {
    await assertChefPageLoads(page, '/leads/contacted')
  })

  test('/leads/qualified', async ({ page }) => {
    await assertChefPageLoads(page, '/leads/qualified')
  })

  test('/leads/converted', async ({ page }) => {
    await assertChefPageLoads(page, '/leads/converted')
  })

  test('/leads/archived', async ({ page }) => {
    await assertChefPageLoads(page, '/leads/archived')
  })
})

// â”€â”€â”€ Network & Community â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Chef â€” Network & Community', () => {
  test('/network', async ({ page }) => {
    await assertChefPageLoads(page, '/network')
  })

  test('/network/notifications', async ({ page }) => {
    await assertChefPageLoads(page, '/network/notifications')
  })

  test('/network/saved', async ({ page }) => {
    await assertChefPageLoads(page, '/network/saved')
  })

  test('/community/templates', async ({ page }) => {
    await assertChefPageLoads(page, '/community/templates')
  })
})

// â”€â”€â”€ Partners & Referrals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Chef â€” Partners & Referrals', () => {
  test('/partners', async ({ page }) => {
    await assertChefPageLoads(page, '/partners')
  })

  test('/partners/new', async ({ page }) => {
    await assertChefPageLoads(page, '/partners/new')
  })

  test('/partners/active', async ({ page }) => {
    await assertChefPageLoads(page, '/partners/active')
  })

  test('/partners/inactive', async ({ page }) => {
    await assertChefPageLoads(page, '/partners/inactive')
  })

  test('/partners/events-generated', async ({ page }) => {
    await assertChefPageLoads(page, '/partners/events-generated')
  })

  test('/partners/referral-performance', async ({ page }) => {
    await assertChefPageLoads(page, '/partners/referral-performance')
  })

  test('/proposals', async ({ page }) => {
    await assertChefPageLoads(page, '/proposals')
  })

  test('/proposals/templates', async ({ page }) => {
    await assertChefPageLoads(page, '/proposals/templates')
  })

  test('/proposals/addons', async ({ page }) => {
    await assertChefPageLoads(page, '/proposals/addons')
  })
})

// â”€â”€â”€ Loyalty Program â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Chef â€” Loyalty Program', () => {
  test('/loyalty', async ({ page }) => {
    await assertChefPageLoads(page, '/loyalty')
  })

  test('/loyalty/settings', async ({ page }) => {
    await assertChefPageLoads(page, '/loyalty/settings')
  })

  test('/loyalty/rewards/new', async ({ page }) => {
    await assertChefPageLoads(page, '/loyalty/rewards/new')
  })
})

// â”€â”€â”€ Operations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Chef â€” Operations', () => {
  test('/operations', async ({ page }) => {
    await assertChefPageLoads(page, '/operations')
  })

  test('/operations/kitchen-rentals', async ({ page }) => {
    await assertChefPageLoads(page, '/operations/kitchen-rentals')
  })

  test('/operations/equipment', async ({ page }) => {
    await assertChefPageLoads(page, '/operations/equipment')
  })
})

// â”€â”€â”€ Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Chef â€” Settings', () => {
  test('/settings', async ({ page }) => {
    await assertChefPageLoads(page, '/settings')
  })

  test('/settings/my-profile', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/my-profile')
  })

  test('/settings/profile', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/profile')
  })

  test('/settings/public-profile', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/public-profile')
  })

  test('/settings/appearance', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/appearance')
  })

  test('/settings/highlights', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/highlights')
  })

  test('/settings/portfolio', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/portfolio')
  })

  test('/settings/event-types', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/event-types')
  })

  test('/settings/change-password', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/change-password')
  })

  test('/settings/integrations', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/integrations')
  })

  test('/settings/stripe-connect', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/stripe-connect')
  })

  test('/settings/api-keys redirects to /settings when developer tools are disabled', async ({
    page,
  }) => {
    await assertChefPageRedirects(page, '/settings/api-keys', '/settings')
  })

  test('/settings/webhooks redirects to /settings when developer tools are disabled', async ({
    page,
  }) => {
    await assertChefPageRedirects(page, '/settings/webhooks', '/settings')
  })

  test('/settings/zapier redirects to /settings when developer tools are disabled', async ({
    page,
  }) => {
    await assertChefPageRedirects(page, '/settings/zapier', '/settings')
  })

  test('/settings/notifications', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/notifications')
  })

  test('/settings/automations', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/automations')
  })

  test('/settings/templates', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/templates')
  })

  test('/settings/contracts', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/contracts')
  })

  test('/settings/custom-fields', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/custom-fields')
  })

  test('/settings/dashboard', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/dashboard')
  })

  test('/settings/navigation', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/navigation')
  })

  test('/settings/client-preview', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/client-preview')
  })

  test('/settings/reputation', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/reputation')
  })

  test('/settings/professional', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/professional')
  })

  test('/settings/repertoire', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/repertoire')
  })

  test('/settings/compliance', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/compliance')
  })

  test('/settings/compliance/gdpr', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/compliance/gdpr')
  })

  test('/settings/emergency', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/emergency')
  })

  test('/settings/health', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/health')
  })

  test('/settings/journal', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/journal')
  })

  test('/settings/journey', async ({ page }) => {
    await assertChefPageLoads(page, '/settings/journey')
  })
})

// â”€â”€â”€ Misc Chef Pages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Chef â€” Misc Pages', () => {
  test('/reviews', async ({ page }) => {
    await assertChefPageLoads(page, '/reviews')
  })

  test('/waitlist', async ({ page }) => {
    await assertChefPageLoads(page, '/waitlist')
  })

  test('/import', async ({ page }) => {
    await assertChefPageLoads(page, '/import')
  })

  test('/aar', async ({ page }) => {
    await assertChefPageLoads(page, '/aar')
  })

  test('/surveys', async ({ page }) => {
    await assertChefPageLoads(page, '/surveys')
  })

  test('/travel', async ({ page }) => {
    await assertChefPageLoads(page, '/travel')
  })

  test('/help', async ({ page }) => {
    await assertChefPageLoads(page, '/help')
  })

  test('/onboarding', async ({ page }) => {
    await assertChefPageLoads(page, '/onboarding')
  })

  test('/onboarding/clients', async ({ page }) => {
    await assertChefPageLoads(page, '/onboarding/clients')
  })

  test('/onboarding/recipes', async ({ page }) => {
    await assertChefPageLoads(page, '/onboarding/recipes')
  })

  test('/onboarding/loyalty', async ({ page }) => {
    await assertChefPageLoads(page, '/onboarding/loyalty')
  })

  test('/onboarding/staff', async ({ page }) => {
    await assertChefPageLoads(page, '/onboarding/staff')
  })
})
