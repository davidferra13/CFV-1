import type { AiDispatchRequest, AiPrivacyLevel, AiPrivacyScan } from './types'

const RESTRICTED_TASK_KEYWORDS = [
  'client',
  'inquiry',
  'event',
  'quote',
  'invoice',
  'payment',
  'ledger',
  'revenue',
  'refund',
  'dietary',
  'allergen',
  'allergy',
  'contract',
  'staff',
  'email',
  'phone',
  'address',
  'document',
  'profile',
]

const INTERNAL_TASK_KEYWORDS = [
  'automation',
  'scheduled',
  'reactive',
  'summary',
  'analytics',
  'forecast',
  'briefing',
  'nudge',
]

const SIGNAL_PATTERNS: Array<{ signal: string; level: AiPrivacyLevel; pattern: RegExp }> = [
  {
    signal: 'email_address',
    level: 'restricted',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  },
  {
    signal: 'phone_number',
    level: 'restricted',
    pattern: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?){2}\d{4}\b/,
  },
  {
    signal: 'street_address',
    level: 'restricted',
    pattern:
      /\b\d{1,5}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,3}\s(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court)\b/i,
  },
  {
    signal: 'currency_amount',
    level: 'restricted',
    pattern: /\$\s?\d[\d,]*(?:\.\d{2})?/,
  },
  {
    signal: 'dietary_or_allergy',
    level: 'restricted',
    pattern: /\b(allerg(?:y|ies)|dietary|gluten|vegan|vegetarian|nut[-\s]?free|shellfish)\b/i,
  },
  {
    signal: 'legal_language',
    level: 'restricted',
    pattern: /\b(contract|agreement|nda|liability|refund policy|signature)\b/i,
  },
]

function normalizeTaskType(taskType?: string): string {
  return taskType?.trim().toLowerCase() ?? ''
}

function safeStringify(value: unknown): string {
  if (value == null) return ''

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function scanAiPrivacyRisk(input: AiDispatchRequest): AiPrivacyScan {
  const reasons = new Set<string>()
  const matchedSignals = new Set<string>()
  const taskType = normalizeTaskType(input.taskType)
  const surface = input.surface?.trim().toLowerCase() ?? ''
  const isPublicSurface = surface.includes('public')

  const combinedContent = [
    input.systemPrompt ?? '',
    input.userContent ?? '',
    safeStringify(input.metadata),
  ]
    .filter(Boolean)
    .join('\n')

  for (const keyword of RESTRICTED_TASK_KEYWORDS) {
    if (taskType.includes(keyword)) {
      reasons.add(`Task type indicates private business data (${keyword}).`)
      matchedSignals.add(`task:${keyword}`)
    }
  }

  for (const keyword of INTERNAL_TASK_KEYWORDS) {
    if (taskType.includes(keyword) || surface.includes(keyword)) {
      reasons.add(`Task operates on internal workflow context (${keyword}).`)
      matchedSignals.add(`internal:${keyword}`)
    }
  }

  for (const { signal, pattern } of SIGNAL_PATTERNS) {
    if (pattern.test(combinedContent)) {
      reasons.add(`Payload contains ${signal.replace(/_/g, ' ')}.`)
      matchedSignals.add(`content:${signal}`)
    }
  }

  let level: AiPrivacyLevel = 'public'
  if (
    [...matchedSignals].some(
      (signal) => signal.startsWith('task:') || signal.startsWith('content:')
    )
  ) {
    level = 'restricted'
  } else if (
    matchedSignals.size > 0 ||
    (!isPublicSurface && surface.includes('remy')) ||
    surface.includes('queue')
  ) {
    level = 'internal'
  }

  if (level === 'public' && taskType.startsWith('agent.')) {
    level = 'restricted'
    reasons.add('Agent write actions are treated as restricted until committed.')
    matchedSignals.add('task:agent_write')
  }

  return {
    level,
    containsSensitiveData: level === 'restricted',
    reasons: [...reasons],
    matchedSignals: [...matchedSignals],
  }
}
