// Prospecting Hub — Shared Types
// Extracted from server action files to avoid 'use server' export restrictions.

export interface Prospect {
  id: string
  chef_id: string
  scrub_session_id: string | null
  name: string
  prospect_type: 'organization' | 'individual'
  category: string
  description: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  region: string | null
  phone: string | null
  email: string | null
  website: string | null
  contact_person: string | null
  contact_title: string | null
  contact_direct_phone: string | null
  contact_direct_email: string | null
  gatekeeper_name: string | null
  gatekeeper_notes: string | null
  best_time_to_call: string | null
  social_profiles: Record<string, string>
  annual_events_estimate: string | null
  membership_size: string | null
  avg_event_budget: string | null
  event_types_hosted: string[] | null
  seasonal_notes: string | null
  competitors_present: string | null
  luxury_indicators: string[] | null
  talking_points: string | null
  approach_strategy: string | null
  source: string
  status: string
  last_called_at: string | null
  call_count: number
  last_outcome: string | null
  next_follow_up_at: string | null
  converted_to_inquiry_id: string | null
  converted_at: string | null
  notes: string | null
  tags: string[]
  priority: string
  created_at: string
  updated_at: string
}

export interface ProspectNote {
  id: string
  prospect_id: string
  chef_id: string
  note_type: string
  content: string
  created_at: string
}

export interface ProspectStats {
  total: number
  new: number
  queued: number
  called: number
  follow_up: number
  converted: number
  dead: number
  not_interested: number
}

export interface ProspectsFilter {
  status?: string | string[]
  category?: string
  region?: string
  priority?: string
  search?: string
  limit?: number
  offset?: number
}

export interface CallScript {
  id: string
  chef_id: string
  name: string
  category: string | null
  script_body: string
  is_default: boolean
  created_at: string
  updated_at: string
}
