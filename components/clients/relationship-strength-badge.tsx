// Relationship Strength Badge - visual tier indicator for a client
// Maps health score tier to a human-friendly label and color.

import type { ClientHealthTier } from '@/lib/clients/health-score'
import { TIER_LABELS, TIER_COLORS } from '@/lib/clients/health-score-utils'

interface Props {
  tier: ClientHealthTier
  score?: number
  showScore?: boolean
}

const TIER_STRENGTH_LABELS: Record<ClientHealthTier, string> = {
  champion: 'Strong',
  loyal: 'Good',
  at_risk: 'Needs Attention',
  dormant: 'Cold',
  new: 'Building',
}

export function RelationshipStrengthBadge({ tier, score, showScore = false }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[tier]}`}
      title={`${TIER_LABELS[tier]} client${score !== undefined ? ` (score: ${score}/100)` : ''}`}
    >
      <span>{TIER_STRENGTH_LABELS[tier]}</span>
      {showScore && score !== undefined && <span className="opacity-60">· {score}</span>}
    </span>
  )
}
