'use client'

// Compact Loyalty Card
// Shows tier badge, points balance, and progress bar to next tier.

import { Trophy } from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'

const TIER_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  bronze: { bg: 'bg-amber-900/30', text: 'text-amber-400', ring: 'ring-amber-700' },
  silver: { bg: 'bg-stone-700/30', text: 'text-stone-300', ring: 'ring-stone-600' },
  gold: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', ring: 'ring-yellow-700' },
  platinum: { bg: 'bg-indigo-900/30', text: 'text-indigo-300', ring: 'ring-indigo-600' },
}

const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
}

type LoyaltyCardProps = {
  tier: string
  points: number
  nextTier: string | null
  nextTierThreshold: number | null
  progressPercent: number
  compact?: boolean
}

export function LoyaltyCard({
  tier,
  points,
  nextTier,
  nextTierThreshold,
  progressPercent,
  compact = false,
}: LoyaltyCardProps) {
  const colors = TIER_COLORS[tier] || TIER_COLORS.bronze

  return (
    <div
      className={`rounded-xl border border-stone-700 ${colors.bg} ring-1 ${colors.ring} ${
        compact ? 'p-3' : 'p-5'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} ${colors.text}`} />
          <Badge variant="default">
            <span className={colors.text}>{TIER_LABELS[tier] || tier}</span>
          </Badge>
        </div>
        <div className="text-right">
          <p className={`font-bold ${colors.text} ${compact ? 'text-lg' : 'text-2xl'}`}>
            {points.toLocaleString()}
          </p>
          <p className="text-xs text-stone-500">points</p>
        </div>
      </div>

      {nextTier && nextTierThreshold && (
        <div>
          <div className="flex justify-between text-xs text-stone-500 mb-1">
            <span>Progress to {TIER_LABELS[nextTier] || nextTier}</span>
            <span>
              {points} / {nextTierThreshold}
            </span>
          </div>
          <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {!nextTier && (
        <p className="text-xs text-stone-500 text-center">Top tier reached. Enjoy all the perks.</p>
      )}
    </div>
  )
}
