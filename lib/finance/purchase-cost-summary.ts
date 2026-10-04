export type PurchaseCostDay = {
  date: string
  revenueCents: number
  purchasesCents: number
  purchasePercent: number | null
}

export type PurchaseCostSummary = {
  revenueCents: number
  purchasesCents: number
  purchasePercent: number | null
  dailyData: PurchaseCostDay[]
}

type RevenueRecord = { date: string; total_revenue_cents: number | null }
type InvoiceRecord = { invoice_date: string; total_cents: number | null }

/** Purchase spending relative to recorded revenue; this is not inventory-adjusted COGS. */
export function calculatePurchaseRatio(
  purchasesCents: number,
  revenueCents: number
): number | null {
  if (!Number.isFinite(purchasesCents) || !Number.isFinite(revenueCents) || revenueCents <= 0)
    return null
  const percent = Math.round((purchasesCents / revenueCents) * 1000) / 10
  return Number.isFinite(percent) ? percent : null
}

export function summarizePurchaseCosts(
  revenue: readonly RevenueRecord[],
  invoices: readonly InvoiceRecord[]
): PurchaseCostSummary {
  const days = new Map<string, { revenueCents: number; purchasesCents: number }>()
  const dayFor = (date: string) => {
    if (!days.has(date)) days.set(date, { revenueCents: 0, purchasesCents: 0 })
    return days.get(date)!
  }
  for (const row of revenue) dayFor(row.date).revenueCents += row.total_revenue_cents ?? 0
  for (const row of invoices) dayFor(row.invoice_date).purchasesCents += row.total_cents ?? 0

  const revenueCents = revenue.reduce((sum, row) => sum + (row.total_revenue_cents ?? 0), 0)
  const purchasesCents = invoices.reduce((sum, row) => sum + (row.total_cents ?? 0), 0)
  return {
    revenueCents,
    purchasesCents,
    purchasePercent: calculatePurchaseRatio(purchasesCents, revenueCents),
    dailyData: [...days]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, totals]) => ({
        date,
        ...totals,
        purchasePercent: calculatePurchaseRatio(totals.purchasesCents, totals.revenueCents),
      })),
  }
}
