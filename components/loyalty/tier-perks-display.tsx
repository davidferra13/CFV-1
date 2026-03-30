import { Badge } from '@/components/ui/badge'

const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum'] as const
const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
}
const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-amber-900 text-amber-200',
  silver: 'bg-stone-700 text-stone-200',
  gold: 'bg-yellow-900 text-yellow-200',
  platinum: 'bg-brand-900 text-brand-200',
}

type TierPerksDisplayProps = {
  tierPerks: Record<string, string[]>
  currentTier?: string
  compact?: boolean
}

export function TierPerksDisplay({ tierPerks, currentTier, compact }: TierPerksDisplayProps) {
  const hasAnyPerks = TIER_ORDER.some((t) => (tierPerks[t] || []).length > 0)

  if (!hasAnyPerks) {
    return <p className="text-sm text-stone-500 italic">No special perks defined yet.</p>
  }

  return (
    <div className={compact ? 'space-y-3' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'}>
      {TIER_ORDER.map((tier) => {
        const perks = tierPerks[tier] || []
        const isCurrent = currentTier === tier
        return (
          <div
            key={tier}
            className={`rounded-lg p-4 ${
              isCurrent
                ? 'bg-brand-950 border border-brand-700'
                : 'bg-stone-800/50 border border-stone-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Badge className={TIER_COLORS[tier]}>{TIER_LABELS[tier]}</Badge>
              {isCurrent && <span className="text-xs text-brand-400 font-medium">Your tier</span>}
            </div>
            {perks.length === 0 ? (
              <p className="text-xs text-stone-500">Standard service</p>
            ) : (
              <ul className="space-y-1">
                {perks.map((perk, i) => (
                  <li key={i} className="text-sm text-stone-300 flex items-start gap-1.5">
                    <span className="text-brand-500 mt-0.5 shrink-0">+</span>
                    <span>{perk.length > 120 ? perk.slice(0, 117) + '...' : perk}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
