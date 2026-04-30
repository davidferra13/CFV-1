// Event Status Badge - Displays event status with appropriate styling
'use client'

import { StateMotionBadge } from '@/components/ui/state-motion'

export type EventStatus =
  | 'draft'
  | 'proposed'
  | 'accepted'
  | 'paid'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

const STATUS_CONFIG: Record<
  EventStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  draft: { label: 'Draft', variant: 'default' },
  proposed: { label: 'Proposed', variant: 'info' },
  accepted: { label: 'Accepted', variant: 'warning' },
  paid: { label: 'Paid', variant: 'success' },
  confirmed: { label: 'Confirmed', variant: 'success' },
  in_progress: { label: 'In Progress', variant: 'info' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'error' },
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <StateMotionBadge watch={status} variant={config.variant}>
      {config.label}
    </StateMotionBadge>
  )
}
