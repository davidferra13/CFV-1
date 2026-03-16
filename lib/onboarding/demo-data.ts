// Demo / Sample Data Detection
// Identifies records created as sample data during onboarding.
// Uses email pattern matching since the is_demo column does not yet exist.
// When the column is added, switch to checking the flag directly.

const DEMO_EMAIL_PATTERNS = [
  /@example\.com$/i,
  /@demo\.chefflow\.com$/i,
  /@sample\.chefflow\.com$/i,
  /@test\.example\.com$/i,
]

const DEMO_NAME_PATTERNS = [/^(sample|demo|test)\s/i, /\s(sample|demo|test)$/i]

/**
 * Check if a client record is sample/demo data.
 * Checks email and name patterns.
 */
export function isDemoClient(client: { email: string; full_name: string }): boolean {
  if (DEMO_EMAIL_PATTERNS.some((p) => p.test(client.email))) return true
  if (DEMO_NAME_PATTERNS.some((p) => p.test(client.full_name))) return true
  return false
}

/**
 * Check if an event record is sample/demo data.
 * Checks the associated client's email.
 */
export function isDemoEvent(event: {
  client?: { email: string; full_name: string } | null
}): boolean {
  if (!event.client) return false
  return isDemoClient(event.client)
}

/**
 * Check if an inquiry record is sample/demo data.
 * Checks the associated client (if any) or the unknown_fields for a demo marker.
 */
export function isDemoInquiry(inquiry: {
  client?: { email: string; full_name: string } | null
  unknown_fields?: Record<string, unknown> | null
}): boolean {
  if (inquiry.client) return isDemoClient(inquiry.client)
  const fields = inquiry.unknown_fields as Record<string, unknown> | null
  if (fields?.is_demo === true) return true
  const clientName = fields?.client_name as string | undefined
  if (clientName && DEMO_NAME_PATTERNS.some((p) => p.test(clientName))) return true
  return false
}
