type SaleLike = {
  id: string
  status?: string | null
}

type PaymentLike = {
  sale_id?: string | null
  amount_cents?: number | null
  tip_cents?: number | null
  status?: string | null
}

const CAPTURED_PAYMENT_STATUSES = new Set(['captured', 'settled'])
const NON_COUNTABLE_SALE_STATUSES = new Set(['draft', 'voided'])

export function computeRegisterSessionTotals(input: {
  sales: SaleLike[]
  payments: PaymentLike[]
}) {
  const sales = Array.isArray(input.sales) ? input.sales : []
  const payments = Array.isArray(input.payments) ? input.payments : []

  const eligibleSales = new Set(
    sales
      .filter((sale) => !NON_COUNTABLE_SALE_STATUSES.has((sale.status ?? '').toLowerCase()))
      .map((sale) => sale.id)
      .filter(Boolean)
  )

  let totalRevenueCents = 0
  let totalTipsCents = 0
  const paidSaleIds = new Set<string>()

  for (const payment of payments) {
    const saleId = payment.sale_id ?? ''
    if (!saleId || !eligibleSales.has(saleId)) continue
    if (!CAPTURED_PAYMENT_STATUSES.has((payment.status ?? '').toLowerCase())) continue

    totalRevenueCents += payment.amount_cents ?? 0
    totalTipsCents += payment.tip_cents ?? 0
    paidSaleIds.add(saleId)
  }

  return {
    totalSalesCount: paidSaleIds.size,
    totalRevenueCents,
    totalTipsCents,
  }
}

