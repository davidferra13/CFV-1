// Inquiry import constants - no 'use server' directive.
// Used by the bulk inquiry import UI for dropdown options.

export const IMPORT_STATUS_OPTIONS = [
  { value: 'new', label: 'New (still want to follow up)' },
  { value: 'confirmed', label: 'Confirmed (became a job)' },
  { value: 'declined', label: 'Declined' },
  { value: 'expired', label: 'Expired (ghosted / faded out)' },
] as const

export const IMPORT_CHANNEL_OPTIONS = [
  { value: 'website', label: 'Website' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'text', label: 'Text' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'referral', label: 'Referral' },
  { value: 'take_a_chef', label: 'Take a Chef' },
  { value: 'wix', label: 'Wix' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'other', label: 'Other' },
] as const

export const IMPORT_DECLINE_REASONS = [
  'Not available on that date',
  'Outside my service area',
  'Budget below my minimum',
  'Date conflict with another event',
  'Fully booked for that period',
  "Cuisine / event type I don't serve",
  'Not a good fit for my style',
  'Client unresponsive',
  'Found another chef',
  'Too expensive for client',
  'Other',
] as const

export type ImportStatus = (typeof IMPORT_STATUS_OPTIONS)[number]['value']
export type ImportChannel = (typeof IMPORT_CHANNEL_OPTIONS)[number]['value']
