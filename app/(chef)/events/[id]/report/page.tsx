// Event Cost Report Page
// Printable cost breakdown showing all expenses, actual vs quoted, profit margin.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEventCostReport } from '@/lib/reports/event-cost-actions'
import { ReportHeader } from '@/components/reports/report-header'
import { CostBreakdownTable } from '@/components/reports/cost-breakdown-table'
import { LineItemList } from '@/components/reports/line-item-list'
import { ProfitSummary } from '@/components/reports/profit-summary'
import { PerGuestBreakdownSection } from '@/components/reports/per-guest-breakdown'
import { PrintButton } from '@/components/reports/print-button'
import { Button } from '@/components/ui/button'

export async function generateMetadata() {
  return { title: 'Event Report | ChefFlow' }
}

export default async function EventCostReportPage({ params }: { params: { id: string } }) {
  await requireChef()
  const report = await getEventCostReport(params.id)

  if (!report) {
    notFound()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12 print:max-w-none print:p-0 print:space-y-6">
      {/* Navigation and actions (hidden on print) */}
      <div className="flex justify-between items-center print:hidden">
        <Link href={`/events/${params.id}`}>
          <Button variant="ghost" size="sm">
            ← Back to Event
          </Button>
        </Link>
        <div className="flex gap-2">
          <Link href={`/events/${params.id}/financial`}>
            <Button variant="ghost" size="sm">
              Financial Summary
            </Button>
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* Section 1: Header */}
      <ReportHeader
        eventName={report.eventName}
        eventDate={report.eventDate}
        clientName={report.clientName}
        guestCount={report.guestCount}
      />

      {/* Section 2: Cost Breakdown */}
      <CostBreakdownTable
        categories={report.categoryBreakdown}
        totalActualCents={report.actualCosts.total}
        quotedTotalCents={report.quotedTotalCents}
      />

      {/* Section 3: Profit Summary */}
      <ProfitSummary
        quotedTotalCents={report.quotedTotalCents}
        actualTotalCents={report.actualCosts.total}
        profitCents={report.profitCents}
        profitMarginPercent={report.profitMarginPercent}
      />

      {/* Section 4: Per-Guest Breakdown */}
      <PerGuestBreakdownSection data={report.perGuest} guestCount={report.guestCount} />

      {/* Section 5: Detailed Line Items */}
      <LineItemList items={report.lineItems} />

      {/* Footer with generation timestamp (visible on print) */}
      <div className="text-xs text-stone-500 print:text-stone-400 pt-4 border-t border-stone-800 print:border-stone-300">
        <p>
          Generated{' '}
          {new Date(report.generatedAt).toLocaleString('en-US', {
            dateStyle: 'long',
            timeStyle: 'short',
          })}
        </p>
      </div>
    </div>
  )
}
