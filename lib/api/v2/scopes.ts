// API v2 Scope Definitions
// Scopes control what an API key can access. Checked by the middleware wrapper.

export const API_SCOPES = {
  // Read scopes
  'events:read': 'List and view events',
  'clients:read': 'List and view clients',
  'quotes:read': 'List and view quotes',
  'inquiries:read': 'List and view inquiries',
  'menus:read': 'List and view menus',
  'recipes:read': 'List and view recipes',
  'finance:read': 'View expenses, ledger, financial summaries',
  'documents:read': 'List and view documents',
  'settings:read': 'View preferences and configuration',

  // Write scopes
  'events:write': 'Create and update events',
  'clients:write': 'Create and update clients',
  'quotes:write': 'Create, update, send, and accept quotes',
  'inquiries:write': 'Create and update inquiries',
  'menus:write': 'Create and update menus',
  'finance:write': 'Log expenses, record payments',
  'documents:write': 'Generate documents',
  'settings:write': 'Update preferences and configuration',

  // Admin scopes
  'webhooks:manage': 'Manage outbound webhook subscriptions',
  'api-keys:manage': 'Manage API keys',
  'search:read': 'Search across entities',
  'queue:read': 'View priority queue',
} as const

export type ApiScope = keyof typeof API_SCOPES

/**
 * Check if the given scopes array includes the required scope.
 * Write scopes implicitly grant the corresponding read scope
 * (e.g., 'events:write' grants 'events:read').
 */
export function hasScope(scopes: string[], required: ApiScope): boolean {
  if (scopes.includes(required)) return true

  // Write implies read for the same resource
  if (required.endsWith(':read')) {
    const resource = required.replace(':read', '')
    if (scopes.includes(`${resource}:write`)) return true
  }

  return false
}

export function hasAllScopes(scopes: string[], required: ApiScope[]): boolean {
  return required.every((s) => hasScope(scopes, s))
}

/**
 * Default scopes for legacy v1 API keys (backward compatible).
 * Keys created before the scope system get read-only access to events and clients.
 */
export const LEGACY_DEFAULT_SCOPES: ApiScope[] = ['events:read', 'clients:read']

/**
 * All available scopes grouped by category, for the settings UI.
 */
export function getScopesByCategory(): Record<string, { scope: ApiScope; label: string }[]> {
  const categories: Record<string, { scope: ApiScope; label: string }[]> = {}

  for (const [scope, label] of Object.entries(API_SCOPES)) {
    const [resource] = scope.split(':')
    const category = resource.charAt(0).toUpperCase() + resource.slice(1)
    if (!categories[category]) categories[category] = []
    categories[category].push({ scope: scope as ApiScope, label })
  }

  return categories
}
