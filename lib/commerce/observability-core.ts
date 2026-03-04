export const POS_ALERT_SEVERITIES = ['info', 'warning', 'error', 'critical'] as const
export type PosAlertSeverity = (typeof POS_ALERT_SEVERITIES)[number]

export const POS_ALERT_STATUSES = ['open', 'acknowledged', 'resolved'] as const
export type PosAlertStatus = (typeof POS_ALERT_STATUSES)[number]

export type PosDailyMetricInput = {
  sales: Array<{ status?: string | null; total_cents?: number | null }>
  refunds: Array<{ amount_cents?: number | null }>
  sessions: Array<{ cash_variance_cents?: number | null }>
  alerts: Array<{ status?: string | null; severity?: string | null }>
}

export type PosDailyMetricSnapshot = {
  totalSalesCount: number
  grossRevenueCents: number
  netRevenueCents: number
  refundsCents: number
  voidedSalesCount: number
  cashVarianceCents: number
  openAlertCount: number
  errorAlertCount: number
  warningAlertCount: number
}

const VALID_SALE_STATUSES = new Set(['captured', 'settled', 'partially_refunded', 'fully_refunded'])

export function normalizePosAlertSeverity(raw: unknown): PosAlertSeverity {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (POS_ALERT_SEVERITIES.includes(value as PosAlertSeverity)) {
    return value as PosAlertSeverity
  }
  return 'warning'
}

export function normalizePosAlertStatus(raw: unknown): PosAlertStatus {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (POS_ALERT_STATUSES.includes(value as PosAlertStatus)) {
    return value as PosAlertStatus
  }
  return 'open'
}

export function computePosDailyMetricSnapshot(input: PosDailyMetricInput): PosDailyMetricSnapshot {
  const sales = Array.isArray(input.sales) ? input.sales : []
  const refunds = Array.isArray(input.refunds) ? input.refunds : []
  const sessions = Array.isArray(input.sessions) ? input.sessions : []
  const alerts = Array.isArray(input.alerts) ? input.alerts : []

  const paidSales = sales.filter((sale) =>
    VALID_SALE_STATUSES.has(String(sale.status ?? '').toLowerCase())
  )
  const grossRevenueCents = paidSales.reduce((sum, sale) => sum + (sale.total_cents ?? 0), 0)
  const refundsCents = refunds.reduce((sum, refund) => sum + (refund.amount_cents ?? 0), 0)
  const voidedSalesCount = sales.filter(
    (sale) => String(sale.status ?? '').toLowerCase() === 'voided'
  ).length
  const cashVarianceCents = sessions.reduce(
    (sum, session) => sum + (session.cash_variance_cents ?? 0),
    0
  )

  let openAlertCount = 0
  let errorAlertCount = 0
  let warningAlertCount = 0
  for (const alert of alerts) {
    const status = normalizePosAlertStatus(alert.status)
    const severity = normalizePosAlertSeverity(alert.severity)
    if (status === 'open') openAlertCount += 1
    if (severity === 'error' || severity === 'critical') errorAlertCount += 1
    if (severity === 'warning') warningAlertCount += 1
  }

  return {
    totalSalesCount: paidSales.length,
    grossRevenueCents,
    netRevenueCents: grossRevenueCents - refundsCents,
    refundsCents,
    voidedSalesCount,
    cashVarianceCents,
    openAlertCount,
    errorAlertCount,
    warningAlertCount,
  }
}
