'use client'

import Link from 'next/link'
import {
  ArrowRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
} from '@/components/ui/icons'
import type { NextActionResult } from '@/lib/lifecycle/next-action'

const TYPE_STYLES = {
  respond: {
    bg: 'bg-amber-900/30 border-amber-700/50',
    icon: MessageSquare,
    iconColor: 'text-amber-400',
  },
  ask: {
    bg: 'bg-blue-900/30 border-blue-700/50',
    icon: ArrowRight,
    iconColor: 'text-blue-400',
  },
  advance: {
    bg: 'bg-emerald-900/30 border-emerald-700/50',
    icon: CheckCircle2,
    iconColor: 'text-emerald-400',
  },
  wait: {
    bg: 'bg-stone-800/50 border-stone-700',
    icon: Clock,
    iconColor: 'text-stone-400',
  },
}

const SLA_BADGES = {
  overdue: { label: 'OVERDUE', className: 'bg-red-600/20 text-red-400 border-red-600/30' },
  due_soon: { label: 'Due soon', className: 'bg-amber-600/20 text-amber-400 border-amber-600/30' },
  on_track: {
    label: 'On track',
    className: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
  },
  no_sla: null,
}

function formatSlaTime(minutes: number | null): string {
  if (minutes === null) return ''
  const absMin = Math.abs(minutes)
  if (absMin < 60) return `${absMin}m`
  const hours = Math.floor(absMin / 60)
  const rem = absMin % 60
  if (hours < 24) return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

export function NextActionBanner({ data }: { data: NextActionResult }) {
  const style = TYPE_STYLES[data.primary.type]
  const Icon = style.icon
  const slaBadge = SLA_BADGES[data.slaStatus]

  return (
    <div className={`rounded-lg border p-4 ${style.bg}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${style.iconColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-stone-100">{data.primary.action}</span>
            {slaBadge && (
              <span className={`text-xs px-2 py-0.5 rounded-full border ${slaBadge.className}`}>
                {slaBadge.label}
                {data.slaMinutesRemaining !== null && (
                  <>
                    {' '}
                    ({data.slaMinutesRemaining < 0 ? '' : ''}
                    {formatSlaTime(data.slaMinutesRemaining)}{' '}
                    {data.slaMinutesRemaining < 0 ? 'ago' : 'left'})
                  </>
                )}
              </span>
            )}
          </div>
          <p className="text-sm text-stone-400 mt-0.5">{data.primary.reason}</p>
          {data.readySummary && <p className="text-xs text-stone-500 mt-1">{data.readySummary}</p>}
          {data.secondary.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {data.secondary.slice(0, 3).map((action, i) => (
                <span
                  key={i}
                  className="text-xs text-stone-400 bg-stone-800/50 px-2 py-1 rounded border border-stone-700"
                >
                  {action.actionUrl ? (
                    <Link href={action.actionUrl} className="hover:text-stone-200">
                      {action.action}
                    </Link>
                  ) : (
                    action.action
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
        {data.primary.actionUrl && (
          <Link
            href={data.primary.actionUrl}
            className="shrink-0 text-xs text-stone-400 hover:text-stone-200 flex items-center gap-1"
          >
            Go <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  )
}
