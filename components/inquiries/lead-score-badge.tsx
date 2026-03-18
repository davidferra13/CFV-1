// GOLDMINE Lead Score Badge - Hot / Warm / Cold pill with score tooltip
// Surfaces the deterministic GOLDMINE lead score stored in unknown_fields

import type { LeadScoreData } from '@/lib/gmail/extract-inquiry-fields'

const LABEL_CONFIG = {
  hot: { className: 'bg-red-900 text-red-700', emoji: '🔥', label: 'Hot' },
  warm: { className: 'bg-amber-900 text-amber-700', emoji: '☀️', label: 'Warm' },
  cold: { className: 'bg-sky-900 text-sky-700', emoji: '❄️', label: 'Cold' },
}

interface LeadScoreBadgeProps {
  score: LeadScoreData
  showScore?: boolean
}

export function LeadScoreBadge({ score, showScore = true }: LeadScoreBadgeProps) {
  const cfg = LABEL_CONFIG[score.lead_tier]

  return (
    <span
      className={`inline-flex items-center gap-1 text-xxs font-semibold px-1.5 py-0.5 rounded ${cfg.className}`}
      title={
        score.lead_score_factors.length > 0
          ? `${score.lead_score}/100 - ${score.lead_score_factors.join(' · ')}`
          : `${score.lead_score}/100`
      }
    >
      {cfg.emoji} {cfg.label}
      {showScore ? ` · ${score.lead_score}` : ''}
    </span>
  )
}
