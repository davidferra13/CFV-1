// Commerce Engine V1 - Popular Items Analytics
// Aggregates top-selling products by quantity, revenue, and order frequency.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'

export interface PopularItem {
  productId: string
  productName: string
  category: string | null
  totalQuantitySold: number
  totalRevenueCents: number
  orderCount: number
  avgUnitPriceCents: number
  lastSoldAt: string | null
}

export interface PopularItemsResult {
  items: PopularItem[]
  period: 'week' | 'month' | 'quarter' | 'all'
  totalSalesInPeriod: number
  totalRevenueInPeriod: number
}

export async function getPopularItems(
  period: 'week' | 'month' | 'quarter' | 'all' = 'month'
): Promise<PopularItemsResult> {
  const user = await requireChef()
  await requirePro('commerce')

  const { pgClient: pg } = await import('@/lib/db/index')

  const tenantId = user.tenantId!

  // Calculate date cutoff
  const daysMap: Record<string, number | null> = {
    week: 7,
    month: 30,
    quarter: 90,
    all: null,
  }
  const days = daysMap[period]

  // Build date filter clause
  const dateFilter =
    days !== null ? pg`AND s.created_at >= NOW() - INTERVAL '1 day' * ${days}` : pg``

  // Top 10 items by quantity sold
  const items = await pg`
    SELECT
      si.product_projection_id AS "productId",
      si.name AS "productName",
      pp.category AS "category",
      COALESCE(SUM(si.quantity), 0)::int AS "totalQuantitySold",
      COALESCE(SUM(si.line_total_cents), 0)::int AS "totalRevenueCents",
      COUNT(DISTINCT si.sale_id)::int AS "orderCount",
      COALESCE(AVG(si.unit_price_cents), 0)::int AS "avgUnitPriceCents",
      MAX(s.created_at)::text AS "lastSoldAt"
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id AND s.tenant_id = si.tenant_id
    LEFT JOIN product_projections pp ON pp.id = si.product_projection_id AND pp.tenant_id = si.tenant_id
    WHERE si.tenant_id = ${tenantId}
      AND s.status = 'captured'
      ${dateFilter}
    GROUP BY si.product_projection_id, si.name, pp.category
    ORDER BY "totalQuantitySold" DESC
    LIMIT 10
  `

  // Period totals
  const totalsRows = await pg`
    SELECT
      COUNT(*)::int AS "totalSales",
      COALESCE(SUM(total_cents), 0)::int AS "totalRevenue"
    FROM sales
    WHERE tenant_id = ${tenantId}
      AND status = 'captured'
      ${dateFilter}
  `

  const totals = totalsRows[0] ?? { totalSales: 0, totalRevenue: 0 }

  return {
    items: items.map((row: any) => ({
      productId: row.productId ?? '',
      productName: row.productName ?? 'Unknown',
      category: row.category ?? null,
      totalQuantitySold: row.totalQuantitySold ?? 0,
      totalRevenueCents: row.totalRevenueCents ?? 0,
      orderCount: row.orderCount ?? 0,
      avgUnitPriceCents: row.avgUnitPriceCents ?? 0,
      lastSoldAt: row.lastSoldAt ?? null,
    })),
    period,
    totalSalesInPeriod: totals.totalSales ?? 0,
    totalRevenueInPeriod: totals.totalRevenue ?? 0,
  }
}
