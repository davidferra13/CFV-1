import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  calculateTakeAChefFinanceSummary,
  extractTakeAChefFinanceMeta,
  mergeTakeAChefFinanceMeta,
} from '../../lib/integrations/take-a-chef-finance'
import { getDefaultTakeAChefCommissionPercent } from '../../lib/integrations/take-a-chef-defaults'

describe('Take a Chef finance helpers', () => {
  it('extracts TAC finance metadata from inquiry unknown fields', () => {
    const meta = extractTakeAChefFinanceMeta({
      some_other_key: 'keep me',
      take_a_chef_finance: {
        gross_booking_cents: 180000,
        commission_percent: 18,
        payout_amount_cents: 147600,
        payout_status: 'paid',
        payout_arrival_date: '2026-03-04',
        payout_reference: 'payout-123',
        notes: 'Settled normally',
      },
    })

    assert.deepEqual(meta, {
      grossBookingCents: 180000,
      commissionPercent: 18,
      payoutAmountCents: 147600,
      payoutStatus: 'paid',
      payoutArrivalDate: '2026-03-04',
      payoutReference: 'payout-123',
      notes: 'Settled normally',
      updatedAt: null,
    })
  })

  it('merges finance updates without dropping unrelated unknown fields', () => {
    const merged = mergeTakeAChefFinanceMeta({
      unknownFields: {
        client_name: 'Nancy Talarico',
        take_a_chef_finance: {
          gross_booking_cents: 180000,
          commission_percent: 18,
          payout_status: 'pending',
        },
      },
      updates: {
        payoutStatus: 'paid',
        payoutArrivalDate: '2026-03-05',
        payoutAmountCents: 147600,
      },
    }) as Record<string, unknown>

    assert.equal(merged.client_name, 'Nancy Talarico')
    assert.deepEqual(merged.take_a_chef_finance, {
      gross_booking_cents: 180000,
      commission_percent: 18,
      payout_amount_cents: 147600,
      payout_status: 'paid',
      payout_arrival_date: '2026-03-05',
      payout_reference: null,
      notes: null,
      updated_at: null,
    })
  })

  it('derives payout summary and detects commission mismatches', () => {
    const summary = calculateTakeAChefFinanceSummary({
      grossBookingCents: 200000,
      explicitCommissionPercent: null,
      loggedCommissionCents: 40000,
      payoutAmountCents: 156000,
      payoutStatus: 'paid',
      defaultCommissionPercent: 18,
    })

    assert.equal(summary.commissionPercent, 20)
    assert.equal(summary.commissionPercentSource, 'derived')
    assert.equal(summary.expectedCommissionCents, 40000)
    assert.equal(summary.expectedNetPayoutCents, 160000)
    assert.equal(summary.netPayoutGapCents, -4000)
    assert.equal(summary.commissionState, 'matched')
  })

  it('uses the March 9, 2026 commission changeover date', () => {
    assert.equal(getDefaultTakeAChefCommissionPercent('2026-03-08T23:59:59Z'), 18)
    assert.equal(getDefaultTakeAChefCommissionPercent('2026-03-09T00:00:00Z'), 20)
  })
})
