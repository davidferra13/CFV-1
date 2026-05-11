'use client'

import type { TimelineEntry } from '@/lib/intelligence/event-replay'
import {
  Calendar, ArrowRight, CurrencyDollar, UtensilsCrossed, Check,
  Play, CheckCircle, Envelope, ClipboardText, ChatCircle, Note,
} from '@/components/ui/icons'

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Calendar,
  ArrowRight,
  CurrencyDollar,
  UtensilsCrossed,
  Check,
  Play,
  CheckCircle,
  Envelope,
  ClipboardText,
  ChatCircle,
  Note,
}

const TYPE_COLORS: Record<string, string> = {
  booking: 'border-brand-700/50 bg-brand-950/20',
  menu_created: 'border-violet-700/50 bg-violet-950/20',
  menu_approved: 'border-emerald-700/50 bg-emerald-950/20',
  quote_sent: 'border-amber-700/50 bg-amber-950/20',
  payment_received: 'border-emerald-700/50 bg-emerald-950/20',
  prep_started: 'border-amber-700/50 bg-amber-950/20',
  service_started: 'border-brand-700/50 bg-brand-950/20',
  service_completed: 'border-emerald-700/50 bg-emerald-950/20',
  follow_up: 'border-violet-700/50 bg-violet-950/20',
  aar_filed: 'border-brand-700/50 bg-brand-950/20',
  status_change: 'border-stone-700/50 bg-stone-900/20',
  communication: 'border-stone-700/50 bg-stone-900/20',
  note: 'border-stone-700/50 bg-stone-900/20',
}

const DOT_COLORS: Record<string, string> = {
  booking: 'bg-brand-500',
  menu_created: 'bg-violet-500',
  menu_approved: 'bg-emerald-500',
  payment_received: 'bg-emerald-500',
  service_started: 'bg-brand-500',
  service_completed: 'bg-emerald-500',
  follow_up: 'bg-violet-500',
  aar_filed: 'bg-brand-500',
  status_change: 'bg-stone-500',
}

export function ReplayTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-stone-500">
        No timeline data available for this event.
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-stone-800" />

      <div className="space-y-4">
        {entries.map((entry, i) => {
          const IconComponent = ICON_MAP[entry.icon] || Note
          const colorClass = TYPE_COLORS[entry.type] || TYPE_COLORS.note
          const dotColor = DOT_COLORS[entry.type] || 'bg-stone-600'

          return (
            <div key={`${entry.type}-${i}`} className="relative pl-10">
              {/* Timeline dot */}
              <div className={`absolute left-2.5 top-3 w-3 h-3 rounded-full ${dotColor} ring-2 ring-stone-950`} />

              <div className={`rounded-xl border ${colorClass} p-3.5`}>
                <div className="flex items-start gap-3">
                  <IconComponent className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-medium text-stone-200">{entry.title}</h4>
                      <time className="text-xs text-stone-600 shrink-0 tabular-nums">
                        {formatTimestamp(entry.timestamp)}
                      </time>
                    </div>
                    {entry.detail && (
                      <p className="text-xs text-stone-500 mt-0.5">{entry.detail}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ts
  }
}
