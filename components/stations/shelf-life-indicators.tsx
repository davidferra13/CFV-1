'use client'

// Shelf Life Indicators — Reusable badge showing expiration status
// Green = 3+ days, Yellow = 1-2 days, Red = expired

import { Badge } from '@/components/ui/badge'

type Props = {
  madeAt: string
  shelfLifeDays: number
}

/**
 * Compute days remaining from the made_at date given a shelf life in days.
 */
function computeDaysRemaining(madeAt: string, shelfLifeDays: number): number {
  const made = new Date(madeAt)
  const expiresAt = new Date(made)
  expiresAt.setDate(expiresAt.getDate() + shelfLifeDays)

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  expiresAt.setHours(0, 0, 0, 0)

  const diffMs = expiresAt.getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function ShelfLifeIndicator({ madeAt, shelfLifeDays }: Props) {
  const daysRemaining = computeDaysRemaining(madeAt, shelfLifeDays)

  if (daysRemaining <= 0) {
    return <Badge variant="error">EXPIRED</Badge>
  }

  if (daysRemaining <= 1) {
    return <Badge variant="warning">Expires today</Badge>
  }

  if (daysRemaining <= 2) {
    return <Badge variant="warning">{daysRemaining}d left</Badge>
  }

  return <Badge variant="success">{daysRemaining}d left</Badge>
}

/**
 * Inline shelf-life text (no badge, just colored text) for compact views.
 */
export function ShelfLifeText({ madeAt, shelfLifeDays }: Props) {
  const daysRemaining = computeDaysRemaining(madeAt, shelfLifeDays)

  if (daysRemaining <= 0) {
    return <span className="text-xs font-bold text-red-400">EXPIRED</span>
  }

  if (daysRemaining <= 2) {
    return <span className="text-xs font-medium text-amber-400">{daysRemaining}d</span>
  }

  return <span className="text-xs text-emerald-400">{daysRemaining}d</span>
}
