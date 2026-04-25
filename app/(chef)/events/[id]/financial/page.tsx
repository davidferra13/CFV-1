// Event Financial Summary Page - Standalone financial close view
// Shows complete P&L picture for one event: revenue, costs, margins, time, mileage, comparison.
// Separate from the event detail page so it can be bookmarked and shared with an accountant.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEventFinancialSummaryFull } from '@/lib/events/financial-summary-actions'
import { getEventReadinessAssistant } from '@/lib/events/event-readiness-assistant-actions'
import { getEventPricingIntelligence } from '@/lib/finance/event-pricing-intelligence-actions'
import { EventReadinessAssistantPanel } from '@/components/events/event-readiness-assistant-panel'
import { FinancialSummaryView } from '@/components/events/financial-summary-view'
import { CostVarianceCard } from '@/components/finance/cost-variance-card'
import { EventPricingIntelligencePanel } from '@/components/finance/event-pricing-intelligence-panel'
import { Button } from '@/components/ui/button'
import { UpgradePrompt } from '@/components/billing/upgrade-prompt'

export default async function EventFinancialPage({ params }: { params: { id: string } }) {
  await requireChef()

  const [data, pricingIntelligence] = await Promise.all([
    getEventFinancialSummaryFull(params.id),
    getEventPricingIntelligence(params.id).catch(() => null),
  ])
  const readinessAssistant = await getEventReadinessAssistant(params.id, pricingIntelligence).catch(
    () => null
  )

  if (!data) {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link + PDF download */}
      <div className="flex justify-between items-center">
        <Link href={`/events/${params.id}`}>
          <Button variant="ghost" size="sm">
            ← Back to Event
          </Button>
        </Link>
        <a
          href={`/api/documents/financial-summary/${params.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-lg border border-stone-600 px-3 py-1.5 text-sm font-medium text-stone-300 hover:bg-stone-800"
        >
          Download PDF
        </a>
      </div>

      <EventReadinessAssistantPanel eventId={params.id} readiness={readinessAssistant} />

      <FinancialSummaryView data={data} />

      <EventPricingIntelligencePanel data={pricingIntelligence} />

      {/* Estimated vs Actual Cost Variance (from expense line items) */}
      <CostVarianceCard eventId={params.id} />

      {/* Prompt for full profitability tracking after free summary is visible */}
      <UpgradePrompt featureSlug="event-profitability" show={true} />
    </div>
  )
}
