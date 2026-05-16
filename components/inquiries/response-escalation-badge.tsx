// Response Time Escalation Badge
// Shows escalation level with appropriate color coding on inquiry cards.
'use client'

import { Badge } from '@/components/ui/badge'
import { computeEscalation, type EscalationState } from '@/lib/inquiries/response-escalation'

interface ResponseEscalationBadgeProps {
  lastResponseAt: string | null
  createdAt: string
  autoResponseEnabled?: boolean
}

export function ResponseEscalationBadge({
  lastResponseAt,
  createdAt,
  autoResponseEnabled = false,
}: ResponseEscalationBadgeProps) {
  const escalation = computeEscalation(lastResponseAt, createdAt, autoResponseEnabled)

  if (escalation.level === 'ok') return null

  const variantMap: Record<string, 'warning' | 'error' | 'default'> = {
    yellow: 'warning',
    orange: 'warning',
    red: 'error',
    green: 'default',
  }

  const variant = escalation.badgeColor ? variantMap[escalation.badgeColor] || 'default' : 'default'

  return (
    <Badge variant={variant} className="text-xs gap-1">
      {escalation.hoursSinceLastResponse}h
    </Badge>
  )
}

/**
 * Inline escalation indicator for inquiry list rows.
 */
export function ResponseTimeIndicator({
  lastResponseAt,
  createdAt,
}: {
  lastResponseAt: string | null
  createdAt: string
}) {
  const escalation = computeEscalation(lastResponseAt, createdAt)

  if (escalation.level === 'ok') return null

  const dotColorMap: Record<string, string> = {
    yellow: 'bg-yellow-400',
    orange: 'bg-orange-400',
    red: 'bg-red-500',
  }

  const dotColor = escalation.badgeColor ? dotColorMap[escalation.badgeColor] || '' : ''

  if (!dotColor) return null

  return (
    <span className="relative flex h-2 w-2" title={escalation.label}>
      <span
        className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor} ${
          escalation.level === 'red' ? 'animate-ping' : ''
        }`}
      />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
    </span>
  )
}
