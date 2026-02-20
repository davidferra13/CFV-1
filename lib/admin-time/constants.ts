// Admin Time Tracking Constants
// Lives in a separate file (no 'use server') so it can be imported by client components.

export type AdminTimeCategory =
  | 'email'
  | 'calls'
  | 'planning'
  | 'bookkeeping'
  | 'marketing'
  | 'sourcing'
  | 'travel_admin'
  | 'other'

export const ADMIN_TIME_CATEGORIES: Array<{ value: AdminTimeCategory; label: string }> = [
  { value: 'email',        label: 'Email & Messaging' },
  { value: 'calls',        label: 'Phone & Video Calls' },
  { value: 'planning',     label: 'Event Planning' },
  { value: 'bookkeeping',  label: 'Bookkeeping & Finance' },
  { value: 'marketing',    label: 'Marketing & Social' },
  { value: 'sourcing',     label: 'Ingredient Sourcing' },
  { value: 'travel_admin', label: 'Travel Logistics' },
  { value: 'other',        label: 'Other' },
]
