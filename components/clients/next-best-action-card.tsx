// Next Best Action Card - shows the single recommended action for a client
// Displayed on the client detail page under the header.

import Link from 'next/link'
import { ArrowRight } from '@/components/ui/icons'
import { ClientActionIcon } from '@/components/clients/client-action-icon'
import type { NextBestAction } from '@/lib/clients/next-best-action'

const URGENCY_STYLES: Record<NextBestAction['urgency'], string> = {
  critical: 'border-red-200 bg-red-950',
  high: 'border-amber-200 bg-amber-950',
  normal: 'border-brand-700 bg-brand-50/40',
  low: 'border-stone-200 bg-stone-50',
}

const URGENCY_ICON_COLOR: Record<NextBestAction['urgency'], string> = {
  critical: 'text-red-500',
  high: 'text-amber-500',
  normal: 'text-brand-500',
  low: 'text-stone-400',
}

interface Props {
  action: NextBestAction
}

export function NextBestActionCard({ action }: Props) {
  const containerClass = URGENCY_STYLES[action.urgency]
  const iconClass = URGENCY_ICON_COLOR[action.urgency]
  const explanation = action.reasons.slice(0, 2).map((reason) => reason.message)

  return (
    <Link
      href={action.href}
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-opacity hover:opacity-80 ${containerClass}`}
    >
      <ClientActionIcon
        actionType={action.actionType}
        className={`h-4 w-4 shrink-0 ${iconClass}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-stone-900">{action.label}</p>
        <p className="text-xs text-stone-500 mt-0.5">{action.description}</p>
        {action.interventionLabel ? (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-600">
            {action.interventionLabel}
          </p>
        ) : null}
        {explanation.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {explanation.map((message) => (
              <span
                key={message}
                className="rounded-full border border-stone-300 px-2 py-0.5 text-[11px] text-stone-600"
              >
                {message}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <ArrowRight className="h-4 w-4 text-stone-400 shrink-0" />
    </Link>
  )
}
