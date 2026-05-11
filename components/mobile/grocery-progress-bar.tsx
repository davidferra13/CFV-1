'use client'

interface GroceryProgressBarProps {
  total: number
  checked: number
}

export function GroceryProgressBar({ total, checked }: GroceryProgressBarProps) {
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0

  return (
    <div className="w-full px-4 py-2 bg-stone-900 border-b border-stone-700">
      <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
        <span>
          {checked} of {total} items
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-stone-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
