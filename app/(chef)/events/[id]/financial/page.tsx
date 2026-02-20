// Event Financial Summary Page — Standalone financial close view
// Shows complete P&L picture for one event: revenue, costs, margins, time, mileage, comparison.
// Separate from the event detail page so it can be bookmarked and shared with an accountant.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEventFinancialSummaryFull } from '@/lib/events/financial-summary-actions'
import { FinancialSummaryView } from '@/components/events/financial-summary-view'
import { Button } from '@/components/ui/button'

export default async function EventFinancialPage({
  params,
}: {
  params: { id: string }
}) {
  await requireChef()

  const data = await getEventFinancialSummaryFull(params.id)

  if (!data) {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link + PDF download */}
      <div className="flex justify-between items-center">
        <Link href={`/events/${params.id}`}>
          <Button variant="ghost" size="sm">← Back to Event</Button>
        </Link>
        <a
          href={`/api/documents/financial-summary/${params.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Download PDF
        </a>
      </div>

      <FinancialSummaryView data={data} />
    </div>
  )
}
