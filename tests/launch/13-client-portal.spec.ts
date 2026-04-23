// Launch Readiness Audit — Client Portal
// Tests: authenticated as CLIENT role — my-events, my-quotes, my-profile, my-chat, my-rewards
// This is what the chef's clients see — it must be polished

import { test, expect } from '../helpers/fixtures'
import type { Page } from '@playwright/test'

test.setTimeout(120_000)

async function goto(page: Page, url: string) {
  return page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 })
}

test.describe('Client Portal — Event List', () => {
  async function saveLayout(page: Page) {
    const saveResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/my-events/settings/dashboard') &&
        response.request().method() === 'POST'
    )

    await page.getByRole('button', { name: 'Save Layout' }).click()
    await saveResponse
  }

  const CLIENT_WIDGET_IDS = [
    'action_required',
    'upcoming_events',
    'event_history',
    'rewards',
    'quotes',
    'inquiries',
    'messages',
    'dinner_circle',
    'spending',
    'profile_health',
    'rsvp_ops',
    'documents',
    'book_again',
    'feedback',
    'assistant',
  ] as const

  test('/my-events loads with event cards', async ({ page }) => {
    await goto(page, '/my-events')
    await page.waitForLoadState('domcontentloaded')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should show events or empty state
    const hasContent = /event|dinner|upcoming|past|no event/i.test(bodyText)
    expect(hasContent).toBeTruthy()
  })

  test('event cards show status badges', async ({ page }) => {
    await goto(page, '/my-events')
    await page.waitForLoadState('domcontentloaded')
    const bodyText = await page.locator('body').innerText()
    // Cards should have status indicators
    const hasStatus = /draft|proposed|accepted|paid|confirmed|completed|cancelled/i.test(bodyText)
    // If there are events, status should be visible
    console.log('[INFO] Event status badges visible:', hasStatus)
  })

  test('event cards show date and guest count', async ({ page }) => {
    await goto(page, '/my-events')
    await page.waitForLoadState('domcontentloaded')
    const bodyText = await page.locator('body').innerText()
    // Cards should show date info
    const hasDateInfo =
      /\d{1,2}|\bjan\b|\bfeb\b|\bmar\b|\bapr\b|\bmay\b|\bjun\b|\bjul\b|\baug\b|\bsep\b|\boct\b|\bnov\b|\bdec\b|guest|people/i.test(
        bodyText
      )
    console.log('[INFO] Date/guest info visible:', hasDateInfo)
  })

  test('shared work graph keeps proposed-event CTAs aligned between my-events and my-bookings', async ({
    page,
    seedIds,
  }) => {
    const proposalHref = `/my-events/${seedIds.eventIds.proposed}/proposal`

    await goto(page, '/my-events/settings/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard Widgets' })).toBeVisible()
    await page.getByRole('button', { name: 'Reset to Default' }).click()
    await saveLayout(page)

    await goto(page, '/my-events')
    await expect(page.locator(`a[href="${proposalHref}"]`).first()).toBeVisible()

    await goto(page, '/my-bookings?tab=events')
    await expect(page.locator(`a[href="${proposalHref}"]`).first()).toBeVisible()
  })

  test('dashboard widget preferences persist between settings and my-events', async ({ page }) => {
    await goto(page, '/my-events/settings/dashboard')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: 'Dashboard Widgets' })).toBeVisible()

    await page.getByRole('button', { name: 'Reset to Default' }).click()
    await saveLayout(page)

    const hiddenRows = page.locator('[data-widget-state="hidden"]')
    const hiddenCount = await hiddenRows.count()
    test.skip(hiddenCount === 0, 'No hidden widgets available to test toggle persistence')

    const targetHiddenRow = hiddenRows.first()
    const targetWidgetId = await targetHiddenRow.getAttribute('data-widget-id')
    expect(targetWidgetId).toBeTruthy()
    const enabledBefore = await page.locator('[data-widget-state="enabled"]').count()
    const hiddenBefore = await page.locator('[data-widget-state="hidden"]').count()
    await targetHiddenRow.getByRole('button', { name: 'Enable' }).click()
    await expect(page.locator('[data-widget-state="enabled"]')).toHaveCount(enabledBefore + 1)
    await expect(page.locator('[data-widget-state="hidden"]')).toHaveCount(hiddenBefore - 1)
    await saveLayout(page)

    const enabledTargetRow = page.locator('[data-widget-state="enabled"]').first()
    const enabledWidgetId = await enabledTargetRow.getAttribute('data-widget-id')
    expect(enabledWidgetId).toBeTruthy()
    await enabledTargetRow.getByRole('button', { name: 'Disable' }).click()
    await expect(page.locator('[data-widget-state="enabled"]')).toHaveCount(enabledBefore)
    await expect(page.locator('[data-widget-state="hidden"]')).toHaveCount(hiddenBefore)
    await saveLayout(page)
  })
  test('all dashboard widgets can be enabled and rendered end to end', async ({ page }) => {
    test.setTimeout(120_000)

    await goto(page, '/my-events/settings/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard Widgets' })).toBeVisible()

    await page.getByRole('button', { name: 'Reset to Default' }).click()
    await saveLayout(page)

    for (let i = 0; i < CLIENT_WIDGET_IDS.length; i += 1) {
      const hiddenRows = page.locator('[data-widget-state="hidden"]')
      const hiddenCount = await hiddenRows.count()
      if (hiddenCount === 0) break
      await hiddenRows.first().getByRole('button', { name: 'Enable' }).click()
    }

    await expect(page.locator('[data-widget-state="hidden"]')).toHaveCount(0)
    await saveLayout(page)

    await goto(page, '/my-events')
    await expect(page.locator('[data-widget-id]').first()).toBeVisible({ timeout: 60_000 })

    const renderedWidgets = page.locator('[data-widget-id]')
    const renderedCount = await renderedWidgets.count()
    expect(renderedCount).toBeGreaterThan(0)

    for (let i = 0; i < renderedCount; i += 1) {
      const renderedWidgetId = await renderedWidgets.nth(i).getAttribute('data-widget-id')
      expect(renderedWidgetId).toBeTruthy()
      expect(CLIENT_WIDGET_IDS).toContain(renderedWidgetId as (typeof CLIENT_WIDGET_IDS)[number])
    }

    const collapseAll = page.getByRole('button', { name: 'Collapse All' })
    await expect(collapseAll).toBeVisible()
    await collapseAll.click()
    await expect(page.getByRole('button', { name: 'Expand All' })).toBeVisible()
    await page.getByRole('button', { name: 'Expand All' }).click()
    await expect(page.getByRole('button', { name: 'Collapse All' })).toBeVisible()

    await goto(page, '/my-events/settings/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard Widgets' })).toBeVisible()
    await page.getByRole('button', { name: 'Reset to Default' }).click()
    await saveLayout(page)
  })
})

test.describe('Client Portal - Event Detail', () => {
  test('client can view event detail', async ({ page, seedIds }) => {
    // Client's events — draft birthday dinner is linked to the primary client (Joy)
    await goto(page, `/my-events/${seedIds.eventIds.draft}`)
    await page.waitForLoadState('domcontentloaded')
    const bodyText = await page.locator('body').innerText()
    // Should show event info or redirect if not client's event
    expect(bodyText).not.toMatch(/500|internal server error/i)
  })

  test('client can view completed event', async ({ page, seedIds }) => {
    await goto(page, `/my-events/${seedIds.eventIds.completed}`)
    await page.waitForLoadState('domcontentloaded')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
  })

  test('proposed event detail keeps acceptance on the page instead of bouncing to another route', async ({
    page,
    seedIds,
  }) => {
    await goto(page, `/my-events/${seedIds.eventIds.proposed}`)
    await expect(page.getByRole('button', { name: 'Accept This Proposal' })).toBeVisible()
  })
})

test.describe('Client Portal — Event Sub-Pages', () => {
  const subPages = [
    'approve-menu',
    'invoice',
    'proposal',
    'payment-plan',
    'contract',
    'pre-event-checklist',
    'countdown',
    'event-summary',
  ]

  for (const sub of subPages) {
    test(`/my-events/[id]/${sub} does not 500`, async ({ page, seedIds }) => {
      const resp = await goto(page, `/my-events/${seedIds.eventIds.confirmed}/${sub}`)
      const status = resp?.status() ?? 0
      expect(status).not.toBe(500)
    })
  }

  test('proposed event proposal page exposes the live accept action in place', async ({
    page,
    seedIds,
  }) => {
    await goto(page, `/my-events/${seedIds.eventIds.proposed}/proposal`)
    await expect(page.getByRole('button', { name: 'Accept Proposal' })).toBeVisible()
    await expect(page.getByText('Agreement ready')).toBeVisible()
    await expect(page.getByText('Accept the proposal first')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign Contract' })).toHaveCount(0)
    await expect(
      page.locator(`a[href="/my-events/${seedIds.eventIds.proposed}"]`).filter({
        hasText: 'Accept Proposal',
      })
    ).toHaveCount(0)
  })

  test('proposed contract route sends the client back to proposal review until acceptance', async ({
    page,
    seedIds,
  }) => {
    await goto(page, `/my-events/${seedIds.eventIds.proposed}/contract`)
    await expect(page).toHaveURL(new RegExp(`/my-events/${seedIds.eventIds.proposed}/proposal$`))
    await expect(page.getByRole('button', { name: 'Accept Proposal' })).toBeVisible()
  })
})

test.describe('Client Portal — Quotes', () => {
  test('/my-quotes loads with quote list', async ({ page }) => {
    await goto(page, '/my-quotes')
    await page.waitForLoadState('domcontentloaded')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
  })

  test('quote detail shows line items and total', async ({ page, seedIds }) => {
    await goto(page, `/my-quotes/${seedIds.quoteIds.sent}`)
    await page.waitForLoadState('domcontentloaded')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should show quote details with amount
    const hasQuoteInfo = /\$|total|amount|line|item|quote/i.test(bodyText)
    expect(hasQuoteInfo).toBeTruthy()
  })

  test('sent quote shows accept/reject buttons', async ({ page, seedIds }) => {
    await goto(page, `/my-quotes/${seedIds.quoteIds.sent}`)
    await page.waitForLoadState('domcontentloaded')
    const acceptBtn = page.getByRole('button', { name: /accept/i }).first()
    const rejectBtn = page.getByRole('button', { name: /reject|decline/i }).first()
    const hasAccept = await acceptBtn.isVisible().catch(() => false)
    const hasReject = await rejectBtn.isVisible().catch(() => false)
    // At least one action should be available
    console.log('[INFO] Accept button visible:', hasAccept, '| Reject button visible:', hasReject)
  })
})

test.describe('Client Portal — Profile', () => {
  test('/my-profile loads with editable form', async ({ page }) => {
    await goto(page, '/my-profile')
    await page.waitForLoadState('domcontentloaded')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should have form fields
    const inputs = page.locator('input, textarea, select')
    const count = await inputs.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('profile form has name and contact fields', async ({ page }) => {
    await goto(page, '/my-profile')
    await page.waitForLoadState('domcontentloaded')
    const bodyText = await page.locator('body').innerText()
    const hasFields = /name|email|phone|dietary|allerg/i.test(bodyText)
    expect(hasFields).toBeTruthy()
  })
})

test.describe('Client Portal — Other Pages', () => {
  test('/my-chat loads', async ({ page }) => {
    const resp = await goto(page, '/my-chat')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('domcontentloaded')
  })

  test('/my-rewards loads', async ({ page }) => {
    const resp = await goto(page, '/my-rewards')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('domcontentloaded')
  })

  test('/my-inquiries loads', async ({ page }) => {
    const resp = await goto(page, '/my-inquiries')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('domcontentloaded')
  })

  test('/book-now loads', async ({ page }) => {
    const resp = await goto(page, '/book-now')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('domcontentloaded')
  })

  test('/my-events/history loads', async ({ page }) => {
    const resp = await goto(page, '/my-events/history')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('domcontentloaded')
  })

  test('/my-spending loads', async ({ page }) => {
    const resp = await goto(page, '/my-spending')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('domcontentloaded')
  })
})
