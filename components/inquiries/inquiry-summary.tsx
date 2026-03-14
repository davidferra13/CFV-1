// Inquiry Summary — shared visual snapshot component
// Used by both the chef detail page (variant="chef") and the client portal (variant="client").
// Pure presentational — no data fetching, no side effects.

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { FormattedCommunicationContent } from '@/components/communication/message-content'
import {
  InquiryStatusBadge,
  InquiryChannelBadge,
  type InquiryStatus,
} from '@/components/inquiries/inquiry-status-badge'
import { QuoteStatusBadge, type QuoteStatus } from '@/components/quotes/quote-status-badge'
import { formatCurrency } from '@/lib/utils/currency'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Calendar,
  Users,
  MapPin,
  DollarSign,
  ChevronRight,
  Utensils,
  MessageSquare,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────

export type InquirySummaryTransition = {
  id: string
  from_status: string | null
  to_status: string
  transitioned_at: string
  reason: string | null
}

export type InquirySummaryQuote = {
  id: string
  quote_name: string | null
  total_quoted_cents: number
  status: string
  pricing_model: string | null
}

export type InquirySummaryData = {
  id: string
  status: InquiryStatus
  channel: string | null // pass null to suppress (client variant)
  confirmed_occasion: string | null
  confirmed_date: string | null
  confirmed_guest_count: number | null
  confirmed_location: string | null
  confirmed_budget_cents: number | null // pass null to suppress (client variant)
  confirmed_dietary_restrictions: string[] | null
  confirmed_service_expectations: string | null
  source_message: string | null
  first_contact_at: string
  last_response_at: string | null
  updated_at: string
  transitions: InquirySummaryTransition[]
  quotes: InquirySummaryQuote[]
  converted_to_event_id: string | null
}

type Props = {
  data: InquirySummaryData
  variant: 'chef' | 'client'
}

// ─── Pipeline Steps ─────────────────────────────────────────────────────────

const CHEF_STEPS: { status: InquiryStatus; label: string }[] = [
  { status: 'new', label: 'Received' },
  { status: 'awaiting_client', label: 'Responded' },
  { status: 'awaiting_chef', label: 'Awaiting Reply' },
  { status: 'quoted', label: 'Quoted' },
  { status: 'confirmed', label: 'Confirmed' },
]

const CLIENT_STEPS: { status: InquiryStatus; label: string }[] = [
  { status: 'new', label: 'Received' },
  { status: 'awaiting_client', label: 'In Review' },
  { status: 'quoted', label: 'Quoted' },
  { status: 'confirmed', label: 'Confirmed' },
]

// Status order for computing pipeline progress
const STATUS_ORDER: InquiryStatus[] = [
  'new',
  'awaiting_client',
  'awaiting_chef',
  'quoted',
  'confirmed',
]

function getStatusIndex(s: InquiryStatus): number {
  return STATUS_ORDER.indexOf(s)
}

function isTerminal(s: InquiryStatus): boolean {
  return s === 'declined' || s === 'expired'
}

function isStepReached(stepStatus: InquiryStatus, currentStatus: InquiryStatus): boolean {
  if (isTerminal(currentStatus)) return false
  return getStatusIndex(currentStatus) >= getStatusIndex(stepStatus)
}

// ─── Small helpers ───────────────────────────────────────────────────────────

function FactItem({
  label,
  value,
  icon,
  empty,
}: {
  label: string
  value: string
  icon: ReactNode
  empty?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-stone-300">
        <span className="shrink-0">{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p
        className={`text-sm font-medium leading-snug ${
          empty ? 'text-stone-300 italic' : 'text-stone-100'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function InquirySummary({ data, variant }: Props) {
  const terminal = isTerminal(data.status)
  const steps = variant === 'chef' ? CHEF_STEPS : CLIENT_STEPS
  const hasPreferences =
    (data.confirmed_dietary_restrictions && data.confirmed_dietary_restrictions.length > 0) ||
    !!data.confirmed_service_expectations

  // Stepper: if the actual status is an internal step not shown in this view's steps
  // (e.g. 'awaiting_chef' in the simplified client pipeline), highlight the last
  // reached step as the current one so the indicator is never blank.
  const statusInSteps = steps.some((s) => s.status === data.status)
  const lastReachedIdx = steps.reduce(
    (acc, s, idx) => (isStepReached(s.status, data.status) ? idx : acc),
    -1
  )

  return (
    <div className="space-y-4">
      {/* ── Hero card ────────────────────────────────────────────── */}
      <Card className="overflow-hidden border-stone-700">
        {/* Subtle gradient top strip */}
        <div className="h-1 w-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600" />
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-stone-100 leading-tight">
                {data.confirmed_occasion || 'Catering Inquiry'}
              </h2>
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <InquiryStatusBadge status={data.status} />
                {variant === 'chef' && data.channel && (
                  <InquiryChannelBadge channel={data.channel} />
                )}
                {data.converted_to_event_id && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-700 border border-emerald-200">
                    Booked
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-stone-300 flex-wrap">
                <span>
                  Received{' '}
                  {formatDistanceToNow(new Date(data.first_contact_at), { addSuffix: true })}
                </span>
                {data.last_response_at && (
                  <>
                    <span aria-hidden>·</span>
                    <span>
                      Last response{' '}
                      {formatDistanceToNow(new Date(data.last_response_at), { addSuffix: true })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Key facts grid ───────────────────────────────────────── */}
      <Card className="p-6">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-300 mb-5">
          Event Details
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <FactItem
            label="Date"
            value={
              data.confirmed_date ? format(new Date(data.confirmed_date), 'MMM d, yyyy') : 'TBD'
            }
            icon={<Calendar className="w-3.5 h-3.5" />}
            empty={!data.confirmed_date}
          />
          <FactItem
            label="Guests"
            value={data.confirmed_guest_count ? `${data.confirmed_guest_count} guests` : 'TBD'}
            icon={<Users className="w-3.5 h-3.5" />}
            empty={!data.confirmed_guest_count}
          />
          <FactItem
            label="Location"
            value={data.confirmed_location || 'TBD'}
            icon={<MapPin className="w-3.5 h-3.5" />}
            empty={!data.confirmed_location}
          />
          {variant === 'chef' && (
            <FactItem
              label="Budget"
              value={
                data.confirmed_budget_cents ? formatCurrency(data.confirmed_budget_cents) : 'TBD'
              }
              icon={<DollarSign className="w-3.5 h-3.5" />}
              empty={!data.confirmed_budget_cents}
            />
          )}
        </div>
      </Card>

      {/* ── Progress / status timeline ───────────────────────────── */}
      <Card className="p-6">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-300 mb-5">
          {terminal ? 'Status History' : 'Progress'}
        </p>

        {terminal ? (
          // Declined / expired — vertical list of actual transitions
          <div className="space-y-3">
            {data.transitions.length === 0 ? (
              <p className="text-sm text-stone-300">No status history available.</p>
            ) : (
              data.transitions.map((t, i) => (
                <div key={t.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-stone-300 mt-0.5" />
                    {i < data.transitions.length - 1 && (
                      <div className="w-px flex-1 bg-stone-700 mt-1 min-h-[16px]" />
                    )}
                  </div>
                  <div className="pb-1">
                    <p className="text-sm font-medium text-stone-200 capitalize">
                      {t.to_status.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-stone-300 mt-0.5">
                      {format(new Date(t.transitioned_at), 'MMM d, yyyy')}
                    </p>
                    {t.reason && <p className="text-xs text-stone-500 mt-0.5">{t.reason}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // Normal pipeline — horizontal step indicator
          <div className="flex items-start">
            {steps.map((step, i) => {
              const reached = isStepReached(step.status, data.status)
              const isCurrent = statusInSteps ? data.status === step.status : i === lastReachedIdx
              const isLast = i === steps.length - 1
              const lineAfterFilled =
                !isLast && getStatusIndex(data.status) > getStatusIndex(step.status)

              return (
                <div key={step.status} className="flex items-start flex-1 min-w-0">
                  <div className="flex flex-col items-center w-full">
                    {/* Connector + dot row */}
                    <div className="flex items-center w-full">
                      {i > 0 && (
                        <div
                          className={`flex-1 h-0.5 transition-colors ${
                            reached ? 'bg-brand-500' : 'bg-stone-700'
                          }`}
                        />
                      )}
                      <div
                        className={`w-3 h-3 rounded-full shrink-0 border-2 transition-all ${
                          isCurrent
                            ? 'bg-brand-600 border-brand-600 ring-2 ring-brand-100'
                            : reached
                              ? 'bg-brand-500 border-brand-500'
                              : 'bg-stone-900 border-stone-600'
                        }`}
                      />
                      {!isLast && (
                        <div
                          className={`flex-1 h-0.5 transition-colors ${
                            lineAfterFilled ? 'bg-brand-500' : 'bg-stone-700'
                          }`}
                        />
                      )}
                    </div>
                    {/* Label */}
                    <p
                      className={`mt-2 text-center text-[10px] leading-tight px-0.5 ${
                        isCurrent
                          ? 'text-brand-400 font-semibold'
                          : reached
                            ? 'text-stone-300 font-medium'
                            : 'text-stone-300'
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* ── Preferences ──────────────────────────────────────────── */}
      {hasPreferences && (
        <Card className="p-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-300 mb-4">
            Preferences
          </p>
          <div className="space-y-4">
            {data.confirmed_dietary_restrictions &&
              data.confirmed_dietary_restrictions.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-stone-500 mb-2">
                    <Utensils className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Dietary Restrictions</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.confirmed_dietary_restrictions.map((r) => (
                      <span
                        key={r}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950 text-amber-800 border border-amber-200"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            {data.confirmed_service_expectations && (
              <div>
                <p className="text-xs font-medium text-stone-500 mb-1">Service Expectations</p>
                <p className="text-sm text-stone-300 leading-relaxed">
                  {data.confirmed_service_expectations}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── Linked quotes ─────────────────────────────────────────── */}
      {data.quotes.length > 0 && (
        <Card className="p-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-300 mb-4">
            Quotes
          </p>
          <div className="space-y-2">
            {data.quotes.map((quote) => (
              <Link
                key={quote.id}
                href={variant === 'chef' ? `/quotes/${quote.id}` : `/my-quotes/${quote.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-stone-700 hover:bg-stone-800 hover:border-stone-600 transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-stone-100 truncate">
                    {quote.quote_name || 'Quote'}
                  </span>
                  <QuoteStatusBadge status={quote.status as QuoteStatus} />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-stone-100">
                    {formatCurrency(quote.total_quoted_cents)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-300 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* ── Original message ──────────────────────────────────────── */}
      {data.source_message && (
        <Card className="p-6">
          <div className="flex items-center gap-1.5 mb-3">
            <MessageSquare className="w-3.5 h-3.5 text-stone-300" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-300">
              Original Message
            </p>
          </div>
          <blockquote className="border-l-4 border-brand-700 pl-4 py-2 pr-2 bg-stone-800 rounded-r-lg">
            <FormattedCommunicationContent
              content={data.source_message}
              className="text-sm text-stone-300 whitespace-pre-wrap break-words leading-relaxed"
              linkClassName="underline underline-offset-2 text-brand-400 hover:text-brand-300"
              quotedContainerClassName="mt-2 rounded-md border border-stone-700/70 bg-stone-900/70"
              quotedSummaryClassName="cursor-pointer select-none px-2 py-1 text-xs text-stone-400 hover:text-stone-300"
              quotedContentClassName="px-2 pb-2 text-xs text-stone-400 whitespace-pre-wrap break-words leading-relaxed"
            />
          </blockquote>
        </Card>
      )}
    </div>
  )
}
