'use client'

import { Badge } from '@/components/ui/badge'
import {
  RETAINER_STATUS_LABELS,
  RETAINER_STATUS_VARIANT,
  PERIOD_STATUS_LABELS,
  PERIOD_STATUS_VARIANT,
} from '@/lib/retainers/constants'

export function RetainerStatusBadge({ status }: { status: string }) {
  const variant = RETAINER_STATUS_VARIANT[status] ?? 'default'
  const label = RETAINER_STATUS_LABELS[status] ?? status
  return <Badge variant={variant}>{label}</Badge>
}

export function PeriodStatusBadge({ status }: { status: string }) {
  const variant = PERIOD_STATUS_VARIANT[status] ?? 'default'
  const label = PERIOD_STATUS_LABELS[status] ?? status
  return <Badge variant={variant}>{label}</Badge>
}
