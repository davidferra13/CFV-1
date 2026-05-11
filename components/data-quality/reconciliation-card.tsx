// Reconciliation Card - expandable card for a single gap category
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { GapItemRow } from './gap-item-row'
import type { GapCategory } from '@/lib/data-quality/reconciliation'

interface ReconciliationCardProps {
  category: GapCategory
}

const iconMap: Record<string, string> = {
  'events-no-expenses': 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  'invoices-no-payment': 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
  'clients-no-dietary': 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  'events-no-contract': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  'events-no-aar': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
}

export function ReconciliationCard({ category }: ReconciliationCardProps) {
  const [expanded, setExpanded] = useState(false)

  const hasItems = category.count > 0
  const iconPath = iconMap[category.key] || iconMap['events-no-expenses']

  // Color based on severity
  let countColor = 'text-stone-400'
  let countBg = 'bg-stone-800'
  if (category.count >= 5) {
    countColor = 'text-red-400'
    countBg = 'bg-red-950/50'
  } else if (category.count >= 2) {
    countColor = 'text-amber-400'
    countBg = 'bg-amber-950/50'
  } else if (category.count === 0) {
    countColor = 'text-emerald-400'
    countBg = 'bg-emerald-950/50'
  }

  return (
    <Card className={hasItems ? '' : 'opacity-60'}>
      <button
        onClick={() => hasItems && setExpanded(!expanded)}
        className={`w-full text-left p-4 ${hasItems ? 'cursor-pointer' : 'cursor-default'}`}
        disabled={!hasItems}
      >
        <div className="flex items-center gap-3">
          <svg
            className="w-5 h-5 text-stone-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconPath} />
          </svg>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-200">{category.title}</p>
            <p className="text-xs text-stone-500">{category.description}</p>
          </div>

          <span
            className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-sm font-semibold ${countColor} ${countBg}`}
          >
            {category.count}
          </span>

          {hasItems && (
            <svg
              className={`w-4 h-4 text-stone-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </button>

      {expanded && hasItems && (
        <div className="border-t border-stone-700 px-2 py-2 max-h-[320px] overflow-y-auto">
          {category.items.map((item) => (
            <GapItemRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </Card>
  )
}
