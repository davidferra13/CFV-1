export type TimelineEventType =
  | 'inquiry_received'
  | 'quote_sent'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'contract_sent'
  | 'contract_signed'
  | 'deposit_paid'
  | 'payment_received'
  | 'menu_approved'
  | 'menu_changed'
  | 'event_completed'
  | 'feedback_received'
  | 'referral_made'
  | 'rebooked'
  | 'communication_sent'
  | 'note_added'
  | 'dietary_updated'
  | 'guest_count_changed'
  | 'tip_received'

export interface TimelineEntry {
  id: string
  type: TimelineEventType
  title: string
  description: string | null
  event_id: string | null
  metadata: Record<string, unknown>
  occurred_at: string
}

export interface ClientTimeline {
  client_id: string
  client_name: string
  first_contact: string | null
  total_events: number
  total_revenue_cents: number
  entries: TimelineEntry[]
}

export interface TimelineFilter {
  types?: TimelineEventType[]
  from_date?: string
  to_date?: string
  event_id?: string
}
