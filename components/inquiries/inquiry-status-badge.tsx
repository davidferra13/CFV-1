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
  awaiting_client: { label: 'Client Reply', variant: 'info' },
  awaiting_chef: { label: 'Your Reply', variant: 'default' },
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
  thumbtack: { label: 'Thumbtack', variant: 'info' },
  theknot: { label: 'The Knot', variant: 'info' },
  bark: { label: 'Bark', variant: 'info' },
  cozymeal: { label: 'Cozymeal', variant: 'info' },
  google_business: { label: 'Google', variant: 'info' },
  gigsalad: { label: 'GigSalad', variant: 'info' },
  wix: { label: 'Wix', variant: 'info' },
  referral: { label: 'Referral', variant: 'success' },
  walk_in: { label: 'Walk-In', variant: 'default' },
  outbound_prospecting: { label: 'Outbound', variant: 'warning' },
  kiosk: { label: 'Kiosk', variant: 'default' },
  campaign_response: { label: 'Campaign', variant: 'warning' },
  privatechefmanager: { label: 'PCM', variant: 'info' },
  hireachef: { label: 'HireAChef', variant: 'info' },
  cuisineistchef: { label: 'Cuisineist', variant: 'info' },
}

export function InquiryChannelBadge({ channel }: { channel: string }) {
  const config = CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.other
  return <Badge variant={config.variant}>{config.label}</Badge>
}
