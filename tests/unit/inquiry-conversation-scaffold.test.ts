import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveInquiryDateForEvent,
  inferEventTimesFromConversation,
  parseCityStateFromConversation,
  extractSelectedDishNamesFromConversation,
  buildAutoMenuCourseNamesFromConversation,
} from '../../lib/inquiries/conversation-scaffold.js'

describe('resolveInquiryDateForEvent', () => {
  it('resolves YYYY placeholders using inquiry timing context', () => {
    const resolved = resolveInquiryDateForEvent('YYYY-09-18', '2025-08-14T19:47:21Z')
    assert.equal(resolved, '2025-09-18')
  })

  it('rolls into next year when placeholder date already passed', () => {
    const resolved = resolveInquiryDateForEvent('YYYY-01-10', '2025-12-20T12:00:00Z')
    assert.equal(resolved, '2026-01-10')
  })
})

describe('inferEventTimesFromConversation', () => {
  it('extracts serve/arrival times from natural language scheduling', () => {
    const text =
      "We can eat around 7, so we'll see you around 5! Just let me know if you arrive 2 hours prior."
    const times = inferEventTimesFromConversation(text)
    assert.equal(times.serveTime, '19:00:00')
    assert.equal(times.arrivalTime, '17:00:00')
  })
})

describe('parseCityStateFromConversation', () => {
  it('parses city/state from conversation body when location is broad', () => {
    const parsed = parseCityStateFromConversation(
      'Maine',
      'We are heading to Naples, Maine on Thursday and can not wait for this dinner.'
    )
    assert.equal(parsed.city, 'Naples')
    assert.equal(parsed.state, 'ME')
  })
})

describe('extractSelectedDishNamesFromConversation', () => {
  const convo = `
    I'd like to do: Pork dumplings Fried pickles Rib eye and lobster Mousse.
    Course 1 Kohlrabi & pork dumplings with brown butter ponzu
    Course 2 Fried pickles with fermented garlic aioli
    Course 3 Aged grilled ribeye and butter-poached mini lobster roll with lemon chive aioli
    Course 4 Mocha chocolate mousse with seasonal fruit
  `

  it('extracts concrete dish choices from a long thread', () => {
    const dishes = extractSelectedDishNamesFromConversation(convo)
    assert.ok(dishes.some((dish) => /dumpling/i.test(dish)))
    assert.ok(dishes.some((dish) => /fried pickles/i.test(dish)))
    assert.ok(dishes.some((dish) => /mousse/i.test(dish)))
  })

  it('handles mojibake apostrophes in client selection lines', () => {
    const mojibakeConvo = `
      IÃ¢Â€Â™d like to do: Pork dumplings Fried pickles Rib eye and lobster Mousse
      Course 1 Kohlrabi & pork dumplings with brown butter ponzu
      Course 2 Fried pickles with fermented garlic aioli
      Course 3 Aged grilled ribeye and butter-poached mini lobster roll with lemon chive aioli
      Course 4 Mocha chocolate mousse with seasonal fruit
    `

    const dishes = extractSelectedDishNamesFromConversation(mojibakeConvo)
    assert.ok(dishes.some((dish) => /dumpling/i.test(dish)))
    assert.ok(dishes.some((dish) => /fried pickles/i.test(dish)))
    assert.ok(dishes.some((dish) => /ribeye|lobster/i.test(dish)))
    assert.ok(dishes.some((dish) => /mousse/i.test(dish)))
  })

  it('builds an operational fallback menu with at least three courses', () => {
    const fallback = buildAutoMenuCourseNamesFromConversation('Looking forward to dinner!')
    assert.equal(fallback.length, 3)
    assert.equal(fallback[0], 'Seasonal Starter')
  })
})
