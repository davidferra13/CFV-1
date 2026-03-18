// Prospecting Hub Constants
// NOT a server action file - no 'use server'. Safe to export constants.

export const PROSPECT_TYPES = ['organization', 'individual'] as const
export type ProspectType = (typeof PROSPECT_TYPES)[number]

export const PROSPECT_CATEGORIES = [
  'yacht_club',
  'country_club',
  'golf_club',
  'marina',
  'luxury_hotel',
  'resort_concierge',
  'estate_manager',
  'wedding_planner',
  'event_coordinator',
  'corporate_events',
  'luxury_realtor',
  'personal_assistant',
  'concierge_service',
  'business_owner',
  'ceo_executive',
  'real_estate_developer',
  'philanthropist',
  'celebrity',
  'athlete',
  'high_net_worth',
  'other',
] as const
export type ProspectCategory = (typeof PROSPECT_CATEGORIES)[number]

export const PROSPECT_CATEGORY_LABELS: Record<ProspectCategory, string> = {
  yacht_club: 'Yacht Club',
  country_club: 'Country Club',
  golf_club: 'Golf Club',
  marina: 'Marina',
  luxury_hotel: 'Luxury Hotel',
  resort_concierge: 'Resort Concierge',
  estate_manager: 'Estate Manager',
  wedding_planner: 'Wedding Planner',
  event_coordinator: 'Event Coordinator',
  corporate_events: 'Corporate Events',
  luxury_realtor: 'Luxury Realtor',
  personal_assistant: 'Personal Assistant',
  concierge_service: 'Concierge Service',
  business_owner: 'Business Owner',
  ceo_executive: 'CEO / Executive',
  real_estate_developer: 'Real Estate Developer',
  philanthropist: 'Philanthropist',
  celebrity: 'Celebrity',
  athlete: 'Athlete',
  high_net_worth: 'High Net Worth',
  other: 'Other',
}

export const PROSPECT_STATUSES = [
  'new',
  'queued',
  'called',
  'follow_up',
  'not_interested',
  'converted',
  'dead',
] as const
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number]

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  new: 'New',
  queued: 'Queued',
  called: 'Called',
  follow_up: 'Follow Up',
  not_interested: 'Not Interested',
  converted: 'Converted',
  dead: 'Dead',
}

export const PROSPECT_STATUS_COLORS: Record<ProspectStatus, string> = {
  new: 'info',
  queued: 'warning',
  called: 'default',
  follow_up: 'warning',
  not_interested: 'default',
  converted: 'success',
  dead: 'default',
}

export const PROSPECT_PRIORITIES = ['high', 'normal', 'low'] as const
export type ProspectPriority = (typeof PROSPECT_PRIORITIES)[number]

export const NOTE_TYPES = ['call_note', 'research', 'observation', 'follow_up', 'general'] as const
export type NoteType = (typeof NOTE_TYPES)[number]

export const SCRUB_STATUSES = ['running', 'enriching', 'completed', 'failed'] as const
export type ScrubStatus = (typeof SCRUB_STATUSES)[number]

export const CALL_OUTCOMES = [
  { value: 'no_answer', label: 'No Answer', nextStatus: 'called' as ProspectStatus },
  { value: 'left_message', label: 'Left Message', nextStatus: 'called' as ProspectStatus },
  {
    value: 'spoke_follow_up',
    label: 'Spoke - Follow Up',
    nextStatus: 'follow_up' as ProspectStatus,
  },
  {
    value: 'spoke_not_interested',
    label: 'Spoke - Not Interested',
    nextStatus: 'not_interested' as ProspectStatus,
  },
  {
    value: 'spoke_booked',
    label: 'Spoke - Booked Tasting!',
    nextStatus: 'converted' as ProspectStatus,
  },
  { value: 'wrong_number', label: 'Wrong Number', nextStatus: 'dead' as ProspectStatus },
  { value: 'dead', label: 'Dead Lead', nextStatus: 'dead' as ProspectStatus },
] as const

// ── Pipeline Stages (Wave 4 - outreach funnel) ─────────────────────────────

export const PIPELINE_STAGES = [
  'new',
  'researched',
  'contacted',
  'responded',
  'meeting_set',
  'converted',
  'lost',
] as const
export type PipelineStage = (typeof PIPELINE_STAGES)[number]

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  new: 'New',
  researched: 'Researched',
  contacted: 'Contacted',
  responded: 'Responded',
  meeting_set: 'Meeting Set',
  converted: 'Converted',
  lost: 'Lost',
}

export const PIPELINE_STAGE_COLORS: Record<PipelineStage, string> = {
  new: 'bg-blue-950 text-blue-400 border-blue-800',
  researched: 'bg-indigo-950 text-indigo-400 border-indigo-800',
  contacted: 'bg-amber-950 text-amber-400 border-amber-800',
  responded: 'bg-cyan-950 text-cyan-400 border-cyan-800',
  meeting_set: 'bg-purple-950 text-purple-400 border-purple-800',
  converted: 'bg-green-950 text-green-400 border-green-800',
  lost: 'bg-stone-800 text-stone-400 border-stone-700',
}

export const OUTREACH_TYPES = [
  'email',
  'call',
  'follow_up_email',
  'response_received',
  'meeting_scheduled',
  'note',
] as const
export type OutreachType = (typeof OUTREACH_TYPES)[number]

export const OUTREACH_TYPE_LABELS: Record<OutreachType, string> = {
  email: 'Email Sent',
  call: 'Call Made',
  follow_up_email: 'Follow-Up Email',
  response_received: 'Response Received',
  meeting_scheduled: 'Meeting Scheduled',
  note: 'Note',
}

export const SCRUB_PRESETS = [
  {
    label: 'Luxury Venues & Clubs',
    query: 'yacht clubs, country clubs, golf clubs, and luxury hotels',
  },
  { label: 'Wealthy Individuals', query: 'wealthiest business owners, CEOs, and executives' },
  {
    label: 'Event Planners',
    query: 'luxury wedding planners, event coordinators, and corporate event managers',
  },
  {
    label: 'Estate & Concierge',
    query: 'estate management firms, personal assistants, and concierge services',
  },
] as const
