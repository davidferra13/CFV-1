const DEMO_EMAIL_PATTERNS = [
  /@example\.com$/i,
  /@demo\.chefflow\.com$/i,
  /@sample\.chefflow\.com$/i,
  /@test\.example\.com$/i,
]

const DEMO_NAME_PATTERNS = [/^(sample|demo|test)\s/i, /\s(sample|demo|test)$/i]

export function isDemoClient(client: { email: string; full_name: string }): boolean {
  if (DEMO_EMAIL_PATTERNS.some((pattern) => pattern.test(client.email))) return true
  if (DEMO_NAME_PATTERNS.some((pattern) => pattern.test(client.full_name))) return true
  return false
}

export function isDemoEvent(event: {
  client?: { email: string; full_name: string } | null
}): boolean {
  if (!event.client) return false
  return isDemoClient(event.client)
}

export function isDemoInquiry(inquiry: {
  client?: { email: string; full_name: string } | null
  unknown_fields?: Record<string, unknown> | null
}): boolean {
  if (inquiry.client) return isDemoClient(inquiry.client)
  const fields = inquiry.unknown_fields as Record<string, unknown> | null
  if (fields?.is_demo === true) return true
  const clientName = fields?.client_name as string | undefined
  if (clientName && DEMO_NAME_PATTERNS.some((pattern) => pattern.test(clientName))) return true
  return false
}
