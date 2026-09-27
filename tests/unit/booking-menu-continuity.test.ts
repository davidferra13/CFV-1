import test from 'node:test'
import assert from 'node:assert/strict'
import { materializeSelectedMenuForEvent } from '@/lib/menus/booking-menu-continuity'

test('selected inquiry menu becomes an event-owned fork with dishes, components, and lineage', async () => {
  const sourceMenu = {
    id: 'menu-source-1',
    name: 'Autumn Tasting',
    description: 'Five courses',
    service_style: 'plated',
    cuisine_type: 'new_england',
    target_guest_count: 8,
    notes: 'Source stays reusable',
    fork_generation: 2,
  }
  const sourceDishes = [
    {
      id: 'dish-source-1',
      course_name: 'First',
      course_number: 1,
      description: 'Scallop',
      dietary_tags: ['gf'],
      allergen_flags: ['shellfish'],
      chef_notes: 'Chef note',
      client_notes: 'Client note',
      sort_order: 1,
      plating_instructions: 'Warm plate',
      beverage_pairing: null,
      beverage_pairing_notes: null,
    },
  ]
  const sourceComponents = [
    {
      id: 'component-source-1',
      dish_id: 'dish-source-1',
      name: 'Seared scallop',
      category: 'protein',
      description: 'Dry well',
      recipe_id: 'recipe-1',
      scale_factor: 1,
      is_make_ahead: false,
      make_ahead_window_hours: null,
      execution_notes: 'Hard sear',
      storage_notes: 'Cold',
      sort_order: 1,
      portion_quantity: 3,
      portion_unit: 'ea',
      prep_day_offset: 0,
      prep_time_of_day: 'afternoon',
      prep_station: 'hot',
    },
  ]

  const inserts: Array<{ table: string; row: any }> = []
  const updates: Array<{ table: string; row: any }> = []

  function builderFor(table: string) {
    let mode: 'select' | 'insert' | 'update' = 'select'
    let row: any = null
    const filters: Record<string, unknown> = {}

    const builder: any = {
      select() {
        return builder
      },
      eq(key: string, value: unknown) {
        filters[key] = value
        return builder
      },
      in(key: string, value: unknown) {
        filters[key] = value
        return builder
      },
      order() {
        return builder
      },
      insert(value: any) {
        mode = 'insert'
        row = value
        inserts.push({ table, row: value })
        return builder
      },
      update(value: any) {
        mode = 'update'
        row = value
        updates.push({ table, row: value })
        return builder
      },
      async maybeSingle() {
        if (table === 'menus' && filters.id === 'menu-source-1') {
          return { data: sourceMenu, error: null }
        }
        return { data: null, error: null }
      },
      async single() {
        if (mode === 'insert' && table === 'menus') {
          return { data: { id: 'menu-event-1' }, error: null }
        }
        if (mode === 'insert' && table === 'dishes') {
          return { data: { id: 'dish-event-1' }, error: null }
        }
        return { data: row, error: null }
      },
      then(resolve: (value: any) => void) {
        if (mode === 'insert' || mode === 'update') {
          resolve({ data: row, error: null })
          return
        }
        if (table === 'dishes') {
          resolve({ data: sourceDishes, error: null })
          return
        }
        if (table === 'components') {
          resolve({ data: sourceComponents, error: null })
          return
        }
        resolve({ data: [], error: null })
      },
    }

    return builder
  }

  const db = {
    from(table: string) {
      return builderFor(table)
    },
  }

  const result = await materializeSelectedMenuForEvent({
    db,
    tenantId: 'chef-1',
    actorId: 'actor-1',
    sourceMenuId: 'menu-source-1',
    eventId: 'event-1',
    targetGuestCount: 12,
  })

  assert.deepEqual(result, {
    menuId: 'menu-event-1',
    courseCount: 1,
    sourceMenuId: 'menu-source-1',
  })

  const menuInsert = inserts.find((entry) => entry.table === 'menus')
  assert.equal(menuInsert?.row.event_id, 'event-1')
  assert.equal(menuInsert?.row.target_guest_count, 12)
  assert.equal(menuInsert?.row.forked_from_id, 'menu-source-1')
  assert.equal(menuInsert?.row.fork_generation, 3)
  assert.equal(menuInsert?.row.fork_reason, 'booking_from_inquiry')

  const dishInsert = inserts.find((entry) => entry.table === 'dishes')
  assert.equal(dishInsert?.row.menu_id, 'menu-event-1')
  assert.deepEqual(dishInsert?.row.dietary_tags, ['gf'])

  const componentInsert = inserts.find((entry) => entry.table === 'components')
  assert.equal(componentInsert?.row.dish_id, 'dish-event-1')
  assert.equal(componentInsert?.row.recipe_id, 'recipe-1')

  const transition = inserts.find((entry) => entry.table === 'menu_state_transitions')
  assert.equal(transition?.row.metadata.source_menu_id, 'menu-source-1')
  assert.equal(transition?.row.metadata.event_id, 'event-1')

  assert.equal(updates.length, 0, 'the reusable selected menu must not be mutated')
})
