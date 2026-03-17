// Shared constants for mileage tracking display.
// Extracted from mileage-actions.ts because 'use server' files cannot export
// non-async values (Next.js restriction).

export type MileagePurpose =
  | 'client_service'
  | 'grocery_shopping'
  | 'event_prep'
  | 'consultation'
  | 'delivery'
  | 'other'

export const MILEAGE_PURPOSE_LABELS: Record<MileagePurpose, string> = {
  client_service: 'Client Service',
  grocery_shopping: 'Grocery Shopping',
  event_prep: 'Event Prep',
  consultation: 'Consultation',
  delivery: 'Delivery',
  other: 'Other',
}
