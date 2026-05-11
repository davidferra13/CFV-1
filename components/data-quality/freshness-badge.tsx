// Freshness Badge - compact indicator showing data age
// Green dot = Fresh, Yellow = Aging, Red = Stale/Expired
'use client'

import type { FreshnessStatus } from '@/lib/data-quality/freshness'

interface FreshnessBadgeProps {
  status: FreshnessStatus
  ageDays: number
  label?: string
  className?: string
}

const statusConfig: Record<
  FreshnessStatus,
  { dot: string; text: string; bg: string; label: string }
> = {
  fresh: {
    dot: 'bg-emerald-400',
    text: 'text-emerald-400',
    bg: 'bg-emerald-950/50 ring-emerald-800/50',
    label: 'Fresh',
  },
  aging: {
    dot: 'bg-amber-400',
    text: 'text-amber-400',
    bg: 'bg-amber-950/50 ring-amber-800/50',
    label: 'Aging',
  },
  stale: {
    dot: 'bg-red-400',
    text: 'text-red-400',
    bg: 'bg-red-950/50 ring-red-800/50',
    label: 'Stale',
  },
  expired: {
    dot: 'bg-red-500',
    text: 'text-red-500',
    bg: 'bg-red-950/60 ring-red-700/50',
    label: 'Expired',
  },
}

function formatAge(days: number): string {
  if (days < 0) return 'Never updated'
  if (days === 0) return 'Today'
  if (days === 1) return '1 day'
  if (days < 30) return `${days} days`
  if (days < 365) {
    const months = Math.floor(days / 30)
    return months === 1 ? '1 month' : `${months} months`
  }
  const years = Math.floor(days / 365)
  return years === 1 ? '1 year' : `${years} years`
}

export function FreshnessBadge({ status, ageDays, label, className = '' }: FreshnessBadgeProps) {
  const config = statusConfig[status]
  const ageText = formatAge(ageDays)

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${config.bg} ${className}`}
      title={`${config.label}: ${label ? `${label} ` : ''}last updated ${ageText} ago`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      <span className={config.text}>
        {ageDays < 0 ? config.label : ageText}
      </span>
    </span>
  )
}
