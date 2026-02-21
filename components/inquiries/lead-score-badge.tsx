// Lead Score Badge — Hot / Warm / Cold pill with score tooltip
// Surfaces the existing LeadScore from lib/leads/scoring.ts

import type { LeadScore } from '@/lib/leads/scoring'

const LABEL_CONFIG = {
  hot:  { className: 'bg-red-100 text-red-700',    emoji: '🔥', label: 'Hot' },
  warm: { className: 'bg-amber-100 text-amber-700', emoji: '☀️', label: 'Warm' },
  cold: { className: 'bg-sky-100 text-sky-700',     emoji: '❄️', label: 'Cold' },
}

interface LeadScoreBadgeProps {
  score: LeadScore
  showScore?: boolean
}

export function LeadScoreBadge({ score, showScore = false }: LeadScoreBadgeProps) {
  const cfg = LABEL_CONFIG[score.label]

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.className}`}
      title={score.factors.length > 0 ? score.factors.join(' · ') : score.label}
    >
      {cfg.emoji} {cfg.label}{showScore ? ` · ${score.score}` : ''}
    </span>
  )
}
