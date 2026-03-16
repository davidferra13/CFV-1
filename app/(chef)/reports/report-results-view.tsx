'use client'

import type { GeneratedReport } from '@/lib/reports/report-actions'

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function formatPercent(value: number | null): string {
  return value != null ? `${value}%` : 'N/A'
}

type Props = {
  report: GeneratedReport
}

export function ReportResultsView({ report }: Props) {
  switch (report.type) {
    case 'revenue-summary':
      return <RevenueSummaryView data={report.data} />
    case 'client-activity':
      return <ClientActivityView data={report.data} />
    case 'event-performance':
      return <EventPerformanceView data={report.data} />
    case 'expense-breakdown':
      return <ExpenseBreakdownView data={report.data} />
    case 'pipeline-conversion':
      return <PipelineConversionView data={report.data} />
    default:
      return <p className="text-stone-400">Unknown report type.</p>
  }
}

// ── Revenue Summary ────────────────────────────────────────────────────────

function RevenueSummaryView({
  data,
}: {
  data: GeneratedReport extends { type: 'revenue-summary'; data: infer D } ? D : never
}) {
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Gross Revenue" value={formatCents(data.totalGrossRevenueCents)} />
        <SummaryCard label="Net Revenue" value={formatCents(data.totalNetRevenueCents)} />
        <SummaryCard label="Expenses" value={formatCents(data.totalExpensesCents)} />
        <SummaryCard
          label="Profit"
          value={formatCents(data.totalProfitCents)}
          highlight={data.totalProfitCents > 0}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={['Period', 'Gross', 'Refunds', 'Net', 'Tips', 'Expenses', 'Profit']}
        rows={data.rows.map((r) => [
          r.period,
          formatCents(r.grossRevenueCents),
          formatCents(r.refundsCents),
          formatCents(r.netRevenueCents),
          formatCents(r.tipsCents),
          formatCents(r.expensesCents),
          formatCents(r.profitCents),
        ])}
      />
    </div>
  )
}

// ── Client Activity ────────────────────────────────────────────────────────

function ClientActivityView({
  data,
}: {
  data: GeneratedReport extends { type: 'client-activity'; data: infer D } ? D : never
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Total Clients" value={String(data.totalClients)} />
        <SummaryCard label="Total Bookings" value={String(data.totalBookings)} />
        <SummaryCard label="Total Spend" value={formatCents(data.totalSpendCents)} />
      </div>

      <DataTable
        columns={['Client', 'Bookings', 'Total Spend', 'Last Event']}
        rows={data.rows.map((r) => [
          r.clientName,
          String(r.totalBookings),
          formatCents(r.totalSpendCents),
          r.lastEventDate || 'N/A',
        ])}
      />
    </div>
  )
}

// ── Event Performance ──────────────────────────────────────────────────────

function EventPerformanceView({
  data,
}: {
  data: GeneratedReport extends { type: 'event-performance'; data: infer D } ? D : never
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Total Events" value={String(data.totalEvents)} />
        <SummaryCard label="Total Revenue" value={formatCents(data.totalRevenueCents)} />
        <SummaryCard label="Avg Margin" value={formatPercent(data.avgMarginPercent)} />
      </div>

      <DataTable
        columns={['Period', 'Events', 'Revenue', 'Expenses', 'Avg Margin']}
        rows={data.rows.map((r) => [
          r.period,
          String(r.eventCount),
          formatCents(r.totalRevenueCents),
          formatCents(r.totalExpensesCents),
          formatPercent(r.avgMarginPercent),
        ])}
      />
    </div>
  )
}

// ── Expense Breakdown ──────────────────────────────────────────────────────

function ExpenseBreakdownView({
  data,
}: {
  data: GeneratedReport extends { type: 'expense-breakdown'; data: infer D } ? D : never
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="Total Expenses" value={formatCents(data.totalExpensesCents)} />
        <SummaryCard label="Categories" value={String(data.categories.length)} />
      </div>

      <DataTable
        columns={['Category', 'Period', 'Total', 'Count']}
        rows={data.rows.map((r) => [
          r.category,
          r.period,
          formatCents(r.totalCents),
          String(r.count),
        ])}
      />
    </div>
  )
}

// ── Pipeline Conversion ────────────────────────────────────────────────────

function PipelineConversionView({
  data,
}: {
  data: GeneratedReport extends { type: 'pipeline-conversion'; data: infer D } ? D : never
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Inquiries" value={String(data.totalInquiries)} />
        <SummaryCard label="Events Created" value={String(data.totalEventsCreated)} />
        <SummaryCard label="Completed" value={String(data.totalCompleted)} />
        <SummaryCard
          label="Inquiry-to-Event"
          value={formatPercent(data.inquiryToEventRate)}
          highlight={(data.inquiryToEventRate || 0) > 50}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="Event-to-Complete" value={formatPercent(data.eventToCompletedRate)} />
        <SummaryCard
          label="Avg Days to Event"
          value={data.avgDaysToFirstEvent != null ? `${data.avgDaysToFirstEvent} days` : 'N/A'}
        />
      </div>

      {data.bySource.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-stone-300 mt-4">By Source</h3>
          <DataTable
            columns={['Source', 'Inquiries', 'Events', 'Conversion']}
            rows={data.bySource.map((r) => [
              r.source,
              String(r.inquiries),
              String(r.events),
              formatPercent(r.conversionRate),
            ])}
          />
        </>
      )}
    </div>
  )
}

// ── Shared Components ──────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800 p-3">
      <p className="text-xs text-stone-500 uppercase tracking-wider">{label}</p>
      <p
        className={`text-lg font-semibold mt-1 ${highlight ? 'text-emerald-400' : 'text-stone-100'}`}
      >
        {value}
      </p>
    </div>
  )
}

function DataTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-800 p-6 text-center text-stone-500">
        No data for this date range.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-stone-800">
            {columns.map((col) => (
              <th
                key={col}
                className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-stone-400"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-800">
          {rows.map((row, i) => (
            <tr key={i} className="bg-stone-900 hover:bg-stone-800/50">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 text-stone-300 whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
