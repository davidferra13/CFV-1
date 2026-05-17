/**
 * Types for event handoff (chef delegation) system.
 */

export type HandoffStatus = 'pending' | 'accepted' | 'completed' | 'cancelled'

export type HandoffRecord = {
  id: string
  event_id: string
  tenant_id: string
  from_user_id: string
  to_user_id: string
  notes: string | null
  status: HandoffStatus
  packet_json: HandoffPacket | null
  created_at: string
  accepted_at: string | null
  completed_at: string | null
}

export type HandoffPacket = {
  event: HandoffEventSummary
  client: HandoffClientSummary | null
  menu: HandoffMenuSummary | null
  timeline: HandoffTimelineEntry[]
  vendorContacts: HandoffVendorContact[]
  chefNotes: string | null
  outstandingTasks: HandoffTask[]
}

export type HandoffEventSummary = {
  id: string
  eventDate: string | null
  serveTime: string | null
  guestCount: number | null
  locationAddress: string | null
  locationCity: string | null
  locationState: string | null
  serviceStyle: string | null
  occasion: string | null
  status: string | null
  dietaryRestrictions: string[]
  allergies: string[]
  specialRequests: string | null
}

export type HandoffClientSummary = {
  id: string
  name: string
  email: string | null
  phone: string | null
  preferences: string | null
}

export type HandoffMenuSummary = {
  id: string
  name: string | null
  courses: HandoffCourse[]
}

export type HandoffCourse = {
  name: string
  dishes: HandoffDish[]
}

export type HandoffDish = {
  name: string
  allergens: string[]
  dietaryTags: string[]
}

export type HandoffTimelineEntry = {
  time: string
  label: string
  notes: string | null
}

export type HandoffVendorContact = {
  name: string
  role: string | null
  phone: string | null
  email: string | null
}

export type HandoffTask = {
  description: string
  dueDate: string | null
  completed: boolean
}
