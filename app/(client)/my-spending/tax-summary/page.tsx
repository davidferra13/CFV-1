// Client Tax Summary - Year-end spending summary with printable view

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { getClientTaxSummary } from '@/lib/finance/client-tax-summary-actions'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'

export const metadata: Metadata = { title: 'Tax Summary' }

export default async function TaxSummaryPage({
  searchParams,
}: {
  searchParams: { year?: string }
}) {
  await requireClient()

  const yearParam = searchParams.year ? parseInt(searchParams.year, 10) : undefined
  const summaries = await getClientTaxSummary(yearParam)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Screen-only header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Tax Summary</h1>
          <p className="text-stone-400 mt-1">Year-end spending summary for your records</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={undefined} className="hidden" id="print-trigger" />
          <Link
            href="/my-spending"
            className="text-sm text-stone-400 hover:text-stone-200 transition-colors"
          >
            &larr; Back to spending
          </Link>
        </div>
      </div>

      {/* Print button (client component behavior via native onclick) */}
      <div className="print:hidden">
        <button
          type="button"
          className="px-4 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm font-medium hover:bg-stone-700 transition-colors"
          data-action="print"
        >
          Print / Save as PDF
        </button>
        <PrintScript />
      </div>

      {/* Print header (only visible when printing) */}
      <div className="hidden print:block mb-8">
        <h1 className="text-2xl font-bold text-black">Private Chef Services - Spending Summary</h1>
        <p className="text-gray-600 mt-1">Generated {format(new Date(), 'MMMM d, yyyy')}</p>
      </div>

      {summaries.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-stone-500">
            No completed events found. Spending data appears after your first completed event.
          </p>
        </Card>
      )}

      {summaries.map((summary) => (
        <div key={summary.year} className="space-y-4">
          {/* Year header */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-2 print:border-black">
            <h2 className="text-2xl font-bold text-stone-100 print:text-black">{summary.year}</h2>
            <div className="text-right">
              <p className="text-2xl font-bold text-stone-100 print:text-black">
                {formatCurrency(summary.total_spent_cents)}
              </p>
              <p className="text-sm text-stone-500 print:text-gray-600">
                {summary.event_count} event{summary.event_count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-3">
            <Card className="p-4 print:border-gray-300">
              <p className="text-xs text-stone-500 print:text-gray-500 uppercase tracking-wide">
                Total Spent
              </p>
              <p className="text-lg font-bold text-stone-100 print:text-black mt-1">
                {formatCurrency(summary.total_spent_cents)}
              </p>
            </Card>
            <Card className="p-4 print:border-gray-300">
              <p className="text-xs text-stone-500 print:text-gray-500 uppercase tracking-wide">
                Events
              </p>
              <p className="text-lg font-bold text-stone-100 print:text-black mt-1">
                {summary.event_count}
              </p>
            </Card>
            <Card className="p-4 print:border-gray-300">
              <p className="text-xs text-stone-500 print:text-gray-500 uppercase tracking-wide">
                Avg per Event
              </p>
              <p className="text-lg font-bold text-stone-100 print:text-black mt-1">
                {formatCurrency(summary.average_per_event_cents)}
              </p>
            </Card>
          </div>

          {/* Monthly breakdown */}
          {summary.monthly_breakdown.length > 0 && (
            <Card className="p-4 print:border-gray-300">
              <p className="text-xs text-stone-500 print:text-gray-500 uppercase tracking-wide mb-3">
                Monthly Breakdown
              </p>
              <div className="space-y-2">
                {summary.monthly_breakdown.map((month) => (
                  <div key={month.month} className="flex items-center justify-between text-sm">
                    <span className="text-stone-300 print:text-gray-700">{month.label}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-stone-500 print:text-gray-500">
                        {month.event_count} event{month.event_count !== 1 ? 's' : ''}
                      </span>
                      <span className="text-stone-100 print:text-black font-medium w-24 text-right">
                        {formatCurrency(month.total_cents)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Events list */}
          <Card className="p-4 print:border-gray-300">
            <p className="text-xs text-stone-500 print:text-gray-500 uppercase tracking-wide mb-3">
              Events
            </p>
            <div className="divide-y divide-stone-800 print:divide-gray-300">
              {summary.events.map((event) => (
                <div key={event.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm text-stone-200 print:text-black">
                      {event.occasion || 'Private dinner'}
                    </p>
                    <p className="text-xs text-stone-500 print:text-gray-500">
                      {format(new Date(event.event_date), 'MMM d, yyyy')}
                      {event.guest_count && ` - ${event.guest_count} guests`}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-stone-100 print:text-black">
                    {formatCurrency(event.total_paid_cents)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ))}

      {/* Print styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body { background: white !important; color: black !important; }
              .print\\:hidden { display: none !important; }
              .print\\:block { display: block !important; }
              .print\\:border-gray-300 { border-color: #d1d5db !important; }
              .print\\:border-black { border-color: black !important; }
              .print\\:text-black { color: black !important; }
              .print\\:text-gray-500 { color: #6b7280 !important; }
              .print\\:text-gray-600 { color: #4b5563 !important; }
              .print\\:text-gray-700 { color: #374151 !important; }
              .print\\:divide-gray-300 > * + * { border-color: #d1d5db !important; }
              .print\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
            }
          `,
        }}
      />
    </div>
  )
}

/** Inline script to wire up the print button without a client component */
function PrintScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          document.querySelector('[data-action="print"]')?.addEventListener('click', function() {
            window.print();
          });
        `,
      }}
    />
  )
}
