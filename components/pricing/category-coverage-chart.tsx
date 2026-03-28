'use client'

import type { CategoryCoverage } from '@/lib/openclaw/catalog-actions'

interface CategoryCoverageChartProps {
  data: CategoryCoverage[]
  onCategoryClick?: (category: string) => void
}

export function CategoryCoverageChart({ data, onCategoryClick }: CategoryCoverageChartProps) {
  // Sort by coverage ascending (worst gaps at top)
  const sorted = [...data].sort((a, b) => a.coveragePct - b.coveragePct)

  return (
    <div className="space-y-2 mt-3">
      {sorted.map((cat) => {
        const color =
          cat.coveragePct >= 75
            ? 'bg-emerald-600'
            : cat.coveragePct >= 25
              ? 'bg-amber-600'
              : 'bg-red-600'

        return (
          <button
            key={cat.category}
            onClick={() => onCategoryClick?.(cat.category)}
            className="w-full flex items-center gap-3 group hover:bg-stone-800/50 rounded px-2 py-1 transition-colors"
          >
            <span className="text-xs text-stone-300 w-28 text-left truncate capitalize group-hover:text-stone-100">
              {cat.category}
            </span>
            <div className="flex-1 h-5 bg-stone-800 rounded overflow-hidden">
              <div
                className={`h-full rounded transition-all ${color}`}
                style={{ width: `${Math.max(cat.coveragePct, 2)}%` }}
              />
            </div>
            <span className="text-xs text-stone-400 w-24 text-right flex-shrink-0">
              {cat.priced}/{cat.total} ({cat.coveragePct}%)
            </span>
          </button>
        )
      })}
    </div>
  )
}
