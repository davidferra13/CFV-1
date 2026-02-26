// Campaign Token Rendering
// Replaces {{token}} placeholders in campaign subjects and bodies.
// Tokens are always double-curly-brace wrapped, e.g. {{first_name}}.

export type TokenContext = {
  first_name: string
  last_name: string
  full_name: string
  chef_name: string
  last_event_date?: string // formatted date string, e.g. "March 12, 2026"
  unsubscribe_url: string
}

const TOKEN_MAP: Array<{ token: string; key: keyof TokenContext }> = [
  { token: '{{first_name}}', key: 'first_name' },
  { token: '{{last_name}}', key: 'last_name' },
  { token: '{{full_name}}', key: 'full_name' },
  { token: '{{chef_name}}', key: 'chef_name' },
  { token: '{{last_event_date}}', key: 'last_event_date' },
  { token: '{{unsubscribe_url}}', key: 'unsubscribe_url' },
]

/**
 * Replace all {{token}} placeholders in a template string with context values.
 * Unknown tokens are left as-is. Missing optional values render as empty string.
 */
export function renderTokens(template: string, ctx: TokenContext): string {
  let result = template
  for (const { token, key } of TOKEN_MAP) {
    const value = ctx[key] ?? ''
    result = result.replaceAll(token, value)
  }
  return result
}

/**
 * Derive first and last name from a full_name string.
 * "Jane Smith" → { first: "Jane", last: "Smith" }
 * "Madonna" → { first: "Madonna", last: "" }
 */
export function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/)
  const first = parts[0] ?? ''
  const last = parts.slice(1).join(' ')
  return { first, last }
}

/**
 * Available tokens for the UI toolbar — shown above the message body editor.
 */
export const AVAILABLE_TOKENS: Array<{ token: string; label: string }> = [
  { token: '{{first_name}}', label: 'First Name' },
  { token: '{{last_name}}', label: 'Last Name' },
  { token: '{{full_name}}', label: 'Full Name' },
  { token: '{{chef_name}}', label: 'Chef Name' },
  { token: '{{last_event_date}}', label: 'Last Event Date' },
]
