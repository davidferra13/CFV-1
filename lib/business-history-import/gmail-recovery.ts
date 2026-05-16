import type { EmailClassification } from '@/lib/google/types'
import type {
  BusinessHistoryDestination,
  BusinessHistoryFindingCategory,
} from '@/lib/business-history-import/types'

export interface BusinessHistoryEmailInput {
  subject: string
  body: string
  fromAddress: string
  knownClientEmails?: string[]
}

export interface BusinessHistoryEmailClassification {
  category: BusinessHistoryFindingCategory | 'personal' | 'spam' | 'marketing'
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  is_food_related: boolean
  proposedDestination: BusinessHistoryDestination
}

const CATEGORY_DESTINATION: Record<BusinessHistoryFindingCategory, BusinessHistoryDestination> = {
  inquiry: 'inquiries',
  existing_thread: 'review_only',
  client: 'clients',
  event: 'events',
  preference: 'preferences',
  payment_invoice: 'finance',
  follow_up: 'tasks',
}

function includesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text))
}

export function classifyBusinessHistoryEmail({
  subject,
  body,
  fromAddress,
  knownClientEmails = [],
}: BusinessHistoryEmailInput): BusinessHistoryEmailClassification | null {
  const text = `${subject}\n${body}`.toLowerCase()
  const sender = fromAddress.toLowerCase()
  const isKnownClient = knownClientEmails.some(
    (email) => email && sender.includes(email.toLowerCase())
  )

  const signals: string[] = []
  let category: BusinessHistoryFindingCategory | null = null
  let score = 0

  if (
    includesAny(text, [
      /\b(invoice|receipt|paid|payment|deposit|balance due|venmo|zelle|ach|stripe|refund)\b/i,
      /\$\s?\d{2,}/,
    ])
  ) {
    category = 'payment_invoice'
    score += 3
    signals.push('payment_or_invoice_signal')
  }

  if (
    includesAny(text, [
      /\b(menu|dish|course|tasting|plated|buffet|family style)\b/i,
      /\b(allerg(?:y|ies)|gluten free|dairy free|vegan|vegetarian|kosher|halal|preference)\b/i,
      /\b(loves|hates|does not eat|favorite|avoid)\b/i,
    ])
  ) {
    if (!category || (category as BusinessHistoryFindingCategory) === 'existing_thread')
      category = 'preference'
    score += 2
    signals.push('menu_or_preference_signal')
  }

  if (
    includesAny(text, [
      /\b(follow up|circle back|checking in|next week|touch base|still interested)\b/i,
      /\b(awaiting|pending|no response|haven't heard|have not heard)\b/i,
    ])
  ) {
    if (!category || (category as BusinessHistoryFindingCategory) === 'existing_thread')
      category = 'follow_up'
    score += 2
    signals.push('follow_up_signal')
  }

  if (
    includesAny(text, [
      /\b(event|dinner|party|wedding|birthday|anniversary|corporate|retreat)\b/i,
      /\b(guest|guests|people|headcount|attendees)\b/i,
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
    ])
  ) {
    if (!category || (category as BusinessHistoryFindingCategory) === 'client') category = 'event'
    score += 2
    signals.push('event_history_signal')
  }

  if (
    includesAny(text, [
      /\b(new client|repeat client|client info|phone|email address|preferred contact)\b/i,
      /\b(met through|referred by|referral|lead source)\b/i,
    ]) ||
    (!category && isKnownClient)
  ) {
    category = category ?? 'client'
    score += 1
    signals.push(isKnownClient ? 'known_client_sender' : 'client_identity_signal')
  }

  if (!category || score < 2) return null

  const confidence = score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low'

  return {
    category,
    confidence,
    reasoning: `Business history recovery: ${signals.join(', ')}`,
    is_food_related: true,
    proposedDestination: CATEGORY_DESTINATION[category],
  }
}

export function promoteBusinessHistoryClassification(
  base: EmailClassification,
  input: BusinessHistoryEmailInput
): EmailClassification {
  if (base.category === 'spam' || base.category === 'marketing' || base.category === 'personal') {
    return base
  }

  const expanded = classifyBusinessHistoryEmail(input)
  if (!expanded) return base

  if (base.category === 'inquiry' && expanded.category !== 'payment_invoice') {
    return {
      ...base,
      reasoning: `${base.reasoning}; ${expanded.reasoning}`,
    }
  }

  return {
    category: expanded.category,
    confidence: expanded.confidence,
    reasoning: expanded.reasoning,
    is_food_related: expanded.is_food_related,
  } as EmailClassification
}

export function getProposedDestinationForCategory(category: string): BusinessHistoryDestination {
  if (category in CATEGORY_DESTINATION) {
    return CATEGORY_DESTINATION[category as BusinessHistoryFindingCategory]
  }
  return 'review_only'
}
