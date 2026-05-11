// Small badge showing load score and level for integration into other views

import type { LoadLevel } from '@/lib/intelligence/operational-load'

const LEVEL_STYLES: Record<LoadLevel, string> = {
  empty: 'bg-stone-800 text-stone-500',
  light: 'bg-emerald-950/50 text-emerald-400 border-emerald-800/40',
  moderate: 'bg-yellow-950/50 text-yellow-400 border-yellow-800/40',
  heavy: 'bg-orange-950/50 text-orange-400 border-orange-800/40',
  overloaded: 'bg-red-950/50 text-red-400 border-red-800/40',
}

export function LoadScoreBadge({
  score,
  level,
  compact = false,
}: {
  score: number
  level: LoadLevel
  compact?: boolean
}) {
  if (score === 0 && compact) return null

  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-medium ${
        compact ? 'text-[10px]' : 'text-xs'
      } ${LEVEL_STYLES[level]}`}
    >
      {score}
    </span>
  )
}
