import { test, expect } from '../helpers/fixtures'
import { createAdminClient } from '@/lib/db/admin'

function getAdminDb() {
  return createAdminClient()
}

function daysFromNow(days: number): string {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

async function createNoMenuEvent(admin: ReturnType<typeof createAdminClient>, seedIds: any) {
  const suffix = Date.now().toString()
  const { data, error } = await admin
    .from('events')
    .insert({
      tenant_id: seedIds.chefId,
      client_id: seedIds.clientId,
      status: 'draft',
      occasion: `TEST Service Sim No Menu ${suffix}`,
      event_date: daysFromNow(12),
      guest_count: 8,
      serve_time: null,
      location_address: null,
      location_city: null,
      location_state: null,
      location_zip: null,
      dietary_restrictions: [],
      allergies: [],
      service_style: 'plated',
      special_requests: 'Service simulation no-menu verification.',
      pricing_model: 'flat_rate',
      quoted_price_cents: 96000,
      deposit_amount_cents: 24000,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(`[service-simulation] Failed to create no-menu event: ${error?.message}`)
  return data.id as string
}

async function createRichEvent(
  admin: ReturnType<typeof createAdminClient>,
  seedIds: any,
  options?: {
    includeTravelLeg?: boolean
    arrivalTime?: string | null
  }
) {
  const suffix = Date.now().toString()
  const eventDate = daysFromNow(5)

  const { data: eventRow, error: eventError } = await admin
    .from('events')
    .insert({
      tenant_id: seedIds.chefId,
      client_id: seedIds.clientId,
      status: 'confirmed',
      occasion: `TEST Service Sim Rich ${suffix}`,
      event_date: eventDate,
      serve_time: '18:30:00',
      arrival_time: options?.arrivalTime === undefined ? '16:45:00' : options.arrivalTime,
      guest_count: 10,
      location_address: '123 Simulation Ave',
      location_city: 'Brooklyn',
      location_state: 'NY',
      location_zip: '11201',
      access_instructions: 'Ring the side gate and stage hot boxes in the mud room.',
      dietary_restrictions: ['pescatarian'],
      allergies: ['sesame'],
      service_style: 'plated',
      special_requests: 'Leave one plated dessert for the host.',
      pricing_model: 'flat_rate',
      quoted_price_cents: 168000,
      deposit_amount_cents: 42000,
      grocery_list_ready: true,
      prep_list_ready: true,
      execution_sheet_ready: true,
      timeline_ready: true,
      equipment_list_ready: true,
      packing_list_ready: false,
      car_packed: false,
      menu_approval_status: 'sent',
    })
    .select('id')
    .single()

  if (eventError || !eventRow) {
    throw new Error(`[service-simulation] Failed to create rich event: ${eventError?.message}`)
  }

  const eventId = eventRow.id as string

  const { data: menuRow, error: menuError } = await admin
    .from('menus')
    .insert({
      tenant_id: seedIds.chefId,
      event_id: eventId,
      name: `TEST Simulation Menu ${suffix}`,
      description: 'Operational service simulation fixture.',
      status: 'draft',
      is_template: false,
    })
    .select('id')
    .single()

  if (menuError || !menuRow) {
    throw new Error(`[service-simulation] Failed to create rich menu: ${menuError?.message}`)
  }

  const { data: dishRows, error: dishError } = await admin
    .from('dishes')
    .insert([
      {
        tenant_id: seedIds.chefId,
        menu_id: menuRow.id,
        course_number: 1,
        course_name: `Crudo ${suffix}`,
        sort_order: 1,
        dietary_tags: [],
        allergen_flags: [],
      },
      {
        tenant_id: seedIds.chefId,
        menu_id: menuRow.id,
        course_number: 2,
        course_name: `Halibut ${suffix}`,
        sort_order: 2,
        dietary_tags: [],
        allergen_flags: [],
      },
      {
        tenant_id: seedIds.chefId,
        menu_id: menuRow.id,
        course_number: 3,
        course_name: `Olive Oil Cake ${suffix}`,
        sort_order: 3,
        dietary_tags: [],
        allergen_flags: [],
      },
    ])
    .select('id')

  if (dishError || !dishRows || dishRows.length !== 3) {
    throw new Error(`[service-simulation] Failed to create rich dishes: ${dishError?.message}`)
  }

  const { error: componentError } = await admin.from('components').insert([
    {
      tenant_id: seedIds.chefId,
      dish_id: dishRows[0].id,
      name: `Crudo Garnish ${suffix}`,
      category: 'other',
      sort_order: 1,
      is_make_ahead: true,
      make_ahead_window_hours: 24,
    },
    {
      tenant_id: seedIds.chefId,
      dish_id: dishRows[1].id,
      name: `Brown Butter Sauce ${suffix}`,
      category: 'sauce',
      sort_order: 1,
      is_make_ahead: true,
      make_ahead_window_hours: 24,
    },
    {
      tenant_id: seedIds.chefId,
      dish_id: dishRows[2].id,
      name: `Cake Batter ${suffix}`,
      category: 'dessert',
      sort_order: 1,
      is_make_ahead: true,
      make_ahead_window_hours: 48,
    },
  ])

  if (componentError) {
    throw new Error(`[service-simulation] Failed to create rich components: ${componentError.message}`)
  }

  const { error: prepBlockError } = await admin.from('event_prep_blocks').insert({
    chef_id: seedIds.chefId,
    event_id: eventId,
    block_date: daysFromNow(4),
    start_time: '10:00:00',
    end_time: '11:30:00',
    block_type: 'prep_session',
    title: 'Sauce and garnish prep',
    estimated_duration_minutes: 90,
    is_completed: false,
    is_system_generated: false,
  })

  if (prepBlockError) {
    throw new Error(`[service-simulation] Failed to create rich prep block: ${prepBlockError.message}`)
  }

  if (options?.includeTravelLeg !== false) {
    const { error: travelError } = await admin.from('event_travel_legs').insert({
      tenant_id: seedIds.chefId,
      chef_id: seedIds.chefId,
      primary_event_id: eventId,
      linked_event_ids: [],
      leg_type: 'service_travel',
      leg_date: eventDate,
      departure_time: '15:45:00',
      estimated_return_time: '23:15:00',
      origin_type: 'home',
      destination_type: 'event',
      destination_address: '123 Simulation Ave, Brooklyn, NY 11201',
      destination_label: 'Venue',
      stops: [],
      total_drive_minutes: 45,
      total_stop_minutes: 0,
      total_estimated_minutes: 45,
      purpose_notes: 'Service simulation travel fixture.',
      status: 'planned',
    })

    if (travelError) {
      throw new Error(`[service-simulation] Failed to create rich travel leg: ${travelError.message}`)
    }
  }

  return eventId
}

test.describe('Service Simulation', () => {
  test.setTimeout(180_000)

  test('shows truthful early-stage waiting state, preserves fix-and-return, and can simulate without a menu', async ({
    page,
    seedIds,
  }) => {
    const admin = getAdminDb()
    const eventId = await createNoMenuEvent(admin, seedIds)

    await page.goto(`/events/${eventId}?tab=ops`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('service-simulation-panel')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('service-simulation-rollup')).toBeVisible()
    await expect(page.getByTestId('service-simulation-status')).toContainText('Not yet simulated')
    await expect(page.getByTestId('service-simulation-phase-menu_guest_truth')).toContainText(
      'No menu is attached yet'
    )

    await page.getByTestId('service-simulation-panel').locator('a[href*="/edit"]').first().click()
    await expect(page.getByTestId('service-simulation-return-banner')).toBeVisible()
    await page.getByRole('button', { name: 'Back to service simulation' }).click()
    await expect(page).toHaveURL(new RegExp(`/events/${eventId}\\?tab=ops`))
    await expect(page.getByTestId('service-simulation-panel')).toBeVisible()

    await page.getByTestId('service-simulation-run-button').click()
    await expect(page.getByTestId('service-simulation-status')).toContainText(
      'Current saved rehearsal'
    )
    await expect(page.getByTestId('service-simulation-run-button')).toHaveCount(0)
  })

  test('soft-gates unsimulated and stale transitions, then clears stale state on re-simulate', async ({
    page,
    seedIds,
  }) => {
    const admin = getAdminDb()
    const eventId = await createRichEvent(admin, seedIds)

    await page.goto(`/events/${eventId}/execution`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('service-simulation-rollup')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('service-simulation-transition-gate')).toContainText(
      'No saved rehearsal yet'
    )
    await page.getByRole('button', { name: 'Mark In Progress' }).click()
    await expect(page.getByText('Simulation wants an explicit decision')).toBeVisible()
    await page.getByRole('button', { name: 'Go Back' }).click()

    await page.goto(`/events/${eventId}?tab=ops`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('service-simulation-panel')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('service-simulation-phase-service')).toContainText(
      'Day-Of Protocol Complete'
    )
    await expect(page.getByTestId('service-simulation-phase-travel_arrival')).toContainText(
      'service travel leg'
    )

    await page.getByTestId('service-simulation-run-button').click()
    await expect(page.getByTestId('service-simulation-status')).toContainText(
      'Current saved rehearsal'
    )

    const { error: updateError } = await admin
      .from('events')
      .update({
        guest_count: 14,
      })
      .eq('id', eventId)

    if (updateError) {
      throw new Error(`[service-simulation] Failed to update event for stale test: ${updateError.message}`)
    }

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('service-simulation-status')).toContainText(
      'Saved simulation is stale'
    )
    await expect(page.getByText('Guest count changed')).toBeVisible()
    await expect(page.getByTestId('service-simulation-run-button')).toContainText('Re-simulate')

    await page.goto(`/events/${eventId}/execution`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Mark In Progress' }).click()
    await expect(page.getByText('Simulation wants an explicit decision')).toBeVisible()
    await expect(page.getByText('Saved rehearsal is stale')).toBeVisible()
    await page.getByRole('button', { name: 'Go Back' }).click()

    await page.goto(`/events/${eventId}?tab=ops`, { waitUntil: 'domcontentloaded' })
    await page.getByTestId('service-simulation-run-button').click()
    await expect(page.getByTestId('service-simulation-status')).toContainText(
      'Current saved rehearsal'
    )
    await expect(page.getByText('Guest count changed')).toHaveCount(0)
  })

  test('hard-blocks starting service when must-fix simulation blockers remain', async ({
    page,
    seedIds,
  }) => {
    const admin = getAdminDb()
    const eventId = await createRichEvent(admin, seedIds, { includeTravelLeg: false })

    await page.goto(`/events/${eventId}/execution`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('service-simulation-transition-gate')).toContainText(
      'Simulation says stop before service'
    )
    await expect(page.getByRole('button', { name: 'Mark In Progress' })).toBeDisabled()
    await expect(page.getByTestId('service-simulation-transition-gate')).toContainText(
      'must-fix blocker'
    )
  })
})
