// Inquiry Status Badge - Displays inquiry pipeline status with appropriate styling
'use client'

import { Badge } from '@/components/ui/badge'

export type InquiryStatus =
  | 'new'
  | 'awaiting_client'
  | 'awaiting_chef'
  | 'quoted'
  | 'confirmed'
  | 'declined'
  | 'expired'

const STATUS_CONFIG: Record<
  InquiryStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  new: { label: 'New', variant: 'warning' },
  awaiting_client: { label: 'Awaiting Client', variant: 'info' },
  awaiting_chef: { label: 'Awaiting Chef', variant: 'default' },
  quoted: { label: 'Quoted', variant: 'info' },
  confirmed: { label: 'Confirmed', variant: 'success' },
  declined: { label: 'Declined', variant: 'error' },
  expired: { label: 'Expired', variant: 'error' },
}

export function InquiryStatusBadge({ status }: { status: InquiryStatus }) {
  const config = STATUS_CONFIG[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

const CHANNEL_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  text: { label: 'Text', variant: 'default' },
  email: { label: 'Email', variant: 'info' },
  instagram: { label: 'Instagram', variant: 'warning' },
  take_a_chef: { label: 'Take a Chef', variant: 'success' },
  yhangry: { label: 'Yhangry', variant: 'warning' },
  phone: { label: 'Phone', variant: 'default' },
  website: { label: 'Website', variant: 'info' },
  other: { label: 'Other', variant: 'default' },
}

export function InquiryChannelBadge({ channel }: { channel: string }) {
  const config = CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.other
  return <Badge variant={config.variant}>{config.label}</Badge>
}
