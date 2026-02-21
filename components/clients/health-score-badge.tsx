// ClientHealthBadge — Score pill shown on client cards and the client detail page.

import type { ClientHealthTier } from '@/lib/clients/health-score'
import { TIER_LABELS, TIER_COLORS } from '@/lib/clients/health-score-utils'

type Props = {
  score: number
  tier: ClientHealthTier
  showScore?: boolean
}

export function ClientHealthBadge({ score, tier, showScore = true }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[tier]}`}
      title={`Health score: ${score}/100`}
    >
      {TIER_LABELS[tier]}
      {showScore && <span className="opacity-70">· {score}</span>}
    </span>
  )
}
