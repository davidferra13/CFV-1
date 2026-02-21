// Inquiry constants — no 'use server' directive.
// Exported separately so they can be used in client components
// without violating the 'use server' file restriction
// (which only allows async function exports).

export const COMMON_DECLINE_REASONS = [
  'Not available on that date',
  'Outside my service area',
  'Budget below my minimum',
  'Date conflict with another event',
  'Fully booked for that period',
  "Cuisine / event type I don't serve",
  'Not a good fit for my style',
  'Client unresponsive',
  'Other',
] as const
