import { test, expect } from '../helpers/fixtures'
import type { Page } from '@playwright/test'

test.describe.configure({ timeout: 60_000 })

function futureDateTimeLocal(daysAhead = 21) {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  date.setHours(18, 30, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function waitForDraftDebounce(page: Page) {
  await page.waitForTimeout(1000)
}

async function fillEventCreateRequired(page: Page, suffix: string) {
  await page.locator('select').first().selectOption({ index: 1 })
  await page
    .getByPlaceholder('e.g., Wedding Reception, Corporate Dinner')
    .fill(`WLS Event ${suffix}`)
  await page.locator('input[type="datetime-local"]').fill(futureDateTimeLocal())
  await page.locator('input[type="time"]').fill('18:30')
  await page.getByPlaceholder('e.g., 8').fill('6')
  await page.getByPlaceholder('e.g., 123 Main St').fill('123 Work Loss Safe St')
  await page.getByPlaceholder('City').fill('Boston')
  await page.getByPlaceholder('ZIP').fill('02110')
  const pricingField = page.getByPlaceholder('e.g., 2500.00')
  const continueButton = page.getByRole('button', { name: /Continue/i })
  await continueButton.click()
  for (let attempt = 0; attempt < 20; attempt++) {
    if (await pricingField.isVisible().catch(() => false)) {
      break
    }
    const conflictOverride = page.getByRole('checkbox', { name: /I understand/i })
    if (await conflictOverride.isVisible().catch(() => false)) {
      if (!(await conflictOverride.isChecked().catch(() => false))) {
        await conflictOverride.check()
      }
    }
    if (
      (await continueButton.isVisible().catch(() => false)) &&
      (await continueButton.isEnabled().catch(() => false))
    ) {
      await continueButton.click()
    }
    await page.waitForTimeout(500)
  }
  await expect(pricingField).toBeVisible({ timeout: 10_000 })
  await pricingField.fill('1250')
}

async function fillInquiryCreateRequired(page: Page, suffix: string) {
  await page.locator('select').first().selectOption('email')
  await page.getByPlaceholder('e.g., Sarah & Mark Johnson').fill(`WLS Inquiry ${suffix}`)
}

async function fillQuoteCreateRequired(page: Page, suffix: string) {
  await page.locator('select').first().selectOption({ index: 1 })
  await page
    .getByPlaceholder('e.g., Anniversary Dinner - Premium Package')
    .fill(`WLS Quote ${suffix}`)
  await page.getByPlaceholder('e.g., 2500.00').fill('1800')
}

async function fillMenuCreateRequired(page: Page, suffix: string) {
  await page.getByPlaceholder('e.g., Summer BBQ Menu').fill(`WLS Menu ${suffix}`)
}

async function fillClientCreateRequired(page: Page, suffix: string) {
  await page.getByPlaceholder('Jane Doe').fill(`WLS Client ${suffix}`)
  await page.getByPlaceholder('client@example.com').fill(`wls.client.${suffix}@chefflow.test`)
}

async function expectRestoreAndRestore(
  page: Page,
  restoreValueLocator: ReturnType<Page['locator']>,
  expectedValue: string
) {
  await page.reload()
  await expect(page.getByRole('heading', { name: /Restore unsent draft\?/i })).toBeVisible()
  await page.getByRole('button', { name: /^Restore$/i }).click()
  await expect(restoreValueLocator).toHaveValue(expectedValue)
}

async function forceNextActionFailure(page: Page) {
  await page.evaluate(() => {
    const win = window as Window & {
      __wlsOriginalFetch?: typeof fetch
    }

    if (!win.__wlsOriginalFetch) {
      win.__wlsOriginalFetch = window.fetch.bind(window)
    }

    const originalFetch = win.__wlsOriginalFetch
    window.fetch = async (input, init) => {
      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined)
      )
      if (headers.has('next-action')) {
        throw new Error('Forced action failure for work-loss-safe test')
      }
      return originalFetch(input, init)
    }
  })

  return async () => {
    await page.evaluate(() => {
      const win = window as Window & {
        __wlsOriginalFetch?: typeof fetch
      }
      if (win.__wlsOriginalFetch) {
        window.fetch = win.__wlsOriginalFetch
      }
    })
  }
}

async function forceNextActionConflict(page: Page) {
  await page.evaluate(() => {
    const win = window as Window & {
      __wlsOriginalFetch?: typeof fetch
    }

    if (!win.__wlsOriginalFetch) {
      win.__wlsOriginalFetch = window.fetch.bind(window)
    }

    const originalFetch = win.__wlsOriginalFetch
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
      const looksLikeServerMutation =
        requestMethod === 'POST' &&
        (headers.has('next-action') ||
          (pathname.startsWith('/events/') && pathname.endsWith('/edit')) ||
          (pathname.startsWith('/quotes/') && pathname.endsWith('/edit')))

      if (looksLikeServerMutation) {
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
        __wlsOriginalFetch?: typeof fetch
      }
      if (win.__wlsOriginalFetch) {
        window.fetch = win.__wlsOriginalFetch
      }
    })
  }
}

async function dismissRestorePromptIfPresent(page: Page) {
  const heading = page.getByRole('heading', { name: /Restore unsent draft\?/i })
  if (await heading.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /^Discard$/i }).click()
  }
}

async function continueEventEditIfNeeded(page: Page) {
  const updateButton = page.getByRole('button', { name: /Update Event/i })
  if (await updateButton.isVisible().catch(() => false)) {
    return
  }

  const continueButton = page.getByRole('button', { name: /Continue/i })
  if (await continueButton.isVisible().catch(() => false)) {
    await continueButton.click()
    const override = page.getByRole('checkbox', { name: /I understand/i })
    if (
      !(await updateButton.isVisible().catch(() => false)) &&
      (await override.isVisible().catch(() => false))
    ) {
      await override.check()
      await continueButton.click()
    }
  }
}

test.describe('Work-Loss-Safe Editing - Events', () => {
  test('Event form - Draft restore', async ({ page }) => {
    const suffix = String(Date.now())
    const occasion = `WLS Event Draft ${suffix}`

    await page.goto('/events/new')
    await page.getByPlaceholder('e.g., Wedding Reception, Corporate Dinner').fill(occasion)
    await page.getByPlaceholder('e.g., 8').fill('7')
    await waitForDraftDebounce(page)

    await expectRestoreAndRestore(
      page,
      page.getByPlaceholder('e.g., Wedding Reception, Corporate Dinner'),
      occasion
    )
    await expect(page.getByPlaceholder('e.g., 8')).toHaveValue('7')
  })

  test('Event form - Offline queue', async ({ page }) => {
    const suffix = String(Date.now())
    await page.goto('/events/new')
    await fillEventCreateRequired(page, suffix)

    await page.context().setOffline(true)
    await page.getByRole('button', { name: /Create Event/i }).click()
    await expect(page.getByTestId('save-state-badge')).toContainText(/Offline queued/i)

    await page.context().setOffline(false)
    await page.reload()
    await expect(page.getByRole('heading', { name: /Restore unsent draft\?/i })).toBeVisible()
  })

  test('Event form - Navigation guard', async ({ page }) => {
    const suffix = String(Date.now())
    const occasion = `WLS Event Nav ${suffix}`

    await page.goto('/dashboard')
    await page.goto('/events/new')
    await page.getByPlaceholder('e.g., Wedding Reception, Corporate Dinner').fill(occasion)

    await page.getByRole('button', { name: /^Cancel$/i }).click()
    await expect(page.getByRole('heading', { name: /Leave without saving\?/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Save draft & leave/i })).toBeVisible()
    await page.getByRole('button', { name: /^Stay$/i }).click()
    await expect(page.getByPlaceholder('e.g., Wedding Reception, Corporate Dinner')).toHaveValue(
      occasion
    )

    await page.getByRole('button', { name: /^Cancel$/i }).click()
    await page.getByRole('button', { name: /^Leave$/i }).click()
    await expect.poll(() => page.url(), { timeout: 15_000 }).not.toMatch(/\/events\/new/)
  })

  test('Event form - Save failure does not lose work', async ({ page }) => {
    const suffix = String(Date.now())
    await page.goto('/events/new')
    await fillEventCreateRequired(page, suffix)

    const cleanupRoute = await forceNextActionFailure(page)
    await page.getByRole('button', { name: /Create Event/i }).click()
    await expect(page.getByTestId('save-state-badge')).toContainText(/Save failed/i, {
      timeout: 15_000,
    })
    await cleanupRoute()

    await page.reload()
    await expect(page.getByRole('heading', { name: /Restore unsent draft\?/i })).toBeVisible()
  })

  test('Event form - Conflict handling (edit page)', async ({ context, seedIds }) => {
    const pageA = await context.newPage()
    const pageB = await context.newPage()

    await pageA.goto(`/events/${seedIds.eventIds.draft}/edit`)
    await pageB.goto(`/events/${seedIds.eventIds.draft}/edit`)
    await dismissRestorePromptIfPresent(pageA)
    await dismissRestorePromptIfPresent(pageB)

    await continueEventEditIfNeeded(pageA)
    await continueEventEditIfNeeded(pageB)

    await pageA.getByPlaceholder('e.g., 2500.00').fill('1999')
    await pageA.getByRole('button', { name: /Update Event/i }).click()
    const navigatedToDetail = await pageA
      .waitForURL(new RegExp(`/events/${seedIds.eventIds.draft}$`), { timeout: 15_000 })
      .then(() => true)
      .catch(() => false)
    if (!navigatedToDetail) {
      await expect(pageA.getByLabel(/Save state: saved/i)).toBeVisible({ timeout: 15_000 })
    }

    const cleanupConflict = await forceNextActionConflict(pageB)
    await pageB.getByPlaceholder('e.g., 2500.00').fill('2111')
    await pageB.getByRole('button', { name: /Update Event/i }).click()
    await expect(
      pageB.getByRole('heading', { name: /This record changed elsewhere\./i })
    ).toBeVisible({ timeout: 15_000 })
    await cleanupConflict()

    await pageA.close()
    await pageB.close()
  })
})

test.describe('Work-Loss-Safe Editing - Inquiries', () => {
  test('Inquiry form - Draft restore', async ({ page }) => {
    const suffix = String(Date.now())
    const clientName = `WLS Inquiry Draft ${suffix}`

    await page.goto('/inquiries/new')
    await page.getByPlaceholder('e.g., Sarah & Mark Johnson').fill(clientName)
    await waitForDraftDebounce(page)

    await expectRestoreAndRestore(
      page,
      page.getByPlaceholder('e.g., Sarah & Mark Johnson'),
      clientName
    )
  })

  test('Inquiry form - Offline queue', async ({ page }) => {
    const suffix = String(Date.now())
    await page.goto('/inquiries/new')
    await fillInquiryCreateRequired(page, suffix)

    await page.context().setOffline(true)
    await page.getByRole('button', { name: /Log Inquiry/i }).click()
    await expect(page.getByTestId('save-state-badge')).toContainText(/Offline queued/i)

    await page.context().setOffline(false)
    await page.reload()
    await expect(page.getByRole('heading', { name: /Restore unsent draft\?/i })).toBeVisible()
  })

  test('Inquiry form - Navigation guard', async ({ page }) => {
    const suffix = String(Date.now())
    const clientName = `WLS Inquiry Nav ${suffix}`

    await page.goto('/dashboard')
    await page.goto('/inquiries/new')
    await page.getByPlaceholder('e.g., Sarah & Mark Johnson').fill(clientName)

    await page.getByRole('button', { name: /^Cancel$/i }).click()
    await expect(page.getByRole('heading', { name: /Leave without saving\?/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Save draft & leave/i })).toBeVisible()
    await page.getByRole('button', { name: /^Stay$/i }).click()
    await expect(page.getByPlaceholder('e.g., Sarah & Mark Johnson')).toHaveValue(clientName)

    await page.getByRole('button', { name: /^Cancel$/i }).click()
    await page.getByRole('button', { name: /^Leave$/i }).click()
    await expect.poll(() => page.url(), { timeout: 15_000 }).not.toMatch(/\/inquiries\/new/)
  })

  test('Inquiry form - Save failure does not lose work', async ({ page }) => {
    const suffix = String(Date.now())
    await page.goto('/inquiries/new')
    await fillInquiryCreateRequired(page, suffix)

    const cleanupRoute = await forceNextActionFailure(page)
    await page.getByRole('button', { name: /Log Inquiry/i }).click()
    await expect(page.getByTestId('save-state-badge')).toContainText(/Save failed/i, {
      timeout: 15_000,
    })
    await cleanupRoute()

    await page.reload()
    await expect(page.getByRole('heading', { name: /Restore unsent draft\?/i })).toBeVisible()
  })
})

test.describe('Work-Loss-Safe Editing - Quotes', () => {
  test('Quote form - Draft restore', async ({ page }) => {
    const suffix = String(Date.now())
    const quoteName = `WLS Quote Draft ${suffix}`

    await page.goto('/quotes/new')
    await page.getByPlaceholder('e.g., Anniversary Dinner - Premium Package').fill(quoteName)
    await waitForDraftDebounce(page)

    await expectRestoreAndRestore(
      page,
      page.getByPlaceholder('e.g., Anniversary Dinner - Premium Package'),
      quoteName
    )
  })

  test('Quote form - Offline queue', async ({ page }) => {
    const suffix = String(Date.now())
    await page.goto('/quotes/new')
    await fillQuoteCreateRequired(page, suffix)

    await page.context().setOffline(true)
    await page.getByRole('button', { name: /Create Quote/i }).click()
    await expect(page.getByTestId('save-state-badge')).toContainText(/Offline queued/i)

    await page.context().setOffline(false)
    await page.reload()
    await expect(page.getByRole('heading', { name: /Restore unsent draft\?/i })).toBeVisible()
  })

  test('Quote form - Navigation guard', async ({ page }) => {
    const suffix = String(Date.now())
    const quoteName = `WLS Quote Nav ${suffix}`

    await page.goto('/dashboard')
    await page.goto('/quotes/new')
    await page.getByPlaceholder('e.g., Anniversary Dinner - Premium Package').fill(quoteName)

    await page.getByRole('button', { name: /^Cancel$/i }).click()
    await expect(page.getByRole('heading', { name: /Leave without saving\?/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Save draft & leave/i })).toBeVisible()
    await page.getByRole('button', { name: /^Stay$/i }).click()
    await expect(page.getByPlaceholder('e.g., Anniversary Dinner - Premium Package')).toHaveValue(
      quoteName
    )

    await page.getByRole('button', { name: /^Cancel$/i }).click()
    await page.getByRole('button', { name: /^Leave$/i }).click()
    await expect(page).not.toHaveURL(/\/quotes\/new/)
  })

  test('Quote form - Save failure does not lose work', async ({ page }) => {
    const suffix = String(Date.now())
    await page.goto('/quotes/new')
    await fillQuoteCreateRequired(page, suffix)

    const cleanupRoute = await forceNextActionFailure(page)
    await page.getByRole('button', { name: /Create Quote/i }).click()
    await expect(page.getByTestId('save-state-badge')).toContainText(/Save failed/i, {
      timeout: 15_000,
    })
    await cleanupRoute()

    await page.reload()
    await expect(page.getByRole('heading', { name: /Restore unsent draft\?/i })).toBeVisible()
  })

  test('Quote form - Conflict handling (edit page)', async ({ context, seedIds }) => {
    const pageA = await context.newPage()
    const pageB = await context.newPage()

    await pageA.goto(`/quotes/${seedIds.quoteIds.draft}/edit`)
    await pageB.goto(`/quotes/${seedIds.quoteIds.draft}/edit`)
    await dismissRestorePromptIfPresent(pageA)
    await dismissRestorePromptIfPresent(pageB)

    await pageA
      .getByPlaceholder('e.g., Anniversary Dinner - Premium Package')
      .fill(`WLS Conflict A ${Date.now()}`)
    await pageA.getByRole('button', { name: /Save Changes/i }).click()
    await expect(pageA.getByLabel(/Save state: saved/i)).toBeVisible({ timeout: 15_000 })

    await pageB
      .getByPlaceholder('e.g., Anniversary Dinner - Premium Package')
      .fill(`WLS Conflict B ${Date.now()}`)
    const cleanupConflict = await forceNextActionConflict(pageB)
    await pageB.getByRole('button', { name: /Save Changes/i }).click()
    await expect(
      pageB.getByRole('heading', { name: /This record changed elsewhere\./i })
    ).toBeVisible({
      timeout: 15_000,
    })
    await cleanupConflict()

    await pageA.close()
    await pageB.close()
  })
})

test.describe('Work-Loss-Safe Editing - Menus', () => {
  test('Menu form - Draft restore', async ({ page }) => {
    const suffix = String(Date.now())
    const menuName = `WLS Menu Draft ${suffix}`

    await page.goto('/menus/new')
    await page.getByPlaceholder('e.g., Summer BBQ Menu').fill(menuName)
    await waitForDraftDebounce(page)

    await expectRestoreAndRestore(page, page.getByPlaceholder('e.g., Summer BBQ Menu'), menuName)
  })

  test('Menu form - Offline queue', async ({ page }) => {
    const suffix = String(Date.now())
    await page.goto('/menus/new')
    await fillMenuCreateRequired(page, suffix)

    await page.context().setOffline(true)
    await page.getByRole('button', { name: /Create Menu/i }).click()
    await expect(page.getByTestId('save-state-badge')).toContainText(/Offline queued/i)

    await page.context().setOffline(false)
    await page.reload()
    await expect(page.getByRole('heading', { name: /Restore unsent draft\?/i })).toBeVisible()
  })

  test('Menu form - Navigation guard', async ({ page }) => {
    const suffix = String(Date.now())
    const menuName = `WLS Menu Nav ${suffix}`

    await page.goto('/dashboard')
    await page.goto('/menus/new')
    await page.getByPlaceholder('e.g., Summer BBQ Menu').fill(menuName)

    await page.getByRole('button', { name: /^Cancel$/i }).click()
    await expect(page.getByRole('heading', { name: /Leave without saving\?/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Save draft & leave/i })).toBeVisible()
    await page.getByRole('button', { name: /^Stay$/i }).click()
    await expect(page.getByPlaceholder('e.g., Summer BBQ Menu')).toHaveValue(menuName)

    await page.getByRole('button', { name: /^Cancel$/i }).click()
    await page.getByRole('button', { name: /^Leave$/i }).click()
    await expect(page).not.toHaveURL(/\/menus\/new/)
  })

  test('Menu form - Save failure does not lose work', async ({ page }) => {
    const suffix = String(Date.now())
    await page.goto('/menus/new')
    await fillMenuCreateRequired(page, suffix)

    const cleanupRoute = await forceNextActionFailure(page)
    await page.getByRole('button', { name: /Create Menu/i }).click()
    await expect(page.getByTestId('save-state-badge')).toContainText(/Save failed/i, {
      timeout: 15_000,
    })
    await cleanupRoute()

    await page.reload()
    await expect(page.getByRole('heading', { name: /Restore unsent draft\?/i })).toBeVisible()
  })
})

test.describe('Work-Loss-Safe Editing - Clients', () => {
  test('Client form - Draft restore', async ({ page }) => {
    const suffix = String(Date.now())
    const clientName = `WLS Client Draft ${suffix}`

    await page.goto('/clients/new')
    await page.getByPlaceholder('Jane Doe').fill(clientName)
    await waitForDraftDebounce(page)

    await expectRestoreAndRestore(page, page.getByPlaceholder('Jane Doe'), clientName)
  })

  test('Client form - Offline queue', async ({ page }) => {
    const suffix = String(Date.now())
    await page.goto('/clients/new')
    await fillClientCreateRequired(page, suffix)

    await page.context().setOffline(true)
    await page.getByRole('button', { name: /Add Client/i }).click()
    await expect(page.getByTestId('save-state-badge')).toContainText(/Offline queued/i)

    await page.context().setOffline(false)
    await page.reload()
    await expect(page.getByRole('heading', { name: /Restore unsent draft\?/i })).toBeVisible()
  })

  test('Client form - Navigation guard', async ({ page }) => {
    const suffix = String(Date.now())
    const clientName = `WLS Client Nav ${suffix}`

    await page.goto('/dashboard')
    await page.goto('/clients/new')
    await page.getByPlaceholder('Jane Doe').fill(clientName)

    await page.getByRole('button', { name: /^Cancel$/i }).click()
    await expect(page.getByRole('heading', { name: /Leave without saving\?/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Save draft & leave/i })).toBeVisible()
    await page.getByRole('button', { name: /^Stay$/i }).click()
    await expect(page.getByPlaceholder('Jane Doe')).toHaveValue(clientName)

    await page.getByRole('button', { name: /^Cancel$/i }).click()
    await page.getByRole('button', { name: /^Leave$/i }).click()
    await expect(page).toHaveURL(/\/clients(?:$|\/|\?)/, { timeout: 15000 })
  })

  test('Client form - Save failure does not lose work', async ({ page }) => {
    const suffix = String(Date.now())
    await page.goto('/clients/new')
    await fillClientCreateRequired(page, suffix)

    const cleanupRoute = await forceNextActionFailure(page)
    await page.getByRole('button', { name: /Add Client/i }).click()
    await expect(page.getByTestId('save-state-badge')).toContainText(/Save failed/i, {
      timeout: 15_000,
    })
    await cleanupRoute()

    await page.reload()
    await expect(page.getByRole('heading', { name: /Restore unsent draft\?/i })).toBeVisible()
  })
})
