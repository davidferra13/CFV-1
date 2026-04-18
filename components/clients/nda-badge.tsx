'use client'

import { Lock } from '@/components/ui/icons'

type NdaBadgeStatus = 'signed' | 'expiring' | 'expired' | 'none'

type Props = {
  status: NdaBadgeStatus
  /** If true, show a smaller inline badge (for lists/cards) */
  compact?: boolean
}

const BADGE_STYLES: Record<NdaBadgeStatus, string> = {
  signed: 'bg-emerald-900/30 text-emerald-400 border-emerald-700/50',
  expiring: 'bg-amber-900/30 text-amber-400 border-amber-700/50',
  expired: 'bg-red-900/30 text-red-400 border-red-700/50',
  none: '',
}

const BADGE_LABELS: Record<NdaBadgeStatus, string> = {
  signed: 'NDA',
  expiring: 'NDA Expiring',
  expired: 'NDA Expired',
  none: '',
}

export function NdaBadge({ status, compact }: Props) {
  if (status === 'none') return null

  const style = BADGE_STYLES[status]
  const label = compact ? 'NDA' : BADGE_LABELS[status]

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${style}`}
      title={BADGE_LABELS[status]}
    >
      <Lock className="h-3 w-3" />
      {label}
    </span>
  )
}

/**
 * Determine NDA badge status from expiry date and active status.
 * Pure deterministic logic (Formula > AI).
 */
export function getNdaBadgeStatus(
  hasActiveNda: boolean,
  nearestExpiry: string | null
): NdaBadgeStatus {
  if (!hasActiveNda) return 'none'
  if (!nearestExpiry) return 'signed'

  const now = new Date()
  const expiry = new Date(nearestExpiry)

  if (expiry < now) return 'expired'

  const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntil <= 30) return 'expiring'
  return 'signed'
}
