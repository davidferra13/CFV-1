export type ChangeRequestType =
  | 'menu_change'
  | 'guest_count'
  | 'date_change'
  | 'dietary_update'
  | 'service_style'
  | 'venue_change'
  | 'budget_adjustment'
  | 'other'
export type ChangeRequestStatus =
  | 'pending'
  | 'reviewed'
  | 'approved'
  | 'rejected'
  | 'partially_approved'
export type ChangeRequestImpact = 'none' | 'minor' | 'moderate' | 'major'

export interface ChangeRequest {
  id: string
  event_id: string
  client_id: string
  tenant_id: string
  request_type: ChangeRequestType
  description: string
  client_notes: string | null
  chef_notes: string | null
  status: ChangeRequestStatus
  impact: ChangeRequestImpact | null
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  created_at: string
}

export interface ChangeRequestStats {
  pending: number
  approved: number
  rejected: number
  total: number
  avgResponseHours: number | null
}
