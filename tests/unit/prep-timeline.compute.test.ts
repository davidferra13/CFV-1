import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computePrepTimeline,
  formatPrepTime,
  formatHoursAsReadable,
} from '@/lib/prep-timeline/compute-timeline'
import type { TimelineRecipeInput } from '@/lib/prep-timeline/compute-timeline'

// ── Helpers ──────────────────────────────────────────────────────────────

/** Create a minimal recipe input with sensible defaults. */
function makeInput(overrides: Partial<TimelineRecipeInput> = {}): TimelineRecipeInput {
  return {
    recipeId: 'r1',
    recipeName: 'Test Recipe',
    componentName: 'Test Component',
    dishName: 'Test Dish',
    courseName: 'Main',
    category: 'sauce',
    peakHoursMin: null,
    peakHoursMax: null,
    safetyHoursMax: null,
    storageMethod: null,
    freezable: null,
    frozenExtendsHours: null,
    prepTimeMinutes: 60,
    allergenFlags: [],
    makeAheadWindowHours: null,
    ...overrides,
  }
}

/** Service date: 5 days from now at noon (avoids isPast issues). */
function futureServiceDate(daysOut = 5): Date {
  const d = new Date()
  d.setDate(d.getDate() + daysOut)
  d.setHours(12, 0, 0, 0)
  return d
}

// ── Empty input ──────────────────────────────────────────────────────────

test('returns empty timeline for zero items', () => {
  const result = computePrepTimeline([], futureServiceDate())
  assert.equal(result.days.length, 0)
  assert.equal(result.groceryDeadline, null)
  assert.equal(result.prepDeadline, null)
  assert.equal(result.untimedItems.length, 0)
})

// ── Category defaults route items to timed ───────────────────────────────

test('item with known category (sauce) is timed, not untimed', () => {
  const result = computePrepTimeline([makeInput({ category: 'sauce' })], futureServiceDate())
  assert.equal(result.untimedItems.length, 0)
  // Should have at least one day with items
  const dayWithItems = result.days.filter((d) => d.items.length > 0)
  assert.ok(dayWithItems.length > 0, 'Should have at least one day with items')
})

test('item with unknown category and no peak data goes to untimedItems', () => {
  const result = computePrepTimeline(
    [makeInput({ category: 'unknown_thing', peakHoursMin: null, peakHoursMax: null })],
    futureServiceDate()
  )
  assert.equal(result.untimedItems.length, 1)
  assert.equal(result.untimedItems[0].recipeName, 'Test Recipe')
})

test('item with null category and no peak data goes to untimedItems', () => {
  const result = computePrepTimeline(
    [makeInput({ category: null, peakHoursMin: null, peakHoursMax: null })],
    futureServiceDate()
  )
  assert.equal(result.untimedItems.length, 1)
})

// ── Explicit peak windows override category defaults ─────────────────────

test('explicit peak window overrides category default', () => {
  const result = computePrepTimeline(
    [
      makeInput({
        category: 'sauce',
        peakHoursMin: 0,
        peakHoursMax: 72,
        safetyHoursMax: 96,
      }),
    ],
    futureServiceDate(7)
  )
  assert.equal(result.untimedItems.length, 0)
  const items = result.days.flatMap((d) => d.items)
  assert.equal(items.length, 1)
  assert.equal(items[0].peakHoursMax, 72)
  assert.equal(items[0].usingDefaults, false)
})

// ── makeAheadWindowHours fallback ────────────────────────────────────────

test('makeAheadWindowHours used as fallback when no recipe peak data', () => {
  const result = computePrepTimeline(
    [
      makeInput({
        category: null, // no category defaults
        peakHoursMin: null,
        peakHoursMax: null,
        makeAheadWindowHours: 48,
      }),
    ],
    futureServiceDate(5)
  )
  // Should be timed (not untimed), using makeAheadWindowHours
  assert.equal(result.untimedItems.length, 0)
  const items = result.days.flatMap((d) => d.items)
  assert.equal(items.length, 1)
  assert.equal(items[0].peakHoursMax, 48)
})

// ── Grocery deadline computation ─────────────────────────────────────────

test('groceryDeadline is 1 day before earliest prep day', () => {
  // Sauce with 72h peak = earliest prep ~3 days before service
  const serviceDate = futureServiceDate(7)
  const result = computePrepTimeline(
    [
      makeInput({
        peakHoursMin: 0,
        peakHoursMax: 72,
        safetyHoursMax: 96,
      }),
    ],
    serviceDate
  )
  assert.ok(result.groceryDeadline !== null, 'Should have a grocery deadline')

  // Earliest prep day should be at most 3 days before (floor(72/24) = 3)
  // Grocery deadline = 1 day before that = 4 days before service
  const earliestPrepDay = result.days.find((d) => !d.isServiceDay && d.items.length > 0)
  if (earliestPrepDay) {
    const expectedGrocery = new Date(earliestPrepDay.date)
    expectedGrocery.setDate(expectedGrocery.getDate() - 1)
    assert.equal(result.groceryDeadline!.toDateString(), expectedGrocery.toDateString())
  }
})

test('no groceryDeadline when all items are service-day-only', () => {
  // Item with 4h peak = service day only
  const result = computePrepTimeline(
    [
      makeInput({
        peakHoursMin: 0,
        peakHoursMax: 4,
        safetyHoursMax: 6,
      }),
    ],
    futureServiceDate()
  )
  // effectiveCeiling = min(4,6) = 4h. floor(4/24) = 0 days. All items on service day.
  assert.equal(result.groceryDeadline, null)
})

// ── Service day always included when timed items exist ────────────────────

test('service day card always included when timed items exist', () => {
  const result = computePrepTimeline([makeInput({ category: 'sauce' })], futureServiceDate())
  const serviceDays = result.days.filter((d) => d.isServiceDay)
  assert.equal(serviceDays.length, 1)
  assert.equal(serviceDays[0].label, 'Day of')
})

// ── Items sorted by prep time within a day ───────────────────────────────

test('items on same day sorted by prep time descending (longest first)', () => {
  const result = computePrepTimeline(
    [
      makeInput({ recipeId: 'r1', recipeName: 'Quick', prepTimeMinutes: 15, category: 'sauce' }),
      makeInput({ recipeId: 'r2', recipeName: 'Long', prepTimeMinutes: 120, category: 'sauce' }),
      makeInput({ recipeId: 'r3', recipeName: 'Medium', prepTimeMinutes: 45, category: 'sauce' }),
    ],
    futureServiceDate()
  )
  // All sauce items should land on the same day (category default puts them at same offset)
  const daysWithItems = result.days.filter((d) => d.items.length > 0)
  assert.ok(daysWithItems.length > 0)
  const items = daysWithItems[0].items
  for (let i = 1; i < items.length; i++) {
    assert.ok(
      items[i - 1].prepTimeMinutes >= items[i].prepTimeMinutes,
      `Items not sorted by prep time: ${items[i - 1].prepTimeMinutes} < ${items[i].prepTimeMinutes}`
    )
  }
})

// ── totalPrepMinutes computed correctly ──────────────────────────────────

test('totalPrepMinutes sums all items on a day', () => {
  const result = computePrepTimeline(
    [
      makeInput({ recipeId: 'r1', prepTimeMinutes: 30, category: 'sauce' }),
      makeInput({ recipeId: 'r2', prepTimeMinutes: 45, category: 'sauce' }),
    ],
    futureServiceDate()
  )
  const daysWithItems = result.days.filter((d) => d.items.length > 0)
  assert.ok(daysWithItems.length > 0)
  assert.equal(daysWithItems[0].totalPrepMinutes, 75)
})

// ── Symbols ──────────────────────────────────────────────────────────────

test('freezable item gets freezable symbol', () => {
  const result = computePrepTimeline(
    [makeInput({ category: 'sauce', freezable: true })],
    futureServiceDate()
  )
  const items = result.days.flatMap((d) => d.items)
  assert.ok(items[0].symbols.includes('freezable'))
})

test('item with effectiveCeiling < 4h gets day_of symbol', () => {
  const result = computePrepTimeline(
    [
      makeInput({
        peakHoursMin: 0,
        peakHoursMax: 3,
        safetyHoursMax: 4,
      }),
    ],
    futureServiceDate()
  )
  const items = result.days.flatMap((d) => d.items)
  assert.ok(items[0].symbols.includes('day_of'))
})

test('item with effectiveCeiling 4-8h gets fresh symbol', () => {
  const result = computePrepTimeline(
    [
      makeInput({
        peakHoursMin: 0,
        peakHoursMax: 6,
        safetyHoursMax: 8,
      }),
    ],
    futureServiceDate()
  )
  const items = result.days.flatMap((d) => d.items)
  assert.ok(items[0].symbols.includes('fresh'))
})

test('safety_warning when peakMax > safetyMax', () => {
  const result = computePrepTimeline(
    [
      makeInput({
        peakHoursMin: 0,
        peakHoursMax: 48,
        safetyHoursMax: 24,
      }),
    ],
    futureServiceDate()
  )
  const items = result.days.flatMap((d) => d.items)
  assert.ok(items[0].symbols.includes('safety_warning'))
})

test('allergen symbol when allergenFlags present', () => {
  const result = computePrepTimeline(
    [makeInput({ category: 'sauce', allergenFlags: ['tree_nuts', 'dairy'] })],
    futureServiceDate()
  )
  const items = result.days.flatMap((d) => d.items)
  assert.ok(items[0].symbols.includes('allergen'))
})

// ── effectiveCeiling = min(peakMax, safetyMax) ───────────────────────────

test('effectiveCeiling is min of peakMax and safetyMax', () => {
  const result = computePrepTimeline(
    [
      makeInput({
        peakHoursMin: 0,
        peakHoursMax: 72,
        safetyHoursMax: 48,
      }),
    ],
    futureServiceDate()
  )
  const items = result.days.flatMap((d) => d.items)
  assert.equal(items[0].effectiveCeiling, 48) // min(72, 48)
})

// ── Optimal day placement ────────────────────────────────────────────────

test('item with 24-48h peak window placed 1 day before service', () => {
  const result = computePrepTimeline(
    [
      makeInput({
        peakHoursMin: 0,
        peakHoursMax: 48,
        safetyHoursMax: 72,
      }),
    ],
    futureServiceDate(5)
  )
  const itemDays = result.days.filter((d) => d.items.length > 0 && !d.isServiceDay)
  // effectiveCeiling = 48h = 2 days before. latestDaysBefore = 0. Prefer 1.
  assert.ok(itemDays.length > 0)
  assert.equal(itemDays[0].daysBeforeService, 1)
})

// ── Multiple items on different days ─────────────────────────────────────

test('items with different peak windows land on different days', () => {
  const result = computePrepTimeline(
    [
      // This item: effectiveCeiling = 72h = 3 days, peakMin = 48h = 2 days.
      // Optimal = middle of (3, 2) = 2
      makeInput({
        recipeId: 'r1',
        recipeName: 'Long Sauce',
        peakHoursMin: 48,
        peakHoursMax: 72,
        safetyHoursMax: 96,
      }),
      // This item: effectiveCeiling = 4h = 0 days. Service day.
      makeInput({
        recipeId: 'r2',
        recipeName: 'Fresh Salad',
        peakHoursMin: 0,
        peakHoursMax: 4,
        safetyHoursMax: 6,
      }),
    ],
    futureServiceDate(7)
  )
  // Long Sauce should be on a day before service, Fresh Salad on service day
  const sauceDays = result.days.filter((d) => d.items.some((i) => i.recipeName === 'Long Sauce'))
  const saladDays = result.days.filter((d) => d.items.some((i) => i.recipeName === 'Fresh Salad'))
  assert.ok(sauceDays.length > 0)
  assert.ok(saladDays.length > 0)
  assert.ok(sauceDays[0].daysBeforeService > 0, 'Sauce should be before service day')
  assert.equal(saladDays[0].daysBeforeService, 0, 'Salad should be on service day')
})

// ── Days sorted descending (farthest first) ──────────────────────────────

test('days sorted by daysBeforeService descending', () => {
  const result = computePrepTimeline(
    [
      makeInput({ recipeId: 'r1', peakHoursMin: 0, peakHoursMax: 72, safetyHoursMax: 96 }),
      makeInput({ recipeId: 'r2', peakHoursMin: 0, peakHoursMax: 4, safetyHoursMax: 6 }),
    ],
    futureServiceDate(7)
  )
  for (let i = 1; i < result.days.length; i++) {
    assert.ok(
      result.days[i - 1].daysBeforeService >= result.days[i].daysBeforeService,
      `Days not sorted: ${result.days[i - 1].daysBeforeService} < ${result.days[i].daysBeforeService}`
    )
  }
})

// ── Grocery deadline card inserted when not overlapping ──────────────────

test('grocery deadline card inserted when it does not overlap with a prep day', () => {
  // 72h peak = 3 days before. Grocery = 4 days before.
  // If no items land on day 4, a standalone grocery card should be inserted.
  const result = computePrepTimeline(
    [
      makeInput({
        peakHoursMin: 48,
        peakHoursMax: 72,
        safetyHoursMax: 96,
      }),
    ],
    futureServiceDate(7)
  )
  if (result.groceryDeadline) {
    const groceryCards = result.days.filter((d) => d.deadlineType === 'grocery')
    assert.ok(groceryCards.length > 0, 'Should have a grocery deadline card')
  }
})

// ── formatPrepTime ───────────────────────────────────────────────────────

test('formatPrepTime: minutes only', () => {
  assert.equal(formatPrepTime(45), '45min')
})

test('formatPrepTime: exact hours', () => {
  assert.equal(formatPrepTime(120), '2h')
})

test('formatPrepTime: hours and minutes', () => {
  assert.equal(formatPrepTime(150), '2h 30min')
})

test('formatPrepTime: zero', () => {
  assert.equal(formatPrepTime(0), '0min')
})

// ── formatHoursAsReadable ────────────────────────────────────────────────

test('formatHoursAsReadable: hours only', () => {
  assert.equal(formatHoursAsReadable(6), '6h')
})

test('formatHoursAsReadable: exact days', () => {
  assert.equal(formatHoursAsReadable(48), '2d')
})

test('formatHoursAsReadable: days and hours', () => {
  assert.equal(formatHoursAsReadable(30), '1d 6h')
})

test('formatHoursAsReadable: zero', () => {
  assert.equal(formatHoursAsReadable(0), '0h')
})
