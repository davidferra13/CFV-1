// Gap Item Row - single reconciliation gap item with link to fix
'use client'

import Link from 'next/link'
import type { GapItem } from '@/lib/data-quality/reconciliation'

interface GapItemRowProps {
  item: GapItem
}

export function GapItemRow({ item }: GapItemRowProps) {
  return (
    <Link
      href={item.href}
      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-stone-700/50 transition-colors group"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm text-stone-200 truncate group-hover:text-stone-50">
          {item.label}
        </p>
        {item.sublabel && (
          <p className="text-xs text-stone-500 truncate">{item.sublabel}</p>
        )}
      </div>
      {item.date && (
        <span className="text-xs text-stone-500 ml-3 shrink-0">{item.date}</span>
      )}
      <svg
        className="w-4 h-4 text-stone-600 ml-2 shrink-0 group-hover:text-stone-400 transition-colors"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}
