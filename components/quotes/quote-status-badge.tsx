// Quote Status Badge - Displays quote status with appropriate styling
'use client'

import { Badge } from '@/components/ui/badge'

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
export type PricingModel = 'per_person' | 'flat_rate' | 'custom'

const STATUS_CONFIG: Record<
  QuoteStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  draft: { label: 'Draft', variant: 'default' },
  sent: { label: 'Sent', variant: 'info' },
  accepted: { label: 'Accepted', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'error' },
  expired: { label: 'Expired', variant: 'warning' },
}

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const config = STATUS_CONFIG[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

const PRICING_MODEL_CONFIG: Record<
  PricingModel,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  per_person: { label: 'Per Person', variant: 'info' },
  flat_rate: { label: 'Flat Rate', variant: 'default' },
  custom: { label: 'Custom', variant: 'warning' },
}

export function PricingModelBadge({ model }: { model: PricingModel }) {
  const config = PRICING_MODEL_CONFIG[model]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
