// Inline completion badge: "73% complete" with colored dot.
// Use in table rows, list items, and compact layouts.

import type { CompletionStatus } from '@/lib/completion/types'

function dotColor(score: number): string {
  if (score > 70) return 'bg-emerald-400'
  if (score >= 40) return 'bg-amber-400'
  return 'bg-red-400'
}

function textColor(score: number): string {
  if (score > 70) return 'text-emerald-400'
  if (score >= 40) return 'text-amber-400'
  return 'text-red-400'
}

interface CompletionBadgeProps {
  score: number
  status?: CompletionStatus
  className?: string
}

export function CompletionBadge({ score, className = '' }: CompletionBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${textColor(score)} ${className}`}
      title={`${score}% complete`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor(score)}`} />
      {score}%
    </span>
  )
}
