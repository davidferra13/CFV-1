'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from '@/components/ui/icons'
import { StateChangePulse, StateMotionListItem } from '@/components/ui/state-motion'
import type { DecisionQueueResult, DecisionQueueItem } from '@/lib/decision-queue/actions'
import { WidgetCardShell } from './widget-cards/widget-card-shell'

interface DecisionQueueWidgetProps {
  data: DecisionQueueResult
}

const URGENCY_DOT: Record<DecisionQueueItem['urgency'], string> = {
  critical: 'bg-red-400',
  high: 'bg-amber-400',
  normal: 'bg-blue-400',
  low: 'bg-stone-500',
}

const COLLAPSED_LIMIT = 7

export function DecisionQueueWidget({ data }: DecisionQueueWidgetProps) {
  const [expanded, setExpanded] = useState(false)
  const hasOverflow = data.items.length > COLLAPSED_LIMIT
  const visibleItems = expanded ? data.items : data.items.slice(0, COLLAPSED_LIMIT)

  return (
    <WidgetCardShell widgetId="decision_queue" title="Decide Now" size="md" className="relative">
      {data.criticalCount > 0 && (
        <StateChangePulse
          watch={data.criticalCount}
          className="pointer-events-none absolute right-4 top-3.5"
        >
          <span className="inline-flex items-center rounded-full border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-300">
            {data.criticalCount} critical
          </span>
        </StateChangePulse>
      )}

      {data.items.length === 0 ? (
        <p className="py-3 text-sm text-stone-500">
          All clear. Nothing needs a decision right now.
        </p>
      ) : (
        <>
          <div className="space-y-1">
            {visibleItems.map((item, index) => (
              <StateMotionListItem key={item.id} index={index}>
                <div className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-white/[0.07]">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${URGENCY_DOT[item.urgency]}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-stone-200 transition-colors group-hover:text-stone-100">
                      {item.title}
                    </p>
                    <p className="truncate text-xs text-stone-500">{item.context}</p>
                  </div>
                  {item.href && (
                    <Link
                      href={item.href}
                      aria-label={`Open ${item.title}`}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-white/10 hover:text-stone-200"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </StateMotionListItem>
            ))}
          </div>

          {hasOverflow && (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="mt-2 text-xs font-medium text-stone-500 transition-colors hover:text-stone-300"
            >
              {expanded ? 'Show less' : `Show all (${data.totalCount})`}
            </button>
          )}
        </>
      )}
    </WidgetCardShell>
  )
}
