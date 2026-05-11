'use client'

import type { EventReplayHighlight } from '@/lib/intelligence/event-replay'
import { CheckCircle, WarningCircle, Lightbulb } from '@/components/ui/icons'

const HIGHLIGHT_CONFIG = {
  positive: {
    icon: CheckCircle,
    border: 'border-emerald-800/40',
    bg: 'bg-emerald-950/20',
    iconColor: 'text-emerald-400',
    titleColor: 'text-emerald-300',
  },
  negative: {
    icon: WarningCircle,
    border: 'border-red-800/40',
    bg: 'bg-red-950/20',
    iconColor: 'text-red-400',
    titleColor: 'text-red-300',
  },
  learning: {
    icon: Lightbulb,
    border: 'border-amber-800/40',
    bg: 'bg-amber-950/20',
    iconColor: 'text-amber-400',
    titleColor: 'text-amber-300',
  },
}

export function ReplayHighlightCard({ highlight }: { highlight: EventReplayHighlight }) {
  const config = HIGHLIGHT_CONFIG[highlight.type]
  const Icon = config.icon

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${config.iconColor} shrink-0 mt-0.5`} />
        <div>
          <h4 className={`text-sm font-medium ${config.titleColor}`}>
            {highlight.title}
          </h4>
          <p className="text-sm text-stone-400 mt-1">
            {highlight.detail}
          </p>
        </div>
      </div>
    </div>
  )
}

export function ReplayHighlightList({
  highlights,
  title,
}: {
  highlights: EventReplayHighlight[]
  title: string
}) {
  if (highlights.length === 0) return null

  return (
    <div>
      <h3 className="text-xs uppercase tracking-wide text-stone-500 font-medium mb-3">
        {title}
      </h3>
      <div className="space-y-3">
        {highlights.map((h, i) => (
          <ReplayHighlightCard key={`${h.type}-${i}`} highlight={h} />
        ))}
      </div>
    </div>
  )
}
