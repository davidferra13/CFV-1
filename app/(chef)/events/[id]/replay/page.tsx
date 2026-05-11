// Event Replay - Timeline reconstruction of a past event
// Shows the full lifecycle: booking to aftermath, with highlights and learnings.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { generateEventReplay } from '@/lib/intelligence/event-replay'
import { ReplayTimeline } from '@/components/intelligence/replay-timeline'
import { ReplayHighlightList } from '@/components/intelligence/replay-highlight'
import { ReplayFinancials } from '@/components/intelligence/replay-financials'
import {
  ArrowLeft, Calendar, Users, Star, ClipboardText, UtensilsCrossed,
} from '@/components/ui/icons'

export const metadata: Metadata = {
  title: 'Event Replay',
}

export default async function EventReplayPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireChef()
  const { id } = await params
  const replay = await generateEventReplay(id, user.tenantId!)

  if (!replay) {
    return (
      <div className="space-y-4">
        <Link
          href={`/events/${id}`}
          className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Event
        </Link>
        <div className="text-center py-16">
          <p className="text-stone-500">Event not found or no data available.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href={`/events/${id}`}
          className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Event
        </Link>

        <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold text-stone-200">
                {replay.occasion}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-stone-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(replay.eventDate)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>{replay.guestCount} guest{replay.guestCount === 1 ? '' : 's'}</span>
                </div>
                <span className="text-stone-600">|</span>
                <span>{replay.clientName}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                replay.status === 'completed'
                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                  : 'bg-stone-800 text-stone-400 border border-stone-700'
              }`}>
                {replay.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AAR Summary */}
      {replay.aarSummary && (
        <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardText className="h-5 w-5 text-stone-500" />
            <h2 className="text-sm font-medium text-stone-300 uppercase tracking-wide">
              After-Action Review
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <RatingBadge label="Calm" value={replay.aarSummary.calmRating} max={5} />
            <RatingBadge label="Preparation" value={replay.aarSummary.prepRating} max={5} />
            {replay.aarSummary.executionRating !== null && (
              <RatingBadge label="Execution" value={replay.aarSummary.executionRating} max={5} />
            )}
          </div>
        </div>
      )}

      {/* Menu Items */}
      {replay.menuItems.length > 0 && (
        <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <UtensilsCrossed className="h-5 w-5 text-stone-500" />
            <h2 className="text-sm font-medium text-stone-300 uppercase tracking-wide">
              Menu
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {replay.menuItems.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-lg border border-stone-800 bg-stone-900 px-3 py-1.5 text-xs text-stone-300"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Financials */}
      {replay.financials && <ReplayFinancials data={replay.financials} />}

      {/* Highlights and Learnings side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReplayHighlightList highlights={replay.highlights} title="Highlights" />
        <ReplayHighlightList highlights={replay.learnings} title="Learnings" />
      </div>

      {/* Timeline */}
      <div>
        <h2 className="text-xs uppercase tracking-wide text-stone-500 font-medium mb-4">
          Full Timeline
        </h2>
        <ReplayTimeline entries={replay.timeline} />
      </div>
    </div>
  )
}

function RatingBadge({ label, value, max }: { label: string; value: number; max: number }) {
  const color =
    value >= 4 ? 'text-emerald-400' : value >= 3 ? 'text-amber-400' : 'text-red-400'
  const bgColor =
    value >= 4
      ? 'bg-emerald-950/30 border-emerald-800/40'
      : value >= 3
        ? 'bg-amber-950/30 border-amber-800/40'
        : 'bg-red-950/30 border-red-800/40'

  return (
    <div className={`rounded-lg border ${bgColor} px-3 py-2 text-center`}>
      <div className="flex items-center justify-center gap-1">
        <Star className={`h-3.5 w-3.5 ${color}`} weight="fill" />
        <span className={`text-lg font-bold tabular-nums ${color}`}>{value}</span>
        <span className="text-xs text-stone-600">/{max}</span>
      </div>
      <span className="text-xs text-stone-500">{label}</span>
    </div>
  )
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(`${dateStr}T00:00:00`)
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}
