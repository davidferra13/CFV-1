// Event Detail Panels E2E Tests
// Verifies that the sub-pages and panels on the event detail page load.

import { test, expect } from '../helpers/fixtures'
import { createAdminClient } from '@/lib/db/admin'

const admin = createAdminClient()

async function setReadinessAssistantState(
  seedIds: {
    chefId: string
    eventIds: { completed: string }
  },
  mode: 'off' | 'quiet' | 'normal'
): Promise<boolean> {
  const prefsUpdate =
    mode === 'off'
      ? {
          event_readiness_assistant_enabled: false,
          event_readiness_assistant_default_mode: 'quiet',
        }
      : {
          event_readiness_assistant_enabled: true,
          event_readiness_assistant_default_mode: mode,
        }

  const { error: preferencesError } = await admin
    .from('chef_preferences')
    .update(prefsUpdate)
    .eq('chef_id', seedIds.chefId)

  if (preferencesError?.message.includes('event_readiness')) return false
  if (preferencesError) {
    throw new Error(
      `[readiness-assistant-e2e] Failed to update preferences: ${preferencesError.message}`
    )
  }

  const eventUpdate =
    mode === 'off'
      ? {
          readiness_assistant_enabled: false,
          readiness_assistant_mode: 'off',
        }
      : {
          readiness_assistant_enabled: true,
          readiness_assistant_mode: mode,
        }

  const { error: eventError } = await admin
    .from('events')
    .update(eventUpdate)
    .eq('id', seedIds.eventIds.completed)

  if (eventError?.message.includes('readiness_assistant')) return false
  if (eventError) {
    throw new Error(
      `[readiness-assistant-e2e] Failed to update event override: ${eventError.message}`
    )
  }

  return true
}

async function resetReadinessAssistantDismissals(seedIds: {
  chefId: string
  eventIds: { completed: string }
}): Promise<boolean> {
  const { error } = await admin
    .from('event_readiness_suggestion_dismissals')
    .delete()
    .eq('tenant_id', seedIds.chefId)
    .eq('event_id', seedIds.eventIds.completed)

  if (error?.message.includes('event_readiness_suggestion_dismissals')) return false
  if (error) {
    throw new Error(`[readiness-assistant-e2e] Failed to reset dismissals: ${error.message}`)
  }

  return true
}

test.describe('Events — Detail Panels and Sub-pages', () => {
  test('/events/[id]/pack — packing list page loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/pack`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/packing|pack list/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('/events/[id]/financial — financial summary loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/financial`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await page.waitForLoadState('networkidle')
    // "financial", "revenue", or "payment" text appears in the page heading/content
    await expect(page.getByText(/financial|revenue|payment/i).first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole('heading', { name: /pricing intelligence/i })).toBeVisible({
      timeout: 10_000,
    })
  })

  test('event readiness assistant respects normal, quiet, and off modes', async ({
    page,
    seedIds,
  }) => {
    const migrationApplied = await setReadinessAssistantState(seedIds, 'normal')
    test.skip(
      !migrationApplied,
      'Event Readiness Assistant migration has not been applied to this E2E DB.'
    )

    await page.goto(`/events/${seedIds.eventIds.completed}/financial`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /event readiness assistant/i })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText(/readiness:/i).first()).toBeVisible()
    await expect(page.getByText(/top checks/i)).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await setReadinessAssistantState(seedIds, 'quiet')
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /event readiness assistant/i })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole('button', { name: /view suggestions/i })).toBeVisible()
    await expect(page.getByText(/top checks/i)).toHaveCount(0)
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await setReadinessAssistantState(seedIds, 'off')
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /event readiness assistant/i })).toHaveCount(0)
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('event readiness assistant persists dismissals and can reset them', async ({
    page,
    seedIds,
  }) => {
    const migrationApplied =
      (await setReadinessAssistantState(seedIds, 'normal')) &&
      (await resetReadinessAssistantDismissals(seedIds))
    test.skip(
      !migrationApplied,
      'Event Readiness Assistant dismissal migration has not been applied to this E2E DB.'
    )

    await page.goto(`/events/${seedIds.eventIds.completed}/financial`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /event readiness assistant/i })).toBeVisible({
      timeout: 10_000,
    })

    const dismissButtons = page.getByRole('button', { name: /dismiss suggestion/i })
    const initialDismissibleCount = await dismissButtons.count()
    test.skip(
      initialDismissibleCount === 0,
      'Current E2E seed does not produce dismissible readiness suggestions.'
    )

    await dismissButtons.first().click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(dismissButtons).toHaveCount(initialDismissibleCount - 1)

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: /dismiss suggestion/i })).toHaveCount(
      initialDismissibleCount - 1
    )

    await page.getByRole('button', { name: /assistant settings/i }).click()
    await page.getByRole('button', { name: /reset dismissed/i }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /dismiss suggestion/i })).toHaveCount(
      initialDismissibleCount
    )
  })

  test('/events/[id]/receipts — receipt digitization page loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/receipts`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await page.waitForLoadState('networkidle')
    // Page should load without crashing
    await expect(page.getByText(/not found|500/i).first()).not.toBeVisible()
  })

  test('/events/[id]/debrief — post-event debrief loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/debrief`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/debrief|post.event|after.action/i).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('/events/[id]/invoice — invoice page loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/invoice`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/invoice/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('/events/[id]/travel — travel page loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/travel`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await page.waitForLoadState('networkidle')
    // Travel page just needs to not crash — may be empty if no travel data
    await expect(page.getByText(/not found|500/i).first()).not.toBeVisible()
  })

  test('event detail main page renders staff panel', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')
    // Scope to main content to avoid matching sidebar nav links
    const staffText = page
      .locator('main')
      .getByText(/staff|team/i)
      .first()
    await expect(staffText).toBeVisible({ timeout: 10_000 })
  })

  test('event detail main page renders menu approval section', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')
    // "Menu" appears in page body — scoped to main to avoid sidebar nav match
    const menuText = page.locator('main').getByText(/menu/i).first()
    await expect(menuText).toBeVisible({ timeout: 10_000 })
  })

  test('event detail main page renders contingency section', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')
    // Contingency/backup plan section
    await expect(page.getByText(/contingency|backup|plan/i).first()).toBeVisible({
      timeout: 10_000,
    })
  })
})
