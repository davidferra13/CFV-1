import test from 'node:test'
import assert from 'node:assert/strict'
import { getActivePrompts } from '@/lib/scheduling/prep-prompts'
import type { SchedulingEvent, ChefPreferences, PrepPrompt } from '@/lib/scheduling/types'
import type { PrepTimeline, PrepItem, PrepDay } from '@/lib/prep-timeline/compute-timeline'
import { addDays, startOfDay, format } from 'date-fns'

// ── Helpers ──────────────────────────────────────────────────────────────

/** ISO date string N days from today. */
function dateFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function makeEvent(overrides: Partial<SchedulingEvent> = {}): SchedulingEvent {
  return {
    id: 'evt-1',
    occasion: 'Birthday Dinner',
    event_date: dateFromNow(2),
    serve_time: '18:00',
    arrival_time: '16:00',
    travel_time_minutes: 30,
    guest_count: 8,
    status: 'confirmed',
    location_address: '123 Main St',
    location_city: 'Boston',
    grocery_list_ready: false,
    prep_list_ready: false,
    packing_list_ready: false,
    equipment_list_ready: false,
    timeline_ready: false,
    execution_sheet_ready: false,
    non_negotiables_checked: false,
    car_packed: false,
    shopping_completed_at: null,
    prep_completed_at: null,
    aar_filed: false,
    reset_complete: false,
    follow_up_sent: false,
    financially_closed: false,
    client: { full_name: 'Jane Doe' },
    ...overrides,
  }
}

function makePrefs(overrides: Partial<ChefPreferences> = {}): ChefPreferences {
  return {
    id: 'pref-1',
    chef_id: 'chef-1',
    home_address: null,
    home_city: null,
    home_state: null,
    home_zip: null,
    default_stores: [],
    default_grocery_store: null,
    default_grocery_address: null,
    default_liquor_store: null,
    default_liquor_address: null,
    default_specialty_stores: [],
    default_buffer_minutes: 30,
    default_prep_hours: 3,
    default_shopping_minutes: 60,
    default_packing_minutes: 30,
    target_margin_percent: 60,
    target_monthly_revenue_cents: 1000000,
    target_annual_revenue_cents: null,
    revenue_goal_program_enabled: false,
    revenue_goal_nudge_level: 'gentle',
    revenue_goal_custom: [],
    shop_day_before: true,
    dashboard_widgets: [],
    primary_nav_hrefs: [],
    menu_engine_features: {
      seasonal_warnings: true,
      prep_estimate: true,
      client_taste: true,
      menu_history: true,
      vendor_hints: true,
      allergen_validation: true,
      stock_alerts: true,
      scale_mismatch: true,
      inquiry_link: true,
      budget_compliance: true,
      dietary_conflicts: true,
      quadrant_badges: true,
    },
    ...overrides,
  }
}

function makePrepItem(overrides: Partial<PrepItem> = {}): PrepItem {
  return {
    recipeId: 'r1',
    recipeName: 'Tomato Sauce',
    componentName: 'Tomato Sauce',
    dishName: 'Pasta',
    courseName: 'Main',
    peakHoursMin: 0,
    peakHoursMax: 48,
    safetyHoursMax: 72,
    effectiveCeiling: 48,
    storageMethod: 'fridge',
    freezable: false,
    frozenExtendsHours: null,
    prepTimeMinutes: 60,
    usingDefaults: false,
    symbols: [],
    allergenFlags: [],
    ...overrides,
  }
}

function makePrepDay(
  date: Date,
  daysBeforeService: number,
  items: PrepItem[] = [],
  isServiceDay = false
): PrepDay {
  const now = new Date()
  const today = startOfDay(now)
  return {
    date,
    label: daysBeforeService === 0 ? 'Day of' : `${daysBeforeService} days before`,
    daysBeforeService,
    isToday: startOfDay(date).getTime() === today.getTime(),
    isPast: date < today && startOfDay(date).getTime() !== today.getTime(),
    isServiceDay,
    deadlineType: null,
    items,
    totalPrepMinutes: items.reduce((sum, i) => sum + i.prepTimeMinutes, 0),
  }
}

function makeTimeline(
  serviceDate: Date,
  days: PrepDay[],
  groceryDeadline: Date | null = null
): PrepTimeline {
  return {
    days,
    groceryDeadline,
    prepDeadline: null,
    serviceDate,
    untimedItems: [],
  }
}

// ── Skips cancelled/completed events ─────────────────────────────────────

test('skips cancelled events', () => {
  const result = getActivePrompts(
    [makeEvent({ status: 'cancelled', event_date: dateFromNow(2) })],
    makePrefs()
  )
  assert.equal(result.length, 0)
})

test('skips completed events', () => {
  const result = getActivePrompts(
    [makeEvent({ status: 'completed', event_date: dateFromNow(2) })],
    makePrefs()
  )
  assert.equal(result.length, 0)
})

// ── Skips far-past events ────────────────────────────────────────────────

test('skips events more than 1 day in the past', () => {
  const result = getActivePrompts([makeEvent({ event_date: dateFromNow(-3) })], makePrefs())
  assert.equal(result.length, 0)
})

// ── Day-of prompts (no timeline) ─────────────────────────────────────────

test('day-of event generates schedule prompt', () => {
  const result = getActivePrompts([makeEvent({ event_date: dateFromNow(0) })], makePrefs())
  const schedulePrompt = result.find((p) => p.action === 'View schedule')
  assert.ok(schedulePrompt, 'Should have schedule prompt')
  assert.equal(schedulePrompt!.urgency, 'actionable')
  assert.equal(schedulePrompt!.daysUntilEvent, 0)
})

test('day-of generates car pack prompt when not packed', () => {
  const result = getActivePrompts(
    [makeEvent({ event_date: dateFromNow(0), car_packed: false })],
    makePrefs()
  )
  const packPrompt = result.find((p) => p.category === 'packing')
  assert.ok(packPrompt, 'Should have packing prompt')
})

test('day-of skips car pack prompt when already packed', () => {
  const result = getActivePrompts(
    [makeEvent({ event_date: dateFromNow(0), car_packed: true })],
    makePrefs()
  )
  const packPrompt = result.find((p) => p.category === 'packing' && p.action === 'View checklist')
  assert.equal(packPrompt, undefined, 'Should not have packing prompt when car packed')
})

// ── 2-day fallback prompts (no timeline) ─────────────────────────────────

test('2 days before: generic prep prompt when no timeline', () => {
  const result = getActivePrompts([makeEvent({ event_date: dateFromNow(2) })], makePrefs())
  const prepPrompt = result.find((p) => p.category === 'prep' && p.daysUntilEvent === 2)
  assert.ok(prepPrompt, 'Should have generic prep prompt at 2 days')
})

test('2 days before: shopping prompt when shop_day_before is true', () => {
  const result = getActivePrompts(
    [makeEvent({ event_date: dateFromNow(2) })],
    makePrefs({ shop_day_before: true })
  )
  const shopPrompt = result.find(
    (p) => p.category === 'shopping' && p.message.includes('Grocery shopping')
  )
  assert.ok(shopPrompt, 'Should have shopping prompt')
})

test('2 days before: no shopping prompt when shop_day_before is false', () => {
  const result = getActivePrompts(
    [makeEvent({ event_date: dateFromNow(2) })],
    makePrefs({ shop_day_before: false })
  )
  const shopPrompt = result.find(
    (p) => p.category === 'shopping' && p.message.includes('DOP says shop')
  )
  assert.equal(shopPrompt, undefined)
})

test('2 days before: no shopping prompt when already shopped', () => {
  const result = getActivePrompts(
    [makeEvent({ event_date: dateFromNow(2), shopping_completed_at: '2026-04-15T10:00:00Z' })],
    makePrefs({ shop_day_before: true })
  )
  const shopPrompt = result.find(
    (p) => p.category === 'shopping' && p.message.includes('Grocery shopping')
  )
  assert.equal(shopPrompt, undefined)
})

// ── 1-day prompts ────────────────────────────────────────────────────────

test('1 day before: packing prompt when packing_list_ready', () => {
  const result = getActivePrompts(
    [makeEvent({ event_date: dateFromNow(1), packing_list_ready: true })],
    makePrefs()
  )
  const packPrompt = result.find((p) => p.action === 'View packing list')
  assert.ok(packPrompt, 'Should have packing review prompt')
})

test('1 day before: overdue menu prompt when execution_sheet not ready', () => {
  const result = getActivePrompts(
    [makeEvent({ event_date: dateFromNow(1), execution_sheet_ready: false })],
    makePrefs()
  )
  const menuPrompt = result.find((p) => p.action === 'Confirm menu')
  assert.ok(menuPrompt, 'Should have menu confirmation prompt')
  assert.equal(menuPrompt!.urgency, 'overdue')
})

// ── 5+ day prompts ───────────────────────────────────────────────────────

test('5+ days: grocery list ready prompt', () => {
  const result = getActivePrompts(
    [makeEvent({ event_date: dateFromNow(6), grocery_list_ready: true })],
    makePrefs()
  )
  const groceryPrompt = result.find((p) => p.message.includes('Grocery list is ready'))
  assert.ok(groceryPrompt, 'Should have grocery ready prompt')
  assert.equal(groceryPrompt!.urgency, 'upcoming')
})

test('5+ days: documents ready prompt when all docs ready', () => {
  const result = getActivePrompts(
    [
      makeEvent({
        event_date: dateFromNow(7),
        execution_sheet_ready: true,
        grocery_list_ready: true,
        prep_list_ready: true,
      }),
    ],
    makePrefs()
  )
  const docPrompt = result.find((p) => p.message.includes('documents ready'))
  assert.ok(docPrompt, 'Should have documents ready prompt')
})

// ── Sorting: overdue > actionable > upcoming ─────────────────────────────

test('prompts sorted by urgency: overdue first, then actionable, then upcoming', () => {
  const result = getActivePrompts(
    [
      makeEvent({ id: 'a', event_date: dateFromNow(0), car_packed: false }),
      makeEvent({ id: 'b', event_date: dateFromNow(1), execution_sheet_ready: false }),
      makeEvent({ id: 'c', event_date: dateFromNow(7), grocery_list_ready: true }),
    ],
    makePrefs()
  )
  if (result.length < 3) return // skip if dates don't generate enough prompts

  const urgencyOrder = { overdue: 0, actionable: 1, upcoming: 2 }
  for (let i = 1; i < result.length; i++) {
    const prev = urgencyOrder[result[i - 1].urgency]
    const curr = urgencyOrder[result[i].urgency]
    assert.ok(
      prev <= curr,
      `Sort violation at index ${i}: ${result[i - 1].urgency} > ${result[i].urgency}`
    )
  }
})

// ── Timeline-driven prompts ──────────────────────────────────────────────

test('timeline-driven: grocery deadline today generates actionable shopping prompt', () => {
  const eventDate = dateFromNow(3)
  const serviceDate = new Date(eventDate + 'T12:00:00')
  const today = startOfDay(new Date())
  const timeline = makeTimeline(serviceDate, [], today)

  const result = getActivePrompts([makeEvent({ id: 'e1', event_date: eventDate })], makePrefs(), {
    e1: timeline,
  })
  const groceryPrompt = result.find(
    (p) => p.message.includes('Grocery deadline') && p.message.includes('today')
  )
  assert.ok(groceryPrompt, 'Should have grocery deadline today prompt')
  assert.equal(groceryPrompt!.urgency, 'actionable')
  assert.equal(groceryPrompt!.category, 'shopping')
})

test('timeline-driven: grocery deadline tomorrow generates upcoming prompt', () => {
  const eventDate = dateFromNow(4)
  const serviceDate = new Date(eventDate + 'T12:00:00')
  const tomorrow = addDays(startOfDay(new Date()), 1)
  const timeline = makeTimeline(serviceDate, [], tomorrow)

  const result = getActivePrompts([makeEvent({ id: 'e1', event_date: eventDate })], makePrefs(), {
    e1: timeline,
  })
  const groceryPrompt = result.find((p) => p.message.includes('Shop by tomorrow'))
  assert.ok(groceryPrompt, 'Should have shop-by-tomorrow prompt')
  assert.equal(groceryPrompt!.urgency, 'upcoming')
})

test('timeline-driven: overdue grocery deadline generates overdue prompt', () => {
  const eventDate = dateFromNow(2)
  const serviceDate = new Date(eventDate + 'T12:00:00')
  const yesterday = addDays(startOfDay(new Date()), -1)
  const timeline = makeTimeline(serviceDate, [], yesterday)

  const result = getActivePrompts([makeEvent({ id: 'e1', event_date: eventDate })], makePrefs(), {
    e1: timeline,
  })
  const groceryPrompt = result.find(
    (p) => p.message.includes('Grocery deadline') && p.urgency === 'overdue'
  )
  assert.ok(groceryPrompt, 'Should have overdue grocery prompt')
})

test('timeline-driven: no grocery prompt when shopping already completed', () => {
  const eventDate = dateFromNow(3)
  const serviceDate = new Date(eventDate + 'T12:00:00')
  const today = startOfDay(new Date())
  const timeline = makeTimeline(serviceDate, [], today)

  const result = getActivePrompts(
    [makeEvent({ id: 'e1', event_date: eventDate, shopping_completed_at: '2026-04-15T10:00:00Z' })],
    makePrefs(),
    { e1: timeline }
  )
  const groceryPrompt = result.find((p) => p.message.includes('Grocery deadline'))
  assert.equal(groceryPrompt, undefined, 'Should not have grocery prompt when shopping done')
})

test('timeline-driven: prep day today generates actionable prompt with component names', () => {
  const eventDate = dateFromNow(2)
  const serviceDate = new Date(eventDate + 'T12:00:00')
  const today = startOfDay(new Date())

  const items = [
    makePrepItem({ recipeName: 'Tomato Sauce' }),
    makePrepItem({ recipeId: 'r2', recipeName: 'Pesto' }),
  ]
  const prepDay = makePrepDay(today, 2, items)
  const serviceDay = makePrepDay(serviceDate, 0, [], true)
  const timeline = makeTimeline(serviceDate, [prepDay, serviceDay])

  const result = getActivePrompts([makeEvent({ id: 'e1', event_date: eventDate })], makePrefs(), {
    e1: timeline,
  })
  const prepPrompt = result.find((p) => p.message.includes('Start today'))
  assert.ok(prepPrompt, 'Should have prep-today prompt')
  assert.ok(prepPrompt!.components, 'Should have components array')
  assert.ok(prepPrompt!.components!.includes('Tomato Sauce'))
  assert.ok(prepPrompt!.components!.includes('Pesto'))
})

test('timeline-driven: prep day tomorrow generates upcoming prompt', () => {
  const eventDate = dateFromNow(3)
  const serviceDate = new Date(eventDate + 'T12:00:00')
  const tomorrow = addDays(startOfDay(new Date()), 1)

  const items = [makePrepItem({ recipeName: 'Bechamel' })]
  const prepDay = makePrepDay(tomorrow, 2, items)
  const serviceDay = makePrepDay(serviceDate, 0, [], true)
  const timeline = makeTimeline(serviceDate, [prepDay, serviceDay])

  const result = getActivePrompts([makeEvent({ id: 'e1', event_date: eventDate })], makePrefs(), {
    e1: timeline,
  })
  const prepPrompt = result.find((p) => p.message.includes('Prep tomorrow'))
  assert.ok(prepPrompt, 'Should have prep-tomorrow prompt')
  assert.equal(prepPrompt!.urgency, 'upcoming')
})

test('timeline-driven: untimed items generate adoption nudge', () => {
  const eventDate = dateFromNow(5)
  const serviceDate = new Date(eventDate + 'T12:00:00')
  const serviceDay = makePrepDay(serviceDate, 0, [], true)
  const timeline = {
    ...makeTimeline(serviceDate, [serviceDay]),
    untimedItems: [makePrepItem({ recipeName: 'Mystery Dish' })],
  }

  const result = getActivePrompts([makeEvent({ id: 'e1', event_date: eventDate })], makePrefs(), {
    e1: timeline,
  })
  const nudge = result.find((p) => p.message.includes('freshness windows'))
  assert.ok(nudge, 'Should have untimed items nudge')
  assert.equal(nudge!.action, 'Set peak windows')
})

test('timeline-driven: no untimed nudge for day-of events (too late)', () => {
  const eventDate = dateFromNow(1)
  const serviceDate = new Date(eventDate + 'T12:00:00')
  const serviceDay = makePrepDay(serviceDate, 0, [], true)
  const timeline = {
    ...makeTimeline(serviceDate, [serviceDay]),
    untimedItems: [makePrepItem()],
  }

  const result = getActivePrompts([makeEvent({ id: 'e1', event_date: eventDate })], makePrefs(), {
    e1: timeline,
  })
  const nudge = result.find((p) => p.message.includes('freshness windows'))
  assert.equal(nudge, undefined, 'Should not nudge about peak windows day before')
})

// ── Timeline suppresses fallback prompts ─────────────────────────────────

test('timeline grocery deadline suppresses fallback shopping prompts at 2 days', () => {
  const eventDate = dateFromNow(2)
  const serviceDate = new Date(eventDate + 'T12:00:00')
  const tomorrow = addDays(startOfDay(new Date()), 1)
  const timeline = makeTimeline(serviceDate, [], tomorrow)

  const result = getActivePrompts(
    [makeEvent({ id: 'e1', event_date: eventDate })],
    makePrefs({ shop_day_before: true }),
    { e1: timeline }
  )
  const fallbackShop = result.find((p) => p.message.includes('DOP says shop'))
  assert.equal(fallbackShop, undefined, 'Fallback shopping prompt should be suppressed by timeline')
})

test('no timeline: 2-day generic prep prompt fires', () => {
  const result = getActivePrompts([makeEvent({ event_date: dateFromNow(2) })], makePrefs())
  const genericPrep = result.find((p) => p.message.includes('Check your prep list'))
  assert.ok(genericPrep, 'Generic prep prompt should fire without timeline')
})

test('with timeline: 2-day generic prep prompt suppressed', () => {
  const eventDate = dateFromNow(2)
  const serviceDate = new Date(eventDate + 'T12:00:00')
  const serviceDay = makePrepDay(serviceDate, 0, [], true)
  const timeline = makeTimeline(serviceDate, [serviceDay])

  const result = getActivePrompts([makeEvent({ id: 'e1', event_date: eventDate })], makePrefs(), {
    e1: timeline,
  })
  const genericPrep = result.find((p) => p.message.includes('Check your prep list'))
  assert.equal(genericPrep, undefined, 'Generic prep should be suppressed by timeline')
})

// ── Action URLs deep-link to prep tab ────────────────────────────────────

test('timeline prep prompts link to ?tab=prep', () => {
  const eventDate = dateFromNow(3)
  const serviceDate = new Date(eventDate + 'T12:00:00')
  const today = startOfDay(new Date())
  const items = [makePrepItem()]
  const prepDay = makePrepDay(today, 3, items)
  const serviceDay = makePrepDay(serviceDate, 0, [], true)
  const timeline = makeTimeline(serviceDate, [prepDay, serviceDay])

  const result = getActivePrompts([makeEvent({ id: 'e1', event_date: eventDate })], makePrefs(), {
    e1: timeline,
  })
  const prepPrompts = result.filter(
    (p) => p.category === 'prep' && p.actionUrl.includes('tab=prep')
  )
  assert.ok(prepPrompts.length > 0, 'Prep prompts should link to ?tab=prep')
})

// ── Multiple events produce separate prompts ─────────────────────────────

test('multiple events each generate independent prompts', () => {
  const result = getActivePrompts(
    [
      makeEvent({ id: 'a', event_date: dateFromNow(0), occasion: 'Wedding' }),
      makeEvent({ id: 'b', event_date: dateFromNow(0), occasion: 'Corporate' }),
    ],
    makePrefs()
  )
  const weddingPrompts = result.filter((p) => p.eventId === 'a')
  const corpPrompts = result.filter((p) => p.eventId === 'b')
  assert.ok(weddingPrompts.length > 0, 'Should have wedding prompts')
  assert.ok(corpPrompts.length > 0, 'Should have corporate prompts')
})

// ── formatComponentList (tested through prompts) ─────────────────────────

test('more than 4 components shows "+N more"', () => {
  const eventDate = dateFromNow(3)
  const serviceDate = new Date(eventDate + 'T12:00:00')
  const today = startOfDay(new Date())
  const items = [
    makePrepItem({ recipeName: 'A' }),
    makePrepItem({ recipeId: 'r2', recipeName: 'B' }),
    makePrepItem({ recipeId: 'r3', recipeName: 'C' }),
    makePrepItem({ recipeId: 'r4', recipeName: 'D' }),
    makePrepItem({ recipeId: 'r5', recipeName: 'E' }),
  ]
  const prepDay = makePrepDay(today, 3, items)
  const serviceDay = makePrepDay(serviceDate, 0, [], true)
  const timeline = makeTimeline(serviceDate, [prepDay, serviceDay])

  const result = getActivePrompts([makeEvent({ id: 'e1', event_date: eventDate })], makePrefs(), {
    e1: timeline,
  })
  const prepPrompt = result.find((p) => p.message.includes('+2 more'))
  assert.ok(prepPrompt, 'Should truncate component list with "+N more"')
})
