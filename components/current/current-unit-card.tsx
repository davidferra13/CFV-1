'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { CurrentUnit, CurrentCategory, CurrentUrgency } from '@/lib/current/types'

const CATEGORY_ICON: Record<CurrentCategory, string> = {
  money: '$',
  prep: '~',
  communication: '@',
  completion: '%',
  growth: '+',
  optimization: '*',
}

const URGENCY_VARIANT: Record<CurrentUrgency, 'error' | 'warning' | 'info' | 'default'> = {
  critical: 'error',
  high: 'warning',
  normal: 'info',
  low: 'default',
}

const URGENCY_BORDER: Record<CurrentUrgency, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-amber-500',
  normal: 'border-l-sky-500',
  low: 'border-l-stone-600',
}

export function CurrentUnitCard({ unit, rank }: { unit: CurrentUnit; rank: number }) {
  const primary = unit.actions[0]

  return (
    <div
      className={`border-l-2 ${URGENCY_BORDER[unit.urgency]} rounded-r-lg bg-stone-800/60 px-4 py-3 flex items-start gap-3`}
    >
      {/* Rank indicator */}
      <span className="text-xs font-mono text-stone-500 mt-0.5 w-4 shrink-0">
        {rank === 1 ? '\u2605' : '\u25CB'}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-mono text-stone-500">
            {CATEGORY_ICON[unit.category]}
          </span>
          <h4 className="text-sm font-medium text-stone-100 truncate">{unit.title}</h4>
          {unit.urgency !== 'low' && (
            <Badge variant={URGENCY_VARIANT[unit.urgency]} className="text-[10px] px-1.5 py-0">
              {unit.urgency}
            </Badge>
          )}
        </div>
        <p className="text-xs text-stone-400 line-clamp-1">{unit.description}</p>
        {unit.contextLines.length > 0 && (
          <p className="text-[10px] text-stone-500 mt-0.5">{unit.contextLines.join(' \u00B7 ')}</p>
        )}
      </div>

      {/* Primary action */}
      {primary && (
        <Link
          href={primary.href}
          className="shrink-0 text-xs font-medium text-brand-400 hover:text-brand-300 px-2 py-1 rounded hover:bg-stone-700/50 transition-colors"
        >
          {primary.label}
        </Link>
      )}
    </div>
  )
}
