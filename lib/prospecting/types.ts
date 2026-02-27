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
  lead_score: number
  previous_lead_score: number | null
  verified: boolean
  draft_email: string | null
  news_intel: string | null
  last_enriched_at: string | null
  enrichment_sources: string[] | null
  event_signals: string | null
  scrub_type: 'standard' | 'competitor' | 'lookalike'
  lookalike_source_id: string | null
  pipeline_stage:
    | 'new'
    | 'researched'
    | 'contacted'
    | 'responded'
    | 'meeting_set'
    | 'converted'
    | 'lost'
  follow_up_sequence: FollowUpSequence | null
  ai_call_script: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
  updated_at: string
}

export interface FollowUpEmail {
  sequence: number
  subject: string
  body: string
  send_after_days: number
}

export interface FollowUpSequence {
  emails: FollowUpEmail[]
}

export interface OutreachLogEntry {
  id: string
  prospect_id: string
  chef_id: string
  outreach_type:
    | 'email'
    | 'call'
    | 'follow_up_email'
    | 'response_received'
    | 'meeting_scheduled'
    | 'note'
  sequence_number: number | null
  subject: string | null
  body: string | null
  outcome: string | null
  notes: string | null
  created_at: string
}

export interface GeoCluster {
  center_lat: number
  center_lng: number
  region: string
  prospects: Prospect[]
  count: number
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
