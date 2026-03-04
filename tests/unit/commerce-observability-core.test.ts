import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computePosDailyMetricSnapshot,
  normalizePosAlertSeverity,
  normalizePosAlertStatus,
} from '@/lib/commerce/observability-core'

test('computePosDailyMetricSnapshot aggregates sales/refunds/alerts correctly', () => {
  const snapshot = computePosDailyMetricSnapshot({
    sales: [
      { status: 'captured', total_cents: 1000 },
      { status: 'settled', total_cents: 500 },
      { status: 'voided', total_cents: 700 },
    ],
    refunds: [{ amount_cents: 200 }],
    sessions: [{ cash_variance_cents: 50 }, { cash_variance_cents: -20 }],
    alerts: [
      { status: 'open', severity: 'warning' },
      { status: 'open', severity: 'error' },
      { status: 'resolved', severity: 'critical' },
    ],
  })

  assert.equal(snapshot.totalSalesCount, 2)
  assert.equal(snapshot.grossRevenueCents, 1500)
  assert.equal(snapshot.refundsCents, 200)
  assert.equal(snapshot.netRevenueCents, 1300)
  assert.equal(snapshot.voidedSalesCount, 1)
  assert.equal(snapshot.cashVarianceCents, 30)
  assert.equal(snapshot.openAlertCount, 2)
  assert.equal(snapshot.warningAlertCount, 1)
  assert.equal(snapshot.errorAlertCount, 2)
})

test('normalizePosAlertSeverity and status fallback safely', () => {
  assert.equal(normalizePosAlertSeverity('critical'), 'critical')
  assert.equal(normalizePosAlertSeverity('unknown'), 'warning')
  assert.equal(normalizePosAlertStatus('resolved'), 'resolved')
  assert.equal(normalizePosAlertStatus('weird'), 'open')
})
