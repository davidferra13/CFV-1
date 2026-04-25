'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { ChefCircleSummary } from '@/lib/hub/chef-circle-actions'

interface CommandBriefingProps {
  circles: ChefCircleSummary[]
}

export function CirclesCommandBriefing({ circles }: CommandBriefingProps) {
  const briefing = useMemo(() => computeBriefing(circles), [circles])

  // Do not render if there is nothing actionable.
  if (
    briefing.urgent.length === 0 &&
    briefing.upcoming.length === 0 &&
    briefing.goingCold.length === 0
  ) {
    return null
  }

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-200">Command Briefing</h2>
        <div className="flex items-center gap-4 text-xs text-stone-400">
          {briefing.totalUnread > 0 && (
            <span>
              <span className="font-bold text-brand-400">{briefing.totalUnread}</span> unread
            </span>
          )}
          {briefing.totalValueCents > 0 && (
            <span>
              <span className="font-bold text-emerald-400">
                ${Math.round(briefing.totalValueCents / 100).toLocaleString()}
              </span>{' '}
              in pipeline
            </span>
          )}
          <span>
            <span className="font-bold text-stone-300">{briefing.activeCount}</span> active
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <BriefingColumn
          title="Needs Reply"
          accent="red"
          items={briefing.urgent}
          emptyText="All caught up"
        />

        <BriefingColumn
          title="This Week"
          accent="amber"
          items={briefing.upcoming}
          emptyText="No events this week"
        />

        <BriefingColumn
          title="Going Cold"
          accent="brand"
          items={briefing.goingCold}
          emptyText="Nothing going cold"
        />
      </div>
    </div>
  )
}

const accentStyles = {
  red: {
    dot: 'bg-red-400',
    title: 'text-red-300',
    border: 'border-red-500/20',
    bg: 'bg-red-500/5',
    badge: 'bg-red-500/20 text-red-300',
  },
  amber: {
    dot: 'bg-amber-400',
    title: 'text-amber-300',
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/5',
    badge: 'bg-amber-500/20 text-amber-300',
  },
  brand: {
    dot: 'bg-brand-400',
    title: 'text-brand-300',
    border: 'border-brand-500/20',
    bg: 'bg-brand-500/5',
    badge: 'bg-brand-500/20 text-brand-300',
  },
}

interface BriefingItem {
  id: string
  label: string
  sublabel: string
  emoji: string | null
}

function BriefingColumn({
  title,
  accent,
  items,
  emptyText,
}: {
  title: string
  accent: 'red' | 'amber' | 'brand'
  items: BriefingItem[]
  emptyText: string
}) {
  const styles = accentStyles[accent]

  return (
    <div className={`rounded-lg border ${styles.border} ${styles.bg} p-3`}>
      <div className="mb-2 flex items-center gap-1.5">
        <span className={`inline-block h-2 w-2 rounded-full ${styles.dot}`} />
        <span className={`text-xs font-semibold ${styles.title}`}>{title}</span>
        {items.length > 0 && (
          <span
            className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold ${styles.badge}`}
          >
            {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-stone-500">{emptyText}</p>
      ) : (
        <div className="space-y-1.5">
          {items.slice(0, 4).map((item) => (
            <Link
              key={item.id}
              href={`/circles/${item.id}`}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors hover:bg-stone-700/50"
            >
              <span className="flex-shrink-0">{item.emoji || '\u{1F4AC}'}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-stone-200">{item.label}</div>
                <div className="truncate text-stone-500">{item.sublabel}</div>
              </div>
            </Link>
          ))}
          {items.length > 4 && (
            <p className="px-2 text-[10px] text-stone-500">+{items.length - 4} more</p>
          )}
        </div>
      )}
    </div>
  )
}

interface Briefing {
  urgent: BriefingItem[]
  upcoming: BriefingItem[]
  goingCold: BriefingItem[]
  totalUnread: number
  totalValueCents: number
  activeCount: number
}

const ACTIVE_STAGES = new Set([
  'new_inquiry',
  'awaiting_client',
  'awaiting_chef',
  'quoted',
  'accepted',
  'paid',
  'confirmed',
  'in_progress',
])

function computeBriefing(circles: ChefCircleSummary[]): Briefing {
  const urgent: BriefingItem[] = []
  const upcoming: BriefingItem[] = []
  const goingCold: BriefingItem[] = []
  let totalUnread = 0
  let totalValueCents = 0

  const active = circles.filter((c) => ACTIVE_STAGES.has(c.pipeline_stage))

  for (const c of active) {
    totalUnread += c.unread_count
    totalValueCents += c.estimated_value_cents ?? 0

    const label = c.client_name || c.name

    if ((c.response_gap_hours != null && c.response_gap_hours >= 24) || c.urgency_score >= 60) {
      const reason =
        c.response_gap_hours != null && c.response_gap_hours >= 24
          ? `Waiting ${Math.round(c.response_gap_hours / 24)}d for reply`
          : c.attention_reason || 'High urgency'
      urgent.push({ id: c.id, label, sublabel: reason, emoji: c.emoji })
    }

    if (c.event_date) {
      const daysUntil = Math.ceil((new Date(c.event_date).getTime() - Date.now()) / 86400000)
      if (daysUntil >= 0 && daysUntil <= 7) {
        const when =
          daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`
        const value = c.estimated_value_cents
          ? ` ($${Math.round(c.estimated_value_cents / 100).toLocaleString()})`
          : ''
        upcoming.push({ id: c.id, label, sublabel: `${when}${value}`, emoji: c.emoji })
      }
    }

    if (['quoted', 'accepted', 'new_inquiry'].includes(c.pipeline_stage) && c.days_in_stage >= 7) {
      const stage =
        c.pipeline_stage === 'new_inquiry'
          ? 'New'
          : c.pipeline_stage === 'quoted'
            ? 'Quoted'
            : 'Accepted'
      goingCold.push({
        id: c.id,
        label,
        sublabel: `${stage} for ${c.days_in_stage}d, no movement`,
        emoji: c.emoji,
      })
    }
  }

  urgent.sort((a, b) => {
    const aCircle = circles.find((c) => c.id === a.id)
    const bCircle = circles.find((c) => c.id === b.id)
    return (bCircle?.urgency_score ?? 0) - (aCircle?.urgency_score ?? 0)
  })

  upcoming.sort((a, b) => {
    const aCircle = circles.find((c) => c.id === a.id)
    const bCircle = circles.find((c) => c.id === b.id)
    const aDate = aCircle?.event_date ? new Date(aCircle.event_date).getTime() : Infinity
    const bDate = bCircle?.event_date ? new Date(bCircle.event_date).getTime() : Infinity
    return aDate - bDate
  })

  goingCold.sort((a, b) => {
    const aCircle = circles.find((c) => c.id === a.id)
    const bCircle = circles.find((c) => c.id === b.id)
    return (bCircle?.days_in_stage ?? 0) - (aCircle?.days_in_stage ?? 0)
  })

  return {
    urgent,
    upcoming,
    goingCold,
    totalUnread,
    totalValueCents,
    activeCount: active.length,
  }
}
