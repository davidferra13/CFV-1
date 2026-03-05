import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildMenuSuggestionBundle,
  buildRecommendationDraftText,
  formatServiceDays,
  getUpcomingServiceDates,
} from '@/lib/recurring/planning'

test('weekly forecast supports multiple configured service days', () => {
  const dates = getUpcomingServiceDates(
    {
      frequency: 'weekly',
      day_of_week: [1, 4], // Mon + Thu
      start_date: '2026-03-02',
      end_date: null,
    },
    {
      fromDate: new Date('2026-03-02T00:00:00'),
      horizonWeeks: 2,
    }
  )

  assert.deepEqual(dates, ['2026-03-02', '2026-03-05', '2026-03-09', '2026-03-12', '2026-03-16'])
})

test('biweekly forecast keeps alternating-week cadence', () => {
  const dates = getUpcomingServiceDates(
    {
      frequency: 'biweekly',
      day_of_week: [2], // Tue
      start_date: '2026-03-03',
      end_date: null,
    },
    {
      fromDate: new Date('2026-03-01T00:00:00'),
      horizonWeeks: 6,
    }
  )

  assert.deepEqual(dates, ['2026-03-03', '2026-03-17', '2026-03-31'])
})

test('menu suggestion bundle prioritizes rotation and excludes dislikes', () => {
  const bundle = buildMenuSuggestionBundle(
    [
      { dish_name: 'Duck Confit', client_reaction: 'loved', served_date: '2026-02-01' },
      { dish_name: 'Miso Cod', client_reaction: 'liked', served_date: '2026-01-15' },
      { dish_name: 'Lamb Ragout', client_reaction: 'disliked', served_date: '2026-01-10' },
      { dish_name: 'Roasted Carrots', client_reaction: 'neutral', served_date: '2026-01-05' },
    ],
    ['Braised Short Rib', 'Miso Cod'],
    { recommendationCount: 3, recentWindowEntries: 1 }
  )

  assert.deepEqual(bundle.recommended, ['Miso Cod', 'Braised Short Rib', 'Roasted Carrots'])
  assert.deepEqual(bundle.avoid, ['Lamb Ragout'])
  assert.equal(bundle.recentlyServed[0], 'Duck Confit')
})

test('recommendation draft includes menu and scheduling details', () => {
  const draft = buildRecommendationDraftText({
    clientName: 'Taylor',
    serviceLabel: 'Weekly Meal Prep',
    serviceDates: ['2026-03-10', '2026-03-12'],
    recommendedDishes: ['Miso Cod', 'Braised Short Rib'],
    avoidDishes: ['Lamb Ragout'],
    notes: 'Produce-first menu this week.',
  })

  assert.match(draft, /Hi Taylor/)
  assert.match(draft, /Planned service dates:/)
  assert.match(draft, /Tuesday, Mar 10/)
  assert.match(draft, /Miso Cod/)
  assert.match(draft, /Lamb Ragout/)
  assert.match(draft, /Produce-first menu this week/)
})

test('service day formatter handles explicit and fallback schedules', () => {
  assert.equal(formatServiceDays([1, 5], '2026-03-01'), 'Mon, Fri')
  assert.equal(formatServiceDays([], '2026-03-03'), 'Tue')
})
