// Queue Item Row - Single row in the priority queue list
// Now a client component to support inline action expansion

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { QueueIcon } from './queue-icon'
import { QueueItemInlineAction } from './queue-item-inline-action'
import type { QueueItem, QueueUrgency, QueueDomain, InlineActionType } from '@/lib/queue/types'

const URGENCY_STYLES: Record<QueueUrgency, string> = {
  critical: 'border-l-4 border-l-red-500 bg-red-950/50',
  high: 'border-l-4 border-l-amber-500 bg-amber-950/30',
  normal: 'border-l-4 border-l-brand-400',
  low: 'border-l-4 border-l-stone-300',
}

const URGENCY_BADGE: Record<
  QueueUrgency,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  critical: { label: 'Critical', variant: 'error' },
  high: { label: 'High', variant: 'warning' },
  normal: { label: 'Normal', variant: 'success' },
  low: { label: 'Low', variant: 'info' },
}

const DOMAIN_LABELS: Record<QueueDomain, string> = {
  inquiry: 'Inquiry',
  message: 'Message',
  quote: 'Quote',
  event: 'Event',
  financial: 'Financial',
  post_event: 'Post-Event',
  client: 'Client',
  culinary: 'Culinary',
}

const INLINE_ACTION_LABELS: Record<InlineActionType, string> = {
  respond_inquiry: 'Respond',
  send_followup: 'Follow Up',
  record_payment: 'Record Payment',
  send_message: 'Send Message',
  log_expense: 'Log Expense',
}

interface Props {
  item: QueueItem
}

export function QueueItemRow({ item }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [completed, setCompleted] = useState(false)
  const badge = URGENCY_BADGE[item.urgency]
  const timeDisplay = item.dueAt
    ? formatDistanceToNow(new Date(item.dueAt), { addSuffix: true })
    : null

  if (completed) return null

  const hasInlineAction = !!item.inlineAction

  return (
    <div className={`rounded-lg p-4 transition-all ${URGENCY_STYLES[item.urgency]}`}>
      <Link
        href={item.href}
        className="block hover:opacity-90"
        onClick={(e) => {
          if (expanded) e.preventDefault()
        }}
      >
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-0.5 shrink-0">
              <QueueIcon name={item.icon} className="h-4 w-4 text-stone-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-stone-100 text-sm">{item.title}</span>
                <Badge variant={badge.variant}>{badge.label}</Badge>
                <span className="text-xs text-stone-400">{DOMAIN_LABELS[item.domain]}</span>
              </div>
              <p className="text-sm text-stone-400 mt-1">{item.description}</p>
              {item.blocks && <p className="text-xs text-red-600 mt-1">Blocks: {item.blocks}</p>}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-medium text-stone-100 truncate max-w-[160px]">
              {item.context.primaryLabel}
            </p>
            {item.context.secondaryLabel && (
              <p className="text-xs text-stone-500">{item.context.secondaryLabel}</p>
            )}
            {item.context.amountCents != null && item.context.amountCents > 0 && (
              <p className="text-sm font-semibold text-stone-100 mt-0.5">
                {formatCurrency(item.context.amountCents)}
              </p>
            )}
            {timeDisplay && <p className="text-xs text-stone-400 mt-1">{timeDisplay}</p>}
          </div>
        </div>
      </Link>

      {/* Quick Action button */}
      {hasInlineAction && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 text-xs text-brand-500 hover:text-brand-400 font-medium"
        >
          {INLINE_ACTION_LABELS[item.inlineAction!.type]}
        </button>
      )}

      {/* Inline action panel */}
      {expanded && item.inlineAction && (
        <QueueItemInlineAction
          action={item.inlineAction}
          onComplete={() => setCompleted(true)}
          onCancel={() => setExpanded(false)}
        />
      )}
    </div>
  )
}
