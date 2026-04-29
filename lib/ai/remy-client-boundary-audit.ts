import {
  REMY_CLIENT_CONTEXT_POLICY,
  type RemyClientContextCategory,
} from '@/lib/ai/remy-client-context-policy'

const BLOCKED_CLIENT_CONTEXT_CATEGORIES = new Set<string>([
  'private_chef_notes',
  'admin_audit',
  'internal_system',
])

const SAFETY_CRITICAL_CLIENT_CONTEXT_CATEGORIES = new Set<string>(['dietary', 'event'])

export interface RemyClientBoundaryAuditInput {
  requestedCategories: readonly string[]
  payloadLabels?: readonly string[]
  payloadKeys?: readonly string[]
}

export interface RemyClientBoundaryBlockedCategory {
  category: string
  reason: 'blocked_private_category' | 'unknown_category'
}

export interface RemyClientBoundaryAuditResult {
  pass: boolean
  allowedCategories: RemyClientContextCategory[]
  blockedCategories: RemyClientBoundaryBlockedCategory[]
  sourceLabels: string[]
  violationCount: number
  safetyCriticalPresent: boolean
  suggestedNextStep: string
}

export function auditRemyClientBoundary(
  input: RemyClientBoundaryAuditInput
): RemyClientBoundaryAuditResult {
  const allowedCategories: RemyClientContextCategory[] = []
  const blockedCategories: RemyClientBoundaryBlockedCategory[] = []
  const sourceLabels = new Set<string>()
  let safetyCriticalPresent = false

  for (const category of input.requestedCategories) {
    if (SAFETY_CRITICAL_CLIENT_CONTEXT_CATEGORIES.has(category)) {
      safetyCriticalPresent = true
    }

    if (!isKnownRemyClientContextCategory(category)) {
      blockedCategories.push({ category, reason: 'unknown_category' })
      continue
    }

    const policy = REMY_CLIENT_CONTEXT_POLICY[category]

    if (BLOCKED_CLIENT_CONTEXT_CATEGORIES.has(category) || policy.visibility !== 'client_visible') {
      blockedCategories.push({ category, reason: 'blocked_private_category' })
      continue
    }

    allowedCategories.push(category)
    sourceLabels.add(policy.sourceLabel)
  }

  for (const label of input.payloadLabels ?? []) {
    const trimmedLabel = label.trim()

    if (trimmedLabel.length > 0) {
      sourceLabels.add(trimmedLabel)
    }
  }

  for (const key of input.payloadKeys ?? []) {
    const trimmedKey = key.trim()

    if (trimmedKey.length > 0) {
      sourceLabels.add(`Payload key: ${trimmedKey}`)
    }
  }

  const violationCount = blockedCategories.length

  return {
    pass: violationCount === 0,
    allowedCategories: Array.from(new Set(allowedCategories)),
    blockedCategories,
    sourceLabels: Array.from(sourceLabels),
    violationCount,
    safetyCriticalPresent,
    suggestedNextStep:
      violationCount > 0
        ? 'Remove blocked or unknown categories before formatting client prompt context.'
        : 'Client prompt context categories are clean for formatting.',
  }
}

export function isKnownRemyClientContextCategory(
  category: string
): category is RemyClientContextCategory {
  return Object.hasOwn(REMY_CLIENT_CONTEXT_POLICY, category)
}
