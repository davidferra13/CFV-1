// Shared constants for CSV import field definitions.
// Extracted from csv-import-actions.ts because 'use server' files cannot export
// non-async values (Next.js restriction).

export const CLIENT_FIELDS = [
  'full_name',
  'email',
  'phone',
  'address',
  'preferred_name',
  'partner_name',
  'allergies',
  'dietary_restrictions',
  'kitchen_size',
  'notes',
] as const

export const RECIPE_FIELDS = [
  'name',
  'category',
  'method',
  'description',
  'prep_time_minutes',
  'cook_time_minutes',
  'yield_quantity',
  'yield_unit',
  'yield_description',
  'dietary_tags',
  'notes',
] as const

export const EVENT_FIELDS = [
  'event_date',
  'guest_count',
  'occasion',
  'location_address',
  'location_city',
  'location_state',
  'location_zip',
  'kitchen_notes',
  'dietary_restrictions',
  'allergies',
] as const
