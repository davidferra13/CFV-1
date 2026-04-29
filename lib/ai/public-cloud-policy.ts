import {
  RECIPE_GENERATION_PATTERNS,
  RECIPE_SEARCH_PATTERNS,
  REFUSAL_MESSAGES,
} from './remy-pattern-registry'

export type PublicCloudTaskId = 'landing_concierge' | 'chef_public_concierge'

export type PublicCloudSurface = 'public_landing' | 'public_chef_profile'

export type PublicCloudBlockReason =
  | 'unsupported_task'
  | 'surface_mismatch'
  | 'authenticated_context'
  | 'private_context'
  | 'recipe_generation'
  | 'private_signal'
  | 'empty_message'
  | 'missing_public_context'

export interface PublicCloudPolicyInput {
  taskId: string
  surface: string
  message: string
  history?: Array<{ role: string; content: string }>
  publicContext?: Record<string, unknown> | null
  authenticatedUserId?: string | null
  tenantPrivateContext?: unknown
}

export interface PublicCloudPolicyAllowed {
  allowed: true
  taskId: PublicCloudTaskId
  surface: PublicCloudSurface
}

export interface PublicCloudPolicyBlocked {
  allowed: false
  reason: PublicCloudBlockReason
  signal?: string
  publicMessage: string
}

export type PublicCloudPolicyResult = PublicCloudPolicyAllowed | PublicCloudPolicyBlocked

export const PUBLIC_CLOUD_PRIVATE_DETAIL_MESSAGE =
  'For private client, payment, event, recipe, or dietary details, use the inquiry form or portal instead.'

export const PUBLIC_CLOUD_UNAVAILABLE_MESSAGE =
  "I'm unavailable for that right now. Try one of the quick prompts or use the inquiry form."

const TASK_SURFACES: Record<PublicCloudTaskId, PublicCloudSurface> = {
  landing_concierge: 'public_landing',
  chef_public_concierge: 'public_chef_profile',
}

const PRIVATE_SIGNAL_PATTERNS: Array<{ signal: string; pattern: RegExp }> = [
  {
    signal: 'email_address',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  },
  {
    signal: 'phone_number',
    pattern: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?){2}\d{4}\b/,
  },
  {
    signal: 'street_address',
    pattern:
      /\b\d{1,5}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,3}\s(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|way|place|pl)\b/i,
  },
  {
    signal: 'currency_amount',
    pattern: /\$\s?\d[\d,]*(?:\.\d{2})?/,
  },
  {
    signal: 'payment_or_ledger',
    pattern: /\b(payment|paid|invoice|quote|deposit|refund|ledger|balance|stripe|card)\b/i,
  },
  {
    signal: 'personal_dietary_detail',
    pattern:
      /\b(my|mine|me|i|we|our|wife|husband|partner|child|kid|guest|mom|dad|client)\b.{0,80}\b(allerg(?:y|ies|ic)|dietary|gluten|peanut|tree nut|shellfish|dairy|soy|medical diet|celiac)\b/i,
  },
  {
    signal: 'event_private_detail',
    pattern:
      /\b(my|our|private|client)\b.{0,80}\b(event|dinner|wedding|party|booking|reservation)\b/i,
  },
  {
    signal: 'contract_or_legal',
    pattern: /\b(contract|agreement|nda|liability|signature|legal)\b/i,
  },
]

function normalizeTaskId(taskId: string): PublicCloudTaskId | null {
  return taskId === 'landing_concierge' || taskId === 'chef_public_concierge' ? taskId : null
}

function normalizeSurface(surface: string): PublicCloudSurface | null {
  return surface === 'public_landing' || surface === 'public_chef_profile' ? surface : null
}

function recipeGenerationSignal(message: string): string | null {
  for (const { pattern } of RECIPE_SEARCH_PATTERNS) {
    if (pattern.test(message)) return null
  }

  for (const { label, pattern } of RECIPE_GENERATION_PATTERNS) {
    if (pattern.test(message)) return label
  }

  return null
}

function privateSignal(message: string): string | null {
  for (const { signal, pattern } of PRIVATE_SIGNAL_PATTERNS) {
    if (pattern.test(message)) return signal
  }

  return null
}

export function assertPublicCloudAiAllowed(input: PublicCloudPolicyInput): PublicCloudPolicyResult {
  const taskId = normalizeTaskId(input.taskId)
  if (!taskId) {
    return {
      allowed: false,
      reason: 'unsupported_task',
      publicMessage: PUBLIC_CLOUD_UNAVAILABLE_MESSAGE,
    }
  }

  const surface = normalizeSurface(input.surface)
  if (!surface || TASK_SURFACES[taskId] !== surface) {
    return {
      allowed: false,
      reason: 'surface_mismatch',
      publicMessage: PUBLIC_CLOUD_UNAVAILABLE_MESSAGE,
    }
  }

  if (input.authenticatedUserId) {
    return {
      allowed: false,
      reason: 'authenticated_context',
      publicMessage: PUBLIC_CLOUD_UNAVAILABLE_MESSAGE,
    }
  }

  if (input.tenantPrivateContext !== undefined) {
    return {
      allowed: false,
      reason: 'private_context',
      publicMessage: PUBLIC_CLOUD_UNAVAILABLE_MESSAGE,
    }
  }

  if (taskId === 'chef_public_concierge' && !input.publicContext) {
    return {
      allowed: false,
      reason: 'missing_public_context',
      publicMessage: PUBLIC_CLOUD_UNAVAILABLE_MESSAGE,
    }
  }

  const message = input.message.trim()
  if (!message) {
    return {
      allowed: false,
      reason: 'empty_message',
      publicMessage: PUBLIC_CLOUD_UNAVAILABLE_MESSAGE,
    }
  }

  const combinedContent = [message, ...(input.history ?? []).map((entry) => entry.content)]
    .filter(Boolean)
    .join('\n')

  const recipeSignal = recipeGenerationSignal(combinedContent)
  if (recipeSignal) {
    return {
      allowed: false,
      reason: 'recipe_generation',
      signal: recipeSignal,
      publicMessage: REFUSAL_MESSAGES.recipe_generation,
    }
  }

  const sensitiveSignal = privateSignal(combinedContent)
  if (sensitiveSignal) {
    return {
      allowed: false,
      reason: 'private_signal',
      signal: sensitiveSignal,
      publicMessage: PUBLIC_CLOUD_PRIVATE_DETAIL_MESSAGE,
    }
  }

  return { allowed: true, taskId, surface }
}

export function isPublicCloudAiEnabled(): boolean {
  return process.env.PUBLIC_AI_GATEWAY_ENABLED === 'true'
}
