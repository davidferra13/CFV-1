// Chef Health Badge - used in admin chef list and detail views

import {
  computeChefHealthScore,
  CHEF_TIER_LABELS,
  CHEF_TIER_COLORS,
  type ChefHealthInput,
} from '@/lib/chefs/health-score'

interface Props extends ChefHealthInput {
  showScore?: boolean
}

export function ChefHealthBadge({ showScore = false, ...input }: Props) {
  const { score, tier } = computeChefHealthScore(input)
  const colorClass = CHEF_TIER_COLORS[tier]
  const label = CHEF_TIER_LABELS[tier]

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}
    >
      {label}
      {showScore && <span className="opacity-60">({score})</span>}
    </span>
  )
}
