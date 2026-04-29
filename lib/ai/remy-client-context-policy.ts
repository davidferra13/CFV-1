export type RemyClientContextVisibility = 'client_visible' | 'chef_only' | 'blocked'

export type RemyClientContextCategory =
  | 'profile'
  | 'dietary'
  | 'event'
  | 'quote'
  | 'loyalty'
  | 'work_graph'
  | 'private_chef_notes'
  | 'admin_audit'
  | 'internal_system'

export interface RemyClientContextPolicy {
  category: RemyClientContextCategory
  visibility: RemyClientContextVisibility
  sourceLabel: string
  mayContainPii: boolean
  mayContainSafetyCriticalInfo: boolean
  allowedPromptUsage: string
}

export const REMY_CLIENT_CONTEXT_POLICY: Record<
  RemyClientContextCategory,
  RemyClientContextPolicy
> = {
  profile: {
    category: 'profile',
    visibility: 'client_visible',
    sourceLabel: 'Client profile',
    mayContainPii: true,
    mayContainSafetyCriticalInfo: false,
    allowedPromptUsage:
      'Use only to answer client-facing questions about their saved contact and preference profile.',
  },
  dietary: {
    category: 'dietary',
    visibility: 'client_visible',
    sourceLabel: 'Dietary and allergy profile',
    mayContainPii: true,
    mayContainSafetyCriticalInfo: true,
    allowedPromptUsage:
      'Use to respect allergies, dietary restrictions, medical diet constraints, and preference safety notes.',
  },
  event: {
    category: 'event',
    visibility: 'client_visible',
    sourceLabel: 'Event details',
    mayContainPii: true,
    mayContainSafetyCriticalInfo: true,
    allowedPromptUsage:
      'Use to answer questions about the client-visible event plan, guest count, location, timing, and safety constraints.',
  },
  quote: {
    category: 'quote',
    visibility: 'client_visible',
    sourceLabel: 'Quote and proposal',
    mayContainPii: true,
    mayContainSafetyCriticalInfo: false,
    allowedPromptUsage:
      'Use to explain client-visible pricing, proposal status, line items, deposits, and payment expectations.',
  },
  loyalty: {
    category: 'loyalty',
    visibility: 'client_visible',
    sourceLabel: 'Client loyalty history',
    mayContainPii: true,
    mayContainSafetyCriticalInfo: false,
    allowedPromptUsage:
      'Use to recognize prior client-visible bookings, milestones, and relationship preferences without exposing private notes.',
  },
  work_graph: {
    category: 'work_graph',
    visibility: 'client_visible',
    sourceLabel: 'Client work graph',
    mayContainPii: true,
    mayContainSafetyCriticalInfo: true,
    allowedPromptUsage:
      'Use only for client-visible next actions, routes, status explanations, and follow-through prompts.',
  },
  private_chef_notes: {
    category: 'private_chef_notes',
    visibility: 'blocked',
    sourceLabel: 'Private chef notes',
    mayContainPii: true,
    mayContainSafetyCriticalInfo: true,
    allowedPromptUsage:
      'Never include in client context or client-visible answers. These notes are private chef memory.',
  },
  admin_audit: {
    category: 'admin_audit',
    visibility: 'blocked',
    sourceLabel: 'Admin audit log',
    mayContainPii: true,
    mayContainSafetyCriticalInfo: true,
    allowedPromptUsage:
      'Never include in Remy prompt context except dedicated admin audit workflows.',
  },
  internal_system: {
    category: 'internal_system',
    visibility: 'blocked',
    sourceLabel: 'Internal system metadata',
    mayContainPii: false,
    mayContainSafetyCriticalInfo: false,
    allowedPromptUsage:
      'Never include in client context. Internal routing, diagnostics, and policy metadata are not client facts.',
  },
}

export function getAllowedRemyClientContextCategories(): RemyClientContextPolicy[] {
  return Object.values(REMY_CLIENT_CONTEXT_POLICY).filter(
    (policy) => policy.visibility === 'client_visible'
  )
}

export function isRemyClientContextCategoryAllowed(category: RemyClientContextCategory): boolean {
  return REMY_CLIENT_CONTEXT_POLICY[category].visibility === 'client_visible'
}

export function blockRemyPrivateClientContextCategories(
  categories: readonly RemyClientContextCategory[]
): RemyClientContextCategory[] {
  return categories.filter(isRemyClientContextCategoryAllowed)
}

export function summarizeRemyClientContextSourceLabels(
  categories: readonly RemyClientContextCategory[]
): string[] {
  const allowedCategories = blockRemyPrivateClientContextCategories(categories)
  const labels = allowedCategories.map(
    (category) => REMY_CLIENT_CONTEXT_POLICY[category].sourceLabel
  )

  return Array.from(new Set(labels))
}
