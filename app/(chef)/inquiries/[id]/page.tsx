// Inquiry Detail Page
// Shows everything about a single inquiry and allows the chef to work it through the pipeline

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getInquiryById } from '@/lib/inquiries/actions'
import { getQuotesForInquiry } from '@/lib/quotes/actions'
import { getMessageThread, getResponseTemplates } from '@/lib/messages/actions'
import { InquiryStatusBadge, InquiryChannelBadge } from '@/components/inquiries/inquiry-status-badge'
import { InquiryTransitions } from '@/components/inquiries/inquiry-transitions'
import { InquiryResponseComposer } from '@/components/inquiries/inquiry-response-composer'
import { QuoteStatusBadge, PricingModelBadge } from '@/components/quotes/quote-status-badge'
import { MessageThread } from '@/components/messages/message-thread'
import { MessageLogForm } from '@/components/messages/message-log-form'
import { getGoogleConnection } from '@/lib/gmail/google-auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { format, formatDistanceToNow } from 'date-fns'

function getDisplayName(inquiry: {
  client: { id: string; full_name: string; email: string; phone: string | null } | null
  unknown_fields: unknown
}): string {
  if (inquiry.client?.full_name) return inquiry.client.full_name
  const unknown = inquiry.unknown_fields as Record<string, unknown> | null
  return (unknown?.client_name as string) || 'Unknown Lead'
}

function getDisplayEmail(inquiry: {
  client: { email: string } | null
  unknown_fields: unknown
}): string | null {
  if (inquiry.client?.email) return inquiry.client.email
  const unknown = inquiry.unknown_fields as Record<string, unknown> | null
  return (unknown?.client_email as string) || null
}

function getDisplayPhone(inquiry: {
  client: { phone: string | null } | null
  unknown_fields: unknown
}): string | null {
  if (inquiry.client?.phone) return inquiry.client.phone
  const unknown = inquiry.unknown_fields as Record<string, unknown> | null
  return (unknown?.client_phone as string) || null
}

function getNotes(inquiry: { unknown_fields: unknown }): string | null {
  const unknown = inquiry.unknown_fields as Record<string, unknown> | null
  return (unknown?.notes as string) || null
}

function getReferralSource(inquiry: { unknown_fields: unknown }): string | null {
  const unknown = inquiry.unknown_fields as Record<string, unknown> | null
  return (unknown?.referral_source as string) || null
}

export default async function InquiryDetailPage({
  params
}: {
  params: { id: string }
}) {
  await requireChef()

  const [inquiry, quotes, messages, templates, gmailStatus] = await Promise.all([
    getInquiryById(params.id),
    getQuotesForInquiry(params.id),
    getMessageThread('inquiry', params.id),
    getResponseTemplates(),
    getGoogleConnection(),
  ])

  if (!inquiry) {
    notFound()
  }

  const name = getDisplayName(inquiry)
  const email = getDisplayEmail(inquiry)
  const phone = getDisplayPhone(inquiry)
  const notes = getNotes(inquiry)
  const referralSource = getReferralSource(inquiry)

  // Track which confirmed facts are still missing
  const missingFacts: string[] = []
  if (!inquiry.confirmed_date) missingFacts.push('Event Date')
  if (!inquiry.confirmed_guest_count) missingFacts.push('Guest Count')
  if (!inquiry.confirmed_location) missingFacts.push('Location')
  if (!inquiry.confirmed_occasion) missingFacts.push('Occasion')
  if (!inquiry.confirmed_budget_cents) missingFacts.push('Budget')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">{name}</h1>
            <InquiryStatusBadge status={inquiry.status as any} />
            <InquiryChannelBadge channel={inquiry.channel} />
          </div>
          {inquiry.confirmed_occasion && (
            <p className="text-stone-600 mt-1">{inquiry.confirmed_occasion}</p>
          )}
          <p className="text-sm text-stone-400 mt-1">
            First contact {formatDistanceToNow(new Date(inquiry.first_contact_at), { addSuffix: true })}
          </p>
        </div>
        <Link href="/inquiries">
          <Button variant="ghost">Back to Pipeline</Button>
        </Link>
      </div>

      {/* Missing Facts Warning */}
      {missingFacts.length > 0 && inquiry.status !== 'declined' && inquiry.status !== 'expired' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-800">Missing confirmed facts:</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            {missingFacts.map(fact => (
              <Badge key={fact} variant="warning">{fact}</Badge>
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-2">
            These need to be confirmed before converting to an event.
          </p>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Contact</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-stone-500">Name</dt>
              <dd className="text-sm text-stone-900 mt-1">{name}</dd>
            </div>
            {email && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Email</dt>
                <dd className="text-sm text-stone-900 mt-1">
                  <a href={`mailto:${email}`} className="text-brand-600 hover:underline">{email}</a>
                </dd>
              </div>
            )}
            {phone && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Phone</dt>
                <dd className="text-sm text-stone-900 mt-1">
                  <a href={`tel:${phone}`} className="text-brand-600 hover:underline">{phone}</a>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-stone-500">Linked Client</dt>
              <dd className="text-sm mt-1">
                {inquiry.client ? (
                  <Link href={`/clients/${inquiry.client.id}`} className="text-brand-600 hover:underline">
                    {inquiry.client.full_name}
                  </Link>
                ) : (
                  <span className="text-stone-400">Not linked to a client record</span>
                )}
              </dd>
            </div>
            {referralSource && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Referral Source</dt>
                <dd className="text-sm text-stone-900 mt-1">{referralSource}</dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Confirmed Facts */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Confirmed Facts</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-stone-500">Event Date</dt>
              <dd className="text-sm mt-1">
                {inquiry.confirmed_date
                  ? <span className="text-stone-900">{format(new Date(inquiry.confirmed_date), 'EEEE, MMMM d, yyyy')}</span>
                  : <span className="text-stone-400 italic">Not confirmed</span>}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Guest Count</dt>
              <dd className="text-sm mt-1">
                {inquiry.confirmed_guest_count
                  ? <span className="text-stone-900">{inquiry.confirmed_guest_count} guests</span>
                  : <span className="text-stone-400 italic">Not confirmed</span>}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Location</dt>
              <dd className="text-sm mt-1">
                {inquiry.confirmed_location
                  ? <span className="text-stone-900">{inquiry.confirmed_location}</span>
                  : <span className="text-stone-400 italic">Not confirmed</span>}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Budget</dt>
              <dd className="text-sm mt-1">
                {inquiry.confirmed_budget_cents
                  ? <span className="text-stone-900">{formatCurrency(inquiry.confirmed_budget_cents)}</span>
                  : <span className="text-stone-400 italic">Not confirmed</span>}
              </dd>
            </div>
            {inquiry.confirmed_dietary_restrictions && inquiry.confirmed_dietary_restrictions.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Dietary Restrictions</dt>
                <dd className="text-sm text-stone-900 mt-1">
                  {inquiry.confirmed_dietary_restrictions.join(', ')}
                </dd>
              </div>
            )}
            {inquiry.confirmed_service_expectations && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Service Expectations</dt>
                <dd className="text-sm text-stone-900 mt-1">{inquiry.confirmed_service_expectations}</dd>
              </div>
            )}
            {inquiry.confirmed_cannabis_preference && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Cannabis Preference</dt>
                <dd className="text-sm text-stone-900 mt-1">{inquiry.confirmed_cannabis_preference}</dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      {/* Pipeline Management */}
      {(inquiry.next_action_required || inquiry.follow_up_due_at) && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Pipeline</h2>
          <dl className="space-y-3">
            {inquiry.next_action_required && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Next Action</dt>
                <dd className="text-sm text-stone-900 mt-1">{inquiry.next_action_required}</dd>
              </div>
            )}
            {inquiry.next_action_by && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Action By</dt>
                <dd className="text-sm text-stone-900 mt-1">{inquiry.next_action_by}</dd>
              </div>
            )}
            {inquiry.follow_up_due_at && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Follow-up Due</dt>
                <dd className="text-sm text-stone-900 mt-1">
                  {format(new Date(inquiry.follow_up_due_at), 'MMM d, yyyy')}
                  {' '}
                  <span className="text-stone-400">
                    ({formatDistanceToNow(new Date(inquiry.follow_up_due_at), { addSuffix: true })})
                  </span>
                </dd>
              </div>
            )}
          </dl>
        </Card>
      )}

      {/* Quotes Section */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Quotes</h2>
          <Link href={`/quotes/new?inquiry_id=${inquiry.id}${inquiry.client_id ? `&client_id=${inquiry.client_id}` : ''}`}>
            <Button size="sm">+ Create Quote</Button>
          </Link>
        </div>
        {quotes.length === 0 ? (
          <p className="text-stone-500 text-sm">No quotes created for this inquiry yet.</p>
        ) : (
          <div className="space-y-2">
            {quotes.map((quote) => (
              <Link
                key={quote.id}
                href={`/quotes/${quote.id}`}
                className="block border rounded-lg p-3 hover:bg-stone-50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-stone-900 text-sm">
                      {quote.quote_name || formatCurrency(quote.total_quoted_cents)}
                    </span>
                    <QuoteStatusBadge status={quote.status as any} />
                    {quote.pricing_model && (
                      <PricingModelBadge model={quote.pricing_model as any} />
                    )}
                  </div>
                  <span className="text-sm font-semibold text-stone-900">
                    {formatCurrency(quote.total_quoted_cents)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* AI Response Composer */}
      {inquiry.status !== 'declined' && inquiry.status !== 'expired' && (
        <InquiryResponseComposer
          inquiryId={inquiry.id}
          clientId={inquiry.client_id}
          clientEmail={email}
          gmailConnected={gmailStatus.connected}
        />
      )}

      {/* Communication Log */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Communication</h2>
        <MessageThread messages={messages} />
        <div className="mt-4 pt-4 border-t border-stone-200">
          <MessageLogForm
            inquiryId={inquiry.id}
            clientId={inquiry.client_id ?? undefined}
            templates={templates}
          />
        </div>
      </Card>

      {/* Actions (Transitions) */}
      <InquiryTransitions inquiry={inquiry} />

      {/* Notes */}
      {notes && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Internal Notes</h2>
          <p className="text-sm text-stone-700 whitespace-pre-wrap">{notes}</p>
        </Card>
      )}

      {/* Source Message */}
      {inquiry.source_message && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Original Message</h2>
          <div className="bg-stone-50 rounded-lg p-4">
            <p className="text-sm text-stone-700 whitespace-pre-wrap font-mono">
              {inquiry.source_message}
            </p>
          </div>
        </Card>
      )}

      {/* Status History */}
      {inquiry.transitions.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Status History</h2>
          <div className="space-y-3">
            {inquiry.transitions.map((transition) => (
              <div key={transition.id} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-brand-500" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {transition.from_status && (
                      <>
                        <span className="text-sm font-medium text-stone-900 capitalize">
                          {(transition.from_status as string).replace('_', ' ')}
                        </span>
                        <span className="text-stone-400">&rarr;</span>
                      </>
                    )}
                    <span className="text-sm font-medium text-stone-900 capitalize">
                      {(transition.to_status as string).replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    {format(new Date(transition.transitioned_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                  {transition.reason && (
                    <p className="text-sm text-stone-600 mt-1">
                      Reason: {transition.reason}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Metadata */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-3 text-stone-500">Metadata</h2>
        <dl className="grid grid-cols-2 gap-3 text-xs text-stone-400">
          <div>
            <dt className="font-medium">Created</dt>
            <dd>{format(new Date(inquiry.created_at), "MMM d, yyyy 'at' h:mm a")}</dd>
          </div>
          <div>
            <dt className="font-medium">Last Updated</dt>
            <dd>{format(new Date(inquiry.updated_at), "MMM d, yyyy 'at' h:mm a")}</dd>
          </div>
          {inquiry.last_response_at && (
            <div>
              <dt className="font-medium">Last Response</dt>
              <dd>{format(new Date(inquiry.last_response_at), "MMM d, yyyy 'at' h:mm a")}</dd>
            </div>
          )}
          <div>
            <dt className="font-medium">Inquiry ID</dt>
            <dd className="font-mono">{inquiry.id.slice(0, 8)}...</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
