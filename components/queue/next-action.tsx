// Next Action - Hero card for the single most important queue item
// Server component. Prominent visual treatment to draw the chef's eye.

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight } from '@/components/ui/icons'
import { formatCurrency } from '@/lib/utils/currency'
import { QueueIcon } from './queue-icon'
import type { QueueItem, QueueUrgency } from '@/lib/queue/types'

const URGENCY_BG: Record<QueueUrgency, string> = {
  critical: 'bg-red-950 border-red-200',
  high: 'bg-amber-950 border-amber-200',
  normal: 'bg-brand-950 border-brand-700',
  low: 'bg-stone-800 border-stone-700',
}

const URGENCY_ICON_COLOR: Record<QueueUrgency, string> = {
  critical: 'text-red-600',
  high: 'text-amber-600',
  normal: 'text-brand-600',
  low: 'text-stone-500',
}

const URGENCY_LABEL: Record<QueueUrgency, string> = {
  critical: 'Needs immediate attention',
  high: 'High priority',
  normal: 'Next up',
  low: 'When you have a moment',
}

interface Props {
  item: QueueItem
}

export function NextActionCard({ item }: Props) {
  const timeDisplay = item.dueAt
    ? formatDistanceToNow(new Date(item.dueAt), { addSuffix: true })
    : null

  return (
    <Link href={item.href} className="block group">
      <div
        className={`rounded-xl border-2 p-6 transition-all group-hover:shadow-md ${URGENCY_BG[item.urgency]}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className={`mt-1 shrink-0 ${URGENCY_ICON_COLOR[item.urgency]}`}>
              <QueueIcon name={item.icon} className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500 mb-1">
                {URGENCY_LABEL[item.urgency]}
              </p>
              <h3 className="text-lg font-semibold text-stone-100">
                {item.title}
                {item.estimatedMinutes && (
                  <span className="text-sm font-normal text-stone-500 ml-2">
                    (~{item.estimatedMinutes} min)
                  </span>
                )}
              </h3>
              <p className="text-sm text-stone-400 mt-1">{item.description}</p>
              {item.contextLine && (
                <p className="text-xs text-stone-500 mt-1.5 italic">{item.contextLine}</p>
              )}
              {item.blocks && <p className="text-xs text-red-600 mt-2">Blocks: {item.blocks}</p>}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-medium text-stone-100">{item.context.primaryLabel}</p>
            {item.context.secondaryLabel && (
              <p className="text-sm text-stone-500">{item.context.secondaryLabel}</p>
            )}
            {item.context.amountCents != null && item.context.amountCents > 0 && (
              <p className="text-lg font-bold text-stone-100 mt-1">
                {formatCurrency(item.context.amountCents)}
              </p>
            )}
            {timeDisplay && <p className="text-xs text-stone-400 mt-1">{timeDisplay}</p>}
            <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 group-hover:text-brand-400">
              Take action{' '}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
