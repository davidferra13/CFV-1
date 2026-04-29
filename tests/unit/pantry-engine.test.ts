import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  computePantryStockPositions,
  decideCountAdjustment,
} from '../../lib/inventory/pantry-engine'

test('decideCountAdjustment creates an opening balance when no ledger exists', () => {
  assert.deepEqual(
    decideCountAdjustment({ targetQty: 12, ledgerQty: 0, hasLedgerMovements: false }),
    {
      transactionType: 'opening_balance',
      quantity: 12,
      confidenceStatus: 'confirmed',
      evidenceSourceType: 'baseline_count',
    }
  )
})

test('decideCountAdjustment creates a delta adjustment when ledger exists', () => {
  assert.deepEqual(
    decideCountAdjustment({ targetQty: 7, ledgerQty: 10, hasLedgerMovements: true }),
    {
      transactionType: 'audit_adjustment',
      quantity: -3,
      confidenceStatus: 'confirmed',
      evidenceSourceType: 'manual_adjustment',
    }
  )
})

test('computePantryStockPositions marks legacy-only counts unknown', () => {
  const [item] = computePantryStockPositions({
    movements: [],
    counts: [
      {
        ingredient_name: 'Olive Oil',
        current_qty: 2,
        par_level: 3,
        unit: 'L',
      },
    ],
    now: new Date('2026-04-29T12:00:00Z'),
  })

  assert.equal(item.currentQty, 2)
  assert.equal(item.confidenceStatus, 'unknown')
  assert.equal(item.status, 'unknown')
  assert.equal(item.source, 'legacy_count')
})

test('computePantryStockPositions computes confirmed ledger stock and par deficit', () => {
  const [item] = computePantryStockPositions({
    movements: [
      {
        ingredient_id: 'ing-1',
        ingredient_name: 'Chicken',
        transaction_type: 'receive',
        quantity: 10,
        unit: 'lb',
        created_at: '2026-04-28T12:00:00Z',
        confidence_status: 'confirmed',
        review_status: 'approved',
      },
      {
        ingredient_id: 'ing-1',
        ingredient_name: 'Chicken',
        transaction_type: 'event_deduction',
        quantity: -8,
        unit: 'lb',
        created_at: '2026-04-29T10:00:00Z',
        confidence_status: 'confirmed',
        review_status: 'approved',
      },
    ],
    counts: [
      {
        ingredient_id: 'ing-1',
        ingredient_name: 'Chicken',
        current_qty: 99,
        par_level: 5,
        unit: 'lb',
      },
    ],
    now: new Date('2026-04-29T12:00:00Z'),
  })

  assert.equal(item.currentQty, 2)
  assert.equal(item.confidenceStatus, 'confirmed')
  assert.equal(item.status, 'low')
  assert.equal(item.deficit, 3)
  assert.equal(item.source, 'ledger')
})

test('computePantryStockPositions marks pending review as conflict', () => {
  const [item] = computePantryStockPositions({
    movements: [
      {
        ingredient_name: 'Tomatoes',
        transaction_type: 'receive',
        quantity: 8,
        unit: 'each',
        created_at: '2026-04-29T10:00:00Z',
        confidence_status: 'likely',
        review_status: 'pending_review',
        ingredient_id: null,
      },
    ],
    counts: [],
    now: new Date('2026-04-29T12:00:00Z'),
  })

  assert.equal(item.confidenceStatus, 'conflict')
  assert.equal(item.status, 'unknown')
  assert.equal(item.pendingReviewCount, 1)
})

test('computePantryStockPositions marks old ledger stock stale', () => {
  const [item] = computePantryStockPositions({
    movements: [
      {
        ingredient_name: 'Flour',
        transaction_type: 'opening_balance',
        quantity: 20,
        unit: 'lb',
        created_at: '2026-04-01T10:00:00Z',
        confidence_status: 'confirmed',
        review_status: 'approved',
        ingredient_id: null,
      },
    ],
    counts: [],
    now: new Date('2026-04-29T12:00:00Z'),
    staleAfterDays: 14,
  })

  assert.equal(item.confidenceStatus, 'stale')
  assert.equal(item.status, 'ok')
})
