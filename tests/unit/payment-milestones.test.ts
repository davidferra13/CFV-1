import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

type MilestoneDefinition = {
  name: string
  percentage?: number
  fixed_amount_cents?: number
  due_trigger: 'on_confirmation' | 'days_before_event' | 'day_of_event' | 'days_after_event'
  due_offset_days: number
}

function calculateMilestoneAmount(def: MilestoneDefinition, quotedPriceCents: number): number {
  if (def.fixed_amount_cents !== undefined) return def.fixed_amount_cents
  return Math.round((quotedPriceCents * (def.percentage ?? 0)) / 100)
}

function calculateMilestoneDueDate(def: MilestoneDefinition, eventDate: string): string | null {
  const event = new Date(eventDate)

  switch (def.due_trigger) {
    case 'on_confirmation':
      return new Date().toISOString().split('T')[0]
    case 'days_before_event':
      return new Date(event.getTime() - def.due_offset_days * 86400000).toISOString().split('T')[0]
    case 'day_of_event':
      return eventDate
    case 'days_after_event':
      return new Date(event.getTime() + def.due_offset_days * 86400000).toISOString().split('T')[0]
    default:
      return null
  }
}

describe('calculateMilestoneAmount', () => {
  it('calculates percentage-based amount', () => {
    const result = calculateMilestoneAmount(
      { name: 'Deposit', percentage: 25, due_trigger: 'on_confirmation', due_offset_days: 0 },
      200000 // $2,000
    )
    assert.strictEqual(result, 50000) // $500
  })

  it('uses fixed amount when provided', () => {
    const result = calculateMilestoneAmount(
      {
        name: 'Grocery Advance',
        fixed_amount_cents: 35000,
        due_trigger: 'days_before_event',
        due_offset_days: 7,
      },
      200000
    )
    assert.strictEqual(result, 35000) // $350 fixed
  })

  it('rounds to nearest cent', () => {
    const result = calculateMilestoneAmount(
      { name: 'Deposit', percentage: 33, due_trigger: 'on_confirmation', due_offset_days: 0 },
      100000 // $1,000
    )
    assert.strictEqual(result, 33000) // $330
  })

  it('handles 100% milestone', () => {
    const result = calculateMilestoneAmount(
      { name: 'Full Payment', percentage: 100, due_trigger: 'on_confirmation', due_offset_days: 0 },
      150000
    )
    assert.strictEqual(result, 150000)
  })

  it('handles 0% milestone', () => {
    const result = calculateMilestoneAmount(
      { name: 'Tip', percentage: 0, due_trigger: 'days_after_event', due_offset_days: 0 },
      150000
    )
    assert.strictEqual(result, 0)
  })
})

describe('calculateMilestoneDueDate', () => {
  it('calculates days_before_event correctly', () => {
    const result = calculateMilestoneDueDate(
      { name: 'Grocery', due_trigger: 'days_before_event', due_offset_days: 7 },
      '2026-03-20'
    )
    assert.strictEqual(result, '2026-03-13')
  })

  it('calculates day_of_event', () => {
    const result = calculateMilestoneDueDate(
      { name: 'Balance', due_trigger: 'day_of_event', due_offset_days: 0 },
      '2026-03-20'
    )
    assert.strictEqual(result, '2026-03-20')
  })

  it('calculates days_after_event', () => {
    const result = calculateMilestoneDueDate(
      { name: 'Reconciliation', due_trigger: 'days_after_event', due_offset_days: 3 },
      '2026-03-20'
    )
    assert.strictEqual(result, '2026-03-23')
  })

  it('handles month boundaries', () => {
    const result = calculateMilestoneDueDate(
      { name: 'Grocery', due_trigger: 'days_before_event', due_offset_days: 7 },
      '2026-04-03'
    )
    assert.strictEqual(result, '2026-03-27')
  })
})

describe('Standard milestone template', () => {
  const standardMilestones: MilestoneDefinition[] = [
    { name: 'Deposit', percentage: 25, due_trigger: 'on_confirmation', due_offset_days: 0 },
    {
      name: 'Grocery Advance',
      percentage: 20,
      due_trigger: 'days_before_event',
      due_offset_days: 7,
    },
    { name: 'Balance', percentage: 55, due_trigger: 'day_of_event', due_offset_days: 0 },
  ]

  it('milestone percentages sum to 100%', () => {
    const total = standardMilestones.reduce((sum, m) => sum + (m.percentage ?? 0), 0)
    assert.strictEqual(total, 100)
  })

  it('all amounts sum to quoted price', () => {
    const quotedPrice = 180000 // $1,800
    const total = standardMilestones.reduce(
      (sum, m) => sum + calculateMilestoneAmount(m, quotedPrice),
      0
    )
    assert.strictEqual(total, quotedPrice)
  })
})
