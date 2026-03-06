import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  getPushDinner,
  getCampaignRecipients,
  getPushDinnerStats,
} from '@/lib/campaigns/push-dinner-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft,
  Copy,
  ExternalLink,
  Users,
  Mail,
  CheckCircle,
  Calendar,
} from '@/components/ui/icons'
import { CampaignDetailClient } from './campaign-detail-client'

type Props = { params: { id: string } }

function statusVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'draft':
      return 'default'
    case 'sending':
      return 'warning'
    case 'sent':
      return 'success'
    case 'scheduled':
      return 'info'
    case 'cancelled':
      return 'error'
    default:
      return 'default'
  }
}

export default async function PushDinnerDetailPage({ params }: Props) {
  const [campaign, stats] = await Promise.all([
    getPushDinner(params.id),
    getPushDinnerStats(params.id),
  ])

  if (!campaign) notFound()

  const recipients = await getCampaignRecipients(params.id)

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
  const bookingUrl = campaign.public_booking_token
    ? `${APP_URL}/book/campaign/${campaign.public_booking_token}`
    : null

  const dateDisplay = campaign.proposed_date
    ? format(new Date(campaign.proposed_date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')
    : null

  const priceDisplay = campaign.price_per_person_cents
    ? `$${Math.round(campaign.price_per_person_cents / 100)}/person`
    : null

  const seatPct = campaign.seats_available
    ? Math.min(100, (campaign.seats_booked / campaign.seats_available) * 100)
    : 0

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Back */}
      <Link
        href="/marketing/push-dinners"
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300"
      >
        <ChevronLeft className="w-4 h-4" />
        Push Dinners
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-stone-200">{campaign.name}</h1>
            <Badge variant={statusVariant(campaign.status)}>
              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-stone-500 flex-wrap">
            {dateDisplay && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {dateDisplay}
              </span>
            )}
            {priceDisplay && <span>{priceDisplay}</span>}
            {campaign.occasion && <span>{campaign.occasion}</span>}
          </div>
        </div>
      </div>

      {/* Seat capacity bar */}
      {campaign.seats_available && (
        <div className="bg-stone-900 border border-stone-700 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-400 font-medium">Seat capacity</span>
            <span className="text-stone-300 font-semibold">
              {campaign.seats_booked}/{campaign.seats_available} booked
            </span>
          </div>
          <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-2 bg-green-500 rounded-full transition-all"
              style={{ width: `${seatPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Invited', value: stats.total_recipients, icon: Users },
          { label: 'Approved', value: stats.drafts_approved, icon: CheckCircle },
          { label: 'Sent', value: stats.sent, icon: Mail },
          { label: 'Booked', value: stats.booked, icon: CheckCircle },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-stone-900 border border-stone-700 rounded-xl p-4 text-center"
          >
            <div className="text-2xl font-bold text-stone-200">{stat.value}</div>
            <div className="text-xs text-stone-400 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Booking link */}
      {bookingUrl && (
        <div className="bg-stone-900 border border-stone-700 rounded-xl p-4 space-y-2">
          <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">
            Shareable booking link
          </p>
          <div className="flex items-center gap-2">
            <code className="text-sm text-stone-300 bg-stone-800 border border-stone-700 rounded px-3 py-1.5 flex-1 truncate font-mono">
              {bookingUrl}
            </code>
            <CampaignDetailClient bookingUrl={bookingUrl} />
          </div>
          <p className="text-xs text-stone-400">
            Share this link anywhere — Instagram story, text, DM. Clients tap it, see the dinner,
            and book in under 30 seconds. No account required.
          </p>
        </div>
      )}

      {/* Concept description */}
      {campaign.concept_description && (
        <div className="bg-stone-900 border border-stone-700 rounded-xl p-4 space-y-1">
          <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">
            Dinner concept
          </p>
          <p className="text-sm text-stone-300 whitespace-pre-wrap">
            {campaign.concept_description}
          </p>
        </div>
      )}

      {/* Recipient list with draft status */}
      <div className="bg-stone-900 border border-stone-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-800">
          <h2 className="text-sm font-semibold text-stone-300">Recipients ({recipients.length})</h2>
        </div>
        {recipients.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-stone-400">
            No recipients yet. Go back to edit and add clients.
          </div>
        ) : (
          <div className="divide-y divide-stone-800">
            {recipients.map((r) => {
              const statusLabel = r.converted_to_inquiry_id
                ? 'Booked'
                : r.responded_at
                  ? 'Responded'
                  : r.sent_at
                    ? 'Sent'
                    : r.chef_approved
                      ? 'Approved'
                      : r.draft_body
                        ? 'Draft ready'
                        : 'No draft'
              const sv: 'success' | 'info' | 'warning' | 'default' = r.converted_to_inquiry_id
                ? 'success'
                : r.responded_at
                  ? 'info'
                  : r.sent_at
                    ? 'info'
                    : r.chef_approved
                      ? 'success'
                      : r.draft_body
                        ? 'warning'
                        : 'default'

              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-stone-300 truncate">{r.email}</div>
                    {r.draft_subject && (
                      <div className="text-xs text-stone-400 truncate mt-0.5">
                        {r.draft_subject}
                      </div>
                    )}
                  </div>
                  <Badge variant={sv}>{statusLabel}</Badge>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
