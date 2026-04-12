// Food Cost Dashboard - Track food cost %, daily revenue vs purchases
// Part of the Vendor & Food Cost System

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { listDailyRevenue } from '@/lib/vendors/revenue-actions'
import { listInvoices } from '@/lib/vendors/invoice-actions'
import { listVendors } from '@/lib/vendors/actions'
import { getPriceComparisonAll } from '@/lib/vendors/vendor-item-actions'
import { FoodCostDashboard } from '@/components/vendors/food-cost-dashboard'
import { PriceComparison } from '@/components/vendors/price-comparison'
import { DailyRevenueForm } from '@/components/vendors/daily-revenue-form'
import { InvoiceForm } from '@/components/vendors/invoice-form'
import { InvoiceCsvUpload } from '@/components/vendors/invoice-csv-upload'

export const metadata: Metadata = { title: 'Food Cost Dashboard' }

function liso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekRange(): { start: string; end: string } {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)
  const endOfWeek = new Date(
    startOfWeek.getFullYear(),
    startOfWeek.getMonth(),
    startOfWeek.getDate() + 6
  )
  return { start: liso(startOfWeek), end: liso(endOfWeek) }
}

function getMonthRange(): { start: string; end: string } {
  const now = new Date()
  return {
    start: liso(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: liso(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  }
}

export default async function FoodCostPage({
  searchParams,
}: {
  searchParams: { start?: string; end?: string }
}) {
  await requireChef()

  const monthRange = getMonthRange()
  const weekRange = getWeekRange()

  // Use search params or default to this month
  const startDate = searchParams.start || monthRange.start
  const endDate = searchParams.end || monthRange.end

  // Fetch data in parallel
  const [revenue, invoices, vendors, priceComparison] = await Promise.all([
    listDailyRevenue(startDate, endDate),
    listInvoices(undefined, startDate, endDate),
    listVendors(),
    getPriceComparisonAll(),
  ])

  // Also get week/month revenue for summary
  const [weekRevenue, monthRevenue, weekInvoices, monthInvoices] = await Promise.all([
    listDailyRevenue(weekRange.start, weekRange.end),
    listDailyRevenue(monthRange.start, monthRange.end),
    listInvoices(undefined, weekRange.start, weekRange.end),
    listInvoices(undefined, monthRange.start, monthRange.end),
  ])

  // Calculate week food cost %
  const weekRevenueCents = weekRevenue.reduce(
    (sum: number, r: any) => sum + (r.total_revenue_cents || 0),
    0
  )
  const weekPurchaseCents = weekInvoices.reduce(
    (sum: number, i: any) => sum + (i.total_cents || 0),
    0
  )
  const thisWeekPercent = weekRevenueCents > 0 ? (weekPurchaseCents / weekRevenueCents) * 100 : 0

  // Calculate month food cost %
  const monthRevenueCents = monthRevenue.reduce(
    (sum: number, r: any) => sum + (r.total_revenue_cents || 0),
    0
  )
  const monthPurchaseCents = monthInvoices.reduce(
    (sum: number, i: any) => sum + (i.total_cents || 0),
    0
  )
  const thisMonthPercent =
    monthRevenueCents > 0 ? (monthPurchaseCents / monthRevenueCents) * 100 : 0

  // Build daily data for the selected range
  const revenueByDate = new Map<string, number>()
  for (const r of revenue) {
    revenueByDate.set((r as any).date, (r as any).total_revenue_cents || 0)
  }

  const purchasesByDate = new Map<string, number>()
  for (const inv of invoices) {
    const date = (inv as any).invoice_date
    purchasesByDate.set(date, (purchasesByDate.get(date) || 0) + ((inv as any).total_cents || 0))
  }

  const allDates = new Set<string>([...revenueByDate.keys(), ...purchasesByDate.keys()])
  const dailyData = Array.from(allDates)
    .sort()
    .reverse()
    .map((date) => {
      const revCents = revenueByDate.get(date) || 0
      const purchCents = purchasesByDate.get(date) || 0
      const foodCostPercent = revCents > 0 ? (purchCents / revCents) * 100 : 0
      return {
        date,
        revenueCents: revCents,
        purchasesCents: purchCents,
        foodCostPercent,
      }
    })

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Food Cost Dashboard</h1>
        <p className="mt-1 text-sm text-stone-500">
          Track your food cost percentage by comparing daily revenue against vendor purchases.
        </p>
      </div>

      {/* Date range form */}
      <form method="get" action="/food-cost" className="flex items-end gap-3 flex-wrap">
        <div>
          <label htmlFor="fc-start-date" className="block text-xs text-stone-400 mb-1">
            Start Date
          </label>
          <input
            id="fc-start-date"
            type="date"
            name="start"
            title="Start date for food cost range"
            defaultValue={startDate}
            className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="fc-end-date" className="block text-xs text-stone-400 mb-1">
            End Date
          </label>
          <input
            id="fc-end-date"
            type="date"
            name="end"
            title="End date for food cost range"
            defaultValue={endDate}
            className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          Apply
        </button>
      </form>

      {/* Dashboard */}
      <FoodCostDashboard
        thisWeekPercent={thisWeekPercent}
        thisMonthPercent={thisMonthPercent}
        targetPercent={30}
        dailyData={dailyData}
      />

      {/* Price comparison */}
      <PriceComparison data={priceComparison as any} />

      {/* Daily revenue entry */}
      <DailyRevenueForm />

      {/* Quick invoice logging */}
      <details>
        <summary className="cursor-pointer text-sm font-medium text-brand-400 hover:text-brand-300">
          + Log Invoice
        </summary>
        <div className="mt-4">
          <InvoiceForm vendors={vendors} />
        </div>
      </details>

      {/* CSV upload */}
      <details>
        <summary className="cursor-pointer text-sm font-medium text-brand-400 hover:text-brand-300">
          + Import Invoice from CSV
        </summary>
        <div className="mt-4">
          <InvoiceCsvUpload vendors={vendors} />
        </div>
      </details>
    </div>
  )
}
