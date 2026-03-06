// Client Inquiry Detail — /my-inquiries/[id]
// Read-only summary of a single inquiry for the client.
// Budget channel remains internal; submitted budget intent is shown to clients.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { getClientInquiryById } from '@/lib/inquiries/client-actions'
import { InquirySummary, type InquirySummaryData } from '@/components/inquiries/inquiry-summary'
import type { InquiryStatus } from '@/components/inquiries/inquiry-status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from '@/components/ui/icons'
import { EventJourneyStepper } from '@/components/events/event-journey-stepper'
import { buildJourneySteps } from '@/lib/events/journey-steps'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = {
  title: 'Inquiry Details - ChefFlow',
}

function getBudgetRangeLabel(rawValue: unknown): string | null {
  if (typeof rawValue !== 'string' || !rawValue) return null
  const labels: Record<string, string> = {
    under_500: 'Under $500',
    '500_1500': '$500-$1,500',
    '1500_3000': '$1,500-$3,000',
    '3000_5000': '$3,000-$5,000',
    over_5000: '$5,000+',
    not_sure: 'Not sure yet',
  }
  return labels[rawValue] ?? null
}

export default async function ClientInquiryDetailPage({ params }: { params: { id: string } }) {
  await requireClient()

  const inquiry = await getClientInquiryById(params.id)

  if (!inquiry) {
    notFound()
  }

  const unknownFields =
    inquiry.unknown_fields && typeof inquiry.unknown_fields === 'object'
      ? (inquiry.unknown_fields as Record<string, unknown>)
      : null
  const submittedBudgetLabel =
    inquiry.confirmed_budget_cents != null
      ? formatCurrency(inquiry.confirmed_budget_cents)
      : getBudgetRangeLabel(unknownFields?.budget_range)

  const summaryData: InquirySummaryData = {
    id: inquiry.id,
    status: inquiry.status as InquiryStatus,
    channel: null, // internal — not surfaced to clients
    confirmed_occasion: inquiry.confirmed_occasion,
    confirmed_date: inquiry.confirmed_date,
    confirmed_guest_count: inquiry.confirmed_guest_count,
    confirmed_location: inquiry.confirmed_location,
    confirmed_budget_cents: inquiry.confirmed_budget_cents,
    submitted_budget_label: submittedBudgetLabel,
    confirmed_dietary_restrictions: inquiry.confirmed_dietary_restrictions,
    confirmed_service_expectations: inquiry.confirmed_service_expectations,
    source_message: inquiry.source_message,
    first_contact_at: inquiry.first_contact_at,
    last_response_at: inquiry.last_response_at,
    updated_at: inquiry.updated_at,
    transitions: inquiry.transitions,
    quotes: inquiry.quotes,
    converted_to_event_id: inquiry.converted_to_event_id,
  }

  // Build journey steps from available inquiry/quote data (no event context yet)
  const firstQuote = inquiry.quotes[0] ?? null
  const journeySteps = buildJourneySteps({
    inquiryCreatedAt: inquiry.first_contact_at,
    quoteSentAt: firstQuote?.sent_at ?? null,
    quoteStatus: firstQuote?.status ?? null,
    eventTransitions: [],
    hasPhotos: false,
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/my-inquiries"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-200 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to My Inquiries
      </Link>

      {/* Journey stepper — partial view (steps up to current inquiry state) */}
      {inquiry.status !== 'declined' && inquiry.status !== 'expired' && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Your Journey</CardTitle>
          </CardHeader>
          <CardContent>
            <EventJourneyStepper steps={journeySteps} />
          </CardContent>
        </Card>
      )}

      {/* Beautiful inquiry summary */}
      <InquirySummary data={summaryData} variant="client" />

      {/* Confirmed — link to the resulting event */}
      {inquiry.converted_to_event_id && (
        <Card className="p-5">
          <p className="text-sm text-stone-400 mb-3">
            This inquiry has been confirmed and converted into a booking.
          </p>
          <Link href={`/my-events/${inquiry.converted_to_event_id}`}>
            <Button>View Your Event &rarr;</Button>
          </Link>
        </Card>
      )}
    </div>
  )
}
