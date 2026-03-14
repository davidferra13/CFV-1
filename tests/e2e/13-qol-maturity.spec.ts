import { test, expect } from '../helpers/fixtures'
import type { Page } from '@playwright/test'

test.describe.configure({ timeout: 60_000 })

async function setCookieConsent(page: Page) {
  await page.context().addCookies([
    {
      name: 'cookieConsent',
      value: 'declined',
      url: 'http://localhost:3100',
    },
  ])
}

async function dismissCookieBanner(page: Page) {
  const decline = page.getByRole('button', { name: /Decline cookies|Decline/i }).first()
  if (await decline.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await decline.click()
  }
}

async function dismissRestoreDraftPrompt(page: Page) {
  const heading = page.getByRole('heading', { name: /Restore unsent draft\?/i })
  if (await heading.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await page.getByRole('button', { name: /^Discard$/i }).click()
    await expect(heading).toBeHidden()
  }
}

async function forceNextActionConflict(page: Page) {
  await page.evaluate(() => {
    const win = window as Window & {
      __qolOriginalFetch?: typeof fetch
    }

    if (!win.__qolOriginalFetch) {
      win.__qolOriginalFetch = window.fetch.bind(window)
    }

    const originalFetch = win.__qolOriginalFetch
    window.fetch = async (input, init) => {
      const requestUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input instanceof Request
              ? input.url
              : ''
      const requestMethod = (
        init?.method || (input instanceof Request ? input.method : 'GET')
      ).toUpperCase()
      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined)
      )
      const pathname = requestUrl ? new URL(requestUrl, window.location.origin).pathname : ''
      const isQuoteEditMutation =
        requestMethod === 'POST' &&
        (headers.has('next-action') ||
          (pathname.startsWith('/quotes/') && pathname.endsWith('/edit')))

      if (isQuoteEditMutation) {
        throw new Error(
          'CF_CONFLICT::{"code":"CONFLICT","message":"This record changed elsewhere.","currentUpdatedAt":"2026-01-01T00:00:00.000Z"}'
        )
      }
      return originalFetch(input, init)
    }
  })

  return async () => {
    await page.evaluate(() => {
      const win = window as Window & {
        __qolOriginalFetch?: typeof fetch
      }
      if (win.__qolOriginalFetch) {
        window.fetch = win.__qolOriginalFetch
      }
    })
  }
}

test.describe('QOL Maturity - Phase 1/2', () => {
  test('quotes view-state persists through navigation and browser back', async ({
    page,
    seedIds,
  }) => {
    await setCookieConsent(page)
    await page.goto('/quotes')
    await dismissCookieBanner(page)
    await page.getByRole('button', { name: /^Sent$/i }).click()
    await expect.poll(() => page.url(), { timeout: 10_000 }).toMatch(/\/quotes\?.*status=sent/)

    const filteredListUrl = page.url()

    // Navigate to a guaranteed seeded record, then verify browser back restores
    // the exact list view state URL.
    await page.goto(`/quotes/${seedIds.quoteIds.draft}`)
    await expect(page).toHaveURL(new RegExp(`/quotes/${seedIds.quoteIds.draft}`))

    await page.goBack()
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(filteredListUrl)
  })

  test('global search shows recents and supports pinning', async ({ page, seedIds }) => {
    await setCookieConsent(page)
    await page.goto('/quotes')
    await dismissCookieBanner(page)
    await page.evaluate(
      ([tenantId, userId, quoteId]) => {
        const key = `cf:search:history:${tenantId}:${userId}`
        localStorage.setItem(
          key,
          JSON.stringify([
            {
              id: `quote:${quoteId}`,
              type: 'quote',
              title: 'TEST Quote (draft)',
              snippet: '740.00 - No expiry',
              url: `/quotes/${quoteId}`,
              selectedAt: new Date().toISOString(),
              pinned: false,
            },
          ])
        )
      },
      [seedIds.chefId, seedIds.chefAuthId, seedIds.quoteIds.draft]
    )

    await page.getByRole('button', { name: /open search/i }).click()
    const searchInput = page.getByRole('combobox')
    await expect(searchInput).toBeVisible()
    await searchInput.fill('')

    await expect(page.getByText(/^Recent$/i)).toBeVisible()

    const pinToggle = page.getByRole('button', { name: /^Pin |^Unpin /i }).first()
    await pinToggle.click()
    await expect(page.getByText(/^Pinned$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Unpin /i }).first()).toBeVisible()
  })

  test('unsaved dialog supports keyboard-only stay and leave', async ({ page }) => {
    const quoteName = `QOL Keyboard Quote ${Date.now()}`

    await setCookieConsent(page)
    await page.goto('/dashboard')
    await page.goto('/quotes/new')
    await dismissCookieBanner(page)
    await page.getByPlaceholder('e.g., Anniversary Dinner - Premium Package').fill(quoteName)

    await page.getByRole('button', { name: /^Cancel$/i }).click()
    await expect(page.getByRole('heading', { name: /Leave without saving\?/i })).toBeVisible()

    // Initial focus is "Stay". Enter keeps user on page.
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: /Leave without saving\?/i })).toBeHidden()
    await expect(page.getByPlaceholder('e.g., Anniversary Dinner - Premium Package')).toHaveValue(
      quoteName
    )

    await page.getByRole('button', { name: /^Cancel$/i }).click()
    await expect(page.getByRole('heading', { name: /Leave without saving\?/i })).toBeVisible()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    await expect(page).not.toHaveURL(/\/quotes\/new/)
  })

  test('quote transition uses policy confirmation dialog (not browser confirm)', async ({
    page,
    seedIds,
  }) => {
    await setCookieConsent(page)
    await page.goto(`/quotes/${seedIds.quoteIds.draft}`)
    await dismissCookieBanner(page)
    await page.getByRole('button', { name: /Send to Client/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Cancel$/i })).toBeVisible()
    await page.getByRole('button', { name: /^Cancel$/i }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('quote conflict v2 shows comparison UI and keep-latest flow', async ({
    context,
    seedIds,
  }) => {
    const pageA = await context.newPage()
    const pageB = await context.newPage()
    const titleA = `QOL Conflict A ${Date.now()}`
    const titleB = `QOL Conflict B ${Date.now()}`

    await context.addCookies([
      {
        name: 'cookieConsent',
        value: 'declined',
        url: 'http://localhost:3100',
      },
    ])

    await pageA.goto(`/quotes/${seedIds.quoteIds.draft}/edit`)
    await pageB.goto(`/quotes/${seedIds.quoteIds.draft}/edit`)
    await dismissCookieBanner(pageA)
    await dismissCookieBanner(pageB)
    await dismissRestoreDraftPrompt(pageA)
    await dismissRestoreDraftPrompt(pageB)

    await pageA.getByPlaceholder('e.g., Anniversary Dinner - Premium Package').fill(titleA)
    await dismissCookieBanner(pageA)
    await dismissRestoreDraftPrompt(pageA)
    await pageA.getByRole('button', { name: /Save Changes/i }).click()
    await expect(pageA.getByLabel(/Save state: saved/i)).toBeVisible({ timeout: 15_000 })

    await dismissRestoreDraftPrompt(pageB)
    await pageB.getByPlaceholder('e.g., Anniversary Dinner - Premium Package').fill(titleB)
    await dismissCookieBanner(pageB)
    await dismissRestoreDraftPrompt(pageB)
    const cleanupConflict = await forceNextActionConflict(pageB)
    await pageB.getByRole('button', { name: /Save Changes/i }).click()

    await expect(
      pageB.getByRole('heading', { name: /This record changed elsewhere\./i })
    ).toBeVisible({ timeout: 15_000 })
    await expect(pageB.getByRole('button', { name: /Keep mine/i })).toBeVisible()
    await expect(pageB.getByRole('button', { name: /Keep latest/i })).toBeVisible()

    await pageB.getByRole('button', { name: /Keep latest/i }).click()
    await expect(
      pageB.getByRole('heading', { name: /This record changed elsewhere\./i })
    ).toBeHidden()
    await cleanupConflict()

    await pageA.close()
    await pageB.close()
  })

  test('quote timeline renders field-level diffs after update', async ({ page, seedIds }) => {
    const nextName = `QOL Timeline ${Date.now()}`
    await setCookieConsent(page)
    await page.goto(`/quotes/${seedIds.quoteIds.draft}/edit`)
    await dismissCookieBanner(page)
    await dismissRestoreDraftPrompt(page)
    await page.getByPlaceholder('e.g., Anniversary Dinner - Premium Package').fill(nextName)
    await dismissCookieBanner(page)
    await dismissRestoreDraftPrompt(page)
    await page.getByRole('button', { name: /Save Changes/i }).click()
    await expect(page.getByLabel(/Save state: saved/i)).toBeVisible({ timeout: 15_000 })

    await page.goto(`/quotes/${seedIds.quoteIds.draft}`)

    await expect(page.getByRole('heading', { name: /Activity Timeline/i })).toBeVisible()
    await expect(page.getByText(/^Field$/i).first()).toBeVisible()
    await expect(page.getByText(/^Before$/i).first()).toBeVisible()
    await expect(page.getByText(/^After$/i).first()).toBeVisible()
    await expect(page.getByText(/Quote Name/i).first()).toBeVisible()
  })
})
