'use client'

import { CheckCircle } from '@/components/ui/icons'

export function PackProgress({
  checked,
  total,
}: {
  checked: number
  total: number
}) {
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0
  const allDone = checked === total && total > 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-stone-300">
          {checked} of {total} items packed
        </span>
        {allDone && (
          <span className="inline-flex items-center gap-1 text-sm font-bold text-green-400">
            <CheckCircle className="h-4 w-4" weight="fill" />
            All Packed!
          </span>
        )}
      </div>
      <div className="h-3 bg-stone-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            allDone ? 'bg-green-500' : 'bg-amber-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
