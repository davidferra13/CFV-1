import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeRegisterSessionTotals } from '@/lib/commerce/register-metrics'

describe('computeRegisterSessionTotals', () => {
  it('counts only sales with captured/settled payments', () => {
    const totals = computeRegisterSessionTotals({
      sales: [
        { id: 'sale_a', status: 'captured' },
        { id: 'sale_b', status: 'pending_payment' },
        { id: 'sale_c', status: 'draft' },
      ],
      payments: [
        { sale_id: 'sale_a', amount_cents: 1000, tip_cents: 200, status: 'captured' },
        { sale_id: 'sale_b', amount_cents: 500, tip_cents: 0, status: 'settled' },
        { sale_id: 'sale_c', amount_cents: 900, tip_cents: 100, status: 'captured' },
      ],
    })

    assert.equal(totals.totalSalesCount, 2)
    assert.equal(totals.totalRevenueCents, 1500)
    assert.equal(totals.totalTipsCents, 200)
  })

  it('deduplicates multi-payment sales for totalSalesCount', () => {
    const totals = computeRegisterSessionTotals({
      sales: [{ id: 'sale_a', status: 'captured' }],
      payments: [
        { sale_id: 'sale_a', amount_cents: 1000, tip_cents: 100, status: 'captured' },
        { sale_id: 'sale_a', amount_cents: 300, tip_cents: 50, status: 'settled' },
      ],
    })

    assert.equal(totals.totalSalesCount, 1)
    assert.equal(totals.totalRevenueCents, 1300)
    assert.equal(totals.totalTipsCents, 150)
  })

  it('excludes voided and draft sales even if payments exist', () => {
    const totals = computeRegisterSessionTotals({
      sales: [
        { id: 'sale_void', status: 'voided' },
        { id: 'sale_draft', status: 'draft' },
      ],
      payments: [
        { sale_id: 'sale_void', amount_cents: 1000, tip_cents: 0, status: 'captured' },
        { sale_id: 'sale_draft', amount_cents: 800, tip_cents: 0, status: 'settled' },
      ],
    })

    assert.equal(totals.totalSalesCount, 0)
    assert.equal(totals.totalRevenueCents, 0)
    assert.equal(totals.totalTipsCents, 0)
  })
})

