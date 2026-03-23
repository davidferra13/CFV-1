import { test, expect } from '../helpers/fixtures'
import { createAdminClient } from '@/lib/supabase/admin'

const TRANSIENT_500_TEXT = /internal server error/i

function getAdminSupabase() {
  return createAdminClient()
}

function daysFromNow(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

async function gotoWithRetryOn500(page: any, url: string, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    const has500 = await page
      .getByText(TRANSIENT_500_TEXT)
      .first()
      .isVisible()
      .catch(() => false)

    if (!has500) return
    if (attempt < attempts) {
      await page.waitForTimeout(1_000 * attempt)
      await page.reload({ waitUntil: 'domcontentloaded' })
    }
  }

  await expect(page.getByText(TRANSIENT_500_TEXT)).toHaveCount(0)
}

async function dismissBlockingModals(page: any) {
  const skipWelcomeButton = page.getByRole('button', { name: /skip for now/i }).first()
  if (await skipWelcomeButton.isVisible().catch(() => false)) {
    await skipWelcomeButton.click()
    await page.waitForTimeout(300)
  }
}

async function markAllManualReadinessItems(page: any) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await page.waitForLoadState('domcontentloaded')
    await dismissBlockingModals(page)

    const markDoneButton = page.getByRole('button', { name: /^Mark Done$/i }).first()
    const canMark = await markDoneButton.isVisible().catch(() => false)

    if (!canMark) return

    await markDoneButton.click()
    await page.waitForTimeout(1_250)
  }

  throw new Error('[private-chef-service] Timed out clearing manual readiness items')
}

test.describe('Private Chef Service Golden Path', () => {
  test.setTimeout(240_000)

  test('paid private dinner is blocked until readiness is cleared, then moves through service completion', async ({
    page,
    seedIds,
  }) => {
    const admin = getAdminSupabase()
    const suffix = Date.now().toString()
    const occasion = `TEST Private Chef Service ${suffix}`

    const { data: eventRow, error: eventError } = await admin
      .from('events')
      .insert({
        tenant_id: seedIds.chefId,
        client_id: seedIds.clientId,
        event_date: daysFromNow(7),
        serve_time: '19:00:00',
        guest_count: 6,
        occasion,
        location_address: '400 Service Path Lane',
        location_city: 'Boston',
        location_state: 'MA',
        location_zip: '02118',
        status: 'paid',
        service_style: 'plated',
        dietary_restrictions: [],
        allergies: [],
        special_requests: 'Automated private-chef service golden-path test.',
        pricing_model: 'flat_rate',
        quoted_price_cents: 156000,
        deposit_amount_cents: 0,
      })
      .select('id')
      .single()

    if (eventError || !eventRow) {
      throw new Error('[private-chef-service] Failed to create service event fixture')
    }

    const eventId = eventRow.id as string

    const { data: menuRow, error: menuError } = await admin
      .from('menus')
      .insert({
        tenant_id: seedIds.chefId,
        event_id: eventId,
        name: `TEST 4-Course Service Menu ${suffix}`,
        description: 'Automated service-path menu for readiness enforcement.',
        status: 'draft',
        is_template: false,
      })
      .select('id')
      .single()

    if (menuError || !menuRow) {
      throw new Error('[private-chef-service] Failed to create service menu fixture')
    }

    const dishes = [
      { course_number: 1, course_name: 'First Course' },
      { course_number: 2, course_name: 'Second Course' },
      { course_number: 3, course_name: 'Main Course' },
      { course_number: 4, course_name: 'Dessert' },
    ]

    const { data: dishRows, error: dishError } = await admin
      .from('dishes')
      .insert(
        dishes.map((dish) => ({
          tenant_id: seedIds.chefId,
          menu_id: menuRow.id,
          course_number: dish.course_number,
          course_name: `TEST ${dish.course_name} ${suffix}`,
          sort_order: dish.course_number,
          dietary_tags: [],
          allergen_flags: [],
        }))
      )
      .select('id')

    if (dishError || !dishRows || dishRows.length !== dishes.length) {
      throw new Error('[private-chef-service] Failed to create course fixtures')
    }

    await gotoWithRetryOn500(page, `/events/${eventId}`)
    await dismissBlockingModals(page)
    await expect(page.getByRole('heading', { name: occasion })).toBeVisible({ timeout: 30_000 })

    const confirmButton = page.getByRole('button', { name: /confirm event/i }).first()
    await expect(confirmButton).toBeDisabled()
    await expect(page.getByText(/menu approved by client/i).first()).toBeVisible()
    await expect(page.getByText(/documents ready/i).first()).toBeVisible()

    const approvalTimestamp = new Date().toISOString()
    const { error: approvalInsertError } = await admin.from('menu_approval_requests').insert({
      event_id: eventId,
      chef_id: seedIds.chefId,
      client_id: seedIds.clientId,
      menu_snapshot: [
        {
          menu_name: `TEST 4-Course Service Menu ${suffix}`,
          dishes: dishes.map((dish) => dish.course_name),
        },
      ],
      sent_at: approvalTimestamp,
      responded_at: approvalTimestamp,
      status: 'approved',
    })

    if (approvalInsertError) {
      throw new Error('[private-chef-service] Failed to seed approved menu request')
    }

    const { error: approvalEventUpdateError } = await admin
      .from('events')
      .update({
        menu_approval_status: 'approved',
        menu_sent_at: approvalTimestamp,
        menu_approved_at: approvalTimestamp,
      })
      .eq('id', eventId)

    if (approvalEventUpdateError) {
      throw new Error('[private-chef-service] Failed to sync event menu approval state')
    }

    await page.reload({ waitUntil: 'domcontentloaded' })
    await dismissBlockingModals(page)
    await expect(confirmButton).toBeDisabled()
    await expect(page.getByText(/documents ready/i).first()).toBeVisible()

    const { error: docsUpdateError } = await admin.from('components').insert(
      dishRows.map((dish: any, index: number) => ({
        tenant_id: seedIds.chefId,
        dish_id: dish.id,
        name: `TEST Component ${index + 1} ${suffix}`,
        category: 'other',
        sort_order: index + 1,
      }))
    )

    if (docsUpdateError) {
      throw new Error(
        `[private-chef-service] Failed to make prep-sheet inputs ready: ${docsUpdateError.message}`
      )
    }

    await page.reload({ waitUntil: 'domcontentloaded' })
    await dismissBlockingModals(page)
    await expect(confirmButton).toBeEnabled({ timeout: 15_000 })
    await confirmButton.click()

    await expect
      .poll(
        async () => {
          const { data } = await admin.from('events').select('status').eq('id', eventId).single()
          return data?.status ?? 'missing'
        },
        { timeout: 60_000 }
      )
      .toBe('confirmed')

    await page.reload({ waitUntil: 'domcontentloaded' })
    await dismissBlockingModals(page)
    const startButton = page.getByRole('button', { name: /start event|start service/i }).first()
    await expect(startButton).toBeDisabled()
    await expect(page.getByText(/packing list reviewed/i).first()).toBeVisible()
    await expect(page.getByText(/equipment confirmed/i).first()).toBeVisible()

    await markAllManualReadinessItems(page)
    await expect(startButton).toBeEnabled({ timeout: 15_000 })
    await startButton.click()

    await expect
      .poll(
        async () => {
          const { data } = await admin.from('events').select('status').eq('id', eventId).single()
          return data?.status ?? 'missing'
        },
        { timeout: 60_000 }
      )
      .toBe('in_progress')

    await page.reload({ waitUntil: 'domcontentloaded' })
    await dismissBlockingModals(page)
    const finishButton = page
      .getByRole('button', { name: /finish event|complete service/i })
      .first()
    await expect(finishButton).toBeDisabled()
    await expect(page.getByText(/receipts uploaded/i).first()).toBeVisible()
    await expect(page.getByText(/day-of protocol complete/i).first()).toBeVisible()

    await markAllManualReadinessItems(page)
    await expect(finishButton).toBeEnabled({ timeout: 15_000 })
    await finishButton.click()

    await expect
      .poll(
        async () => {
          const { data } = await admin.from('events').select('status').eq('id', eventId).single()
          return data?.status ?? 'missing'
        },
        { timeout: 90_000 }
      )
      .toBe('completed')

    await expect(page).toHaveURL(new RegExp(`/events/${eventId}/close-out`), { timeout: 30_000 })
  })
})
