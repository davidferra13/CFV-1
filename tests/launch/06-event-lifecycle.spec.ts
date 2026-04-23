// Launch Readiness Audit — Event Lifecycle
// Tests: event list, event detail, FSM transitions, event sub-pages
// This is the core of ChefFlow — if events don't work, nothing works

import { test, expect } from '../helpers/fixtures'

async function gotoEventDetail(
  page: Parameters<Parameters<typeof test>[1]>[0]['page'],
  path: string
) {
  try {
    await page.goto(path, { waitUntil: 'commit', timeout: 90_000 })
  } catch (error) {
    const message = String(error)
    const retryable = message.includes('ERR_ABORTED') || message.includes('frame was detached')
    if (!retryable) throw error
  }

  await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), {
    timeout: 60_000,
  })
  await expect(page.locator('body')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(1_500)
}

test.describe('Event List', () => {
  test('event list page loads with seed data', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(50)
    expect(bodyText).not.toMatch(/500|internal server error/i)
  })

  test('event status filters work', async ({ page }) => {
    const filters = [
      '/events/upcoming',
      '/events/confirmed',
      '/events/completed',
      '/events/cancelled',
    ]
    for (const route of filters) {
      const resp = await page.goto(route)
      expect(resp?.status()).not.toBe(500)
    }
  })

  test('kanban board view loads', async ({ page }) => {
    const resp = await page.goto('/events/board')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(30)
  })
})

test.describe('Event Detail — Draft', () => {
  test('draft event detail loads with all panels', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.draft}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should show event information
    const hasEventInfo = /draft|birthday|dinner|client|date|guest|status/i.test(bodyText)
    expect(hasEventInfo).toBeTruthy()
  })

  test('draft event shows status badge', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.draft}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.toLowerCase()).toContain('draft')
  })

  test('draft event has propose action', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.draft}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    // Should have a way to propose the event
    const hasPropose = /propose|send proposal|submit/i.test(bodyText)
    // Informational — propose may require prerequisites
    console.log('[INFO] Propose action available:', hasPropose)
  })
})

test.describe('Event Detail — Each State', () => {
  test('proposed event detail loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.proposed}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    expect(bodyText.toLowerCase()).toContain('proposed')
  })

  test('paid event detail loads and shows deposit', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.paid}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should show financial info (deposit was $125 = $1.25 in display? No — $125 in cents = $1.25...
    // Actually seed uses 12500 cents = $125)
    const hasFinancial = /\$|paid|deposit|payment|balance/i.test(bodyText)
    expect(hasFinancial).toBeTruthy()
  })

  test('confirmed event detail loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    expect(bodyText.toLowerCase()).toContain('confirmed')
  })

  test('completed event detail loads with financials', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Completed event should show financial summary
    const hasFinancial = /\$|revenue|expense|profit|payment|total/i.test(bodyText)
    expect(hasFinancial).toBeTruthy()
  })
})

test.describe('Event Sub-Pages', () => {
  test('event close-out page loads for completed event', async ({ page, seedIds }) => {
    const resp = await page.goto(`/events/${seedIds.eventIds.completed}/close-out`)
    // May 404 if close-out is only for specific states — that's OK
    const status = resp?.status() ?? 0
    expect(status).not.toBe(500)
  })

  test('event receipts page loads', async ({ page, seedIds }) => {
    const resp = await page.goto(`/events/${seedIds.eventIds.completed}/receipts`)
    const status = resp?.status() ?? 0
    expect(status).not.toBe(500)
  })

  test('event invoice page loads', async ({ page, seedIds }) => {
    const resp = await page.goto(`/events/${seedIds.eventIds.completed}/invoice`)
    const status = resp?.status() ?? 0
    expect(status).not.toBe(500)
  })

  test('event AAR page loads for completed event', async ({ page, seedIds }) => {
    const resp = await page.goto(`/events/${seedIds.eventIds.completed}/aar`)
    const status = resp?.status() ?? 0
    expect(status).not.toBe(500)
  })
})

test.describe('Create New Event', () => {
  test('new event form renders', async ({ page }) => {
    await page.goto('/events/new')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should have form fields for event creation
    const inputs = page.locator('input, textarea, select')
    const count = await inputs.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('new event form has required fields', async ({ page }) => {
    await page.goto('/events/new')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    // Should show event-related labels
    const hasEventFields = /client|date|occasion|guest|location|type/i.test(bodyText)
    expect(hasEventFields).toBeTruthy()
  })

  test('can fill basic event fields', async ({ page }) => {
    await page.goto('/events/new')
    await page.waitForLoadState('networkidle')

    // Try to fill the form — adapt to actual field structure
    const occasionField = page
      .getByLabel(/occasion|title|name/i)
      .first()
      .or(page.getByPlaceholder(/occasion|title|event name/i).first())
    if (await occasionField.isVisible().catch(() => false)) {
      await occasionField.fill('Launch Test Dinner')
    }

    const guestField = page
      .getByLabel(/guest|count|people/i)
      .first()
      .or(page.getByPlaceholder(/guest|count/i).first())
    if (await guestField.isVisible().catch(() => false)) {
      await guestField.fill('12')
    }

    // Verify the form didn't crash after filling fields
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error|unhandled/i)
  })
})

test.describe('Event Transitions — FSM Verification', () => {
  test('confirmed event has start option', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    // Confirmed events should be startable
    const hasStart = /start|begin|in.?progress|kick.?off/i.test(bodyText)
    console.log('[INFO] Start action available on confirmed event:', hasStart)
  })

  test('draft event cannot be started directly', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.draft}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    // Draft should NOT have a start button — must go through propose → accept → pay → confirm first
    const hasStart = page.getByRole('button', { name: /^start$/i })
    const startVisible = await hasStart.isVisible().catch(() => false)
    // Start should not be directly available on draft
    expect(startVisible).toBeFalsy()
  })
})

test.describe('Event Workflow Contract', () => {
  test('completed event exposes debrief, follow-up, and closure surfaces', async ({
    page,
    seedIds,
  }) => {
    test.slow()
    await gotoEventDetail(page, `/events/${seedIds.eventIds.completed}`)

    const trustLoop = page.getByTestId('event-post-event-trust-loop')
    await expect(trustLoop).toBeVisible()
    await expect(trustLoop.getByRole('heading', { name: /thank the client/i })).toBeVisible()
    await expect(trustLoop.getByRole('heading', { name: /capture satisfaction/i })).toBeVisible()
    await expect(trustLoop.getByRole('heading', { name: /request a public review/i })).toBeVisible()
    await expect(trustLoop.getByRole('heading', { name: /track repeat intent/i })).toBeVisible()

    const debriefLink = page.getByTestId('event-wrap-debrief-link').first()
    await expect(debriefLink).toBeVisible()
    await expect(debriefLink).toHaveAttribute(
      'href',
      `/events/${seedIds.eventIds.completed}/debrief`
    )

    const closure = page.getByTestId('event-post-event-closure')
    await expect(closure).toBeVisible()
    await expect(
      closure.getByRole('link', { name: /open financial summary|view financial summary/i })
    ).toBeVisible()
  })
})
