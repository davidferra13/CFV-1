// AI Dispatch Layer - Privacy Gate
// No 'use server' - pure utility, importable anywhere server-side.
//
// Scans task payloads for private data and returns a hard classification.
// This is an architectural gate, not advisory. If the gate says LOCAL_ONLY,
// the router physically cannot reach a cloud endpoint.
//
// The gate is conservative: if in doubt, it classifies as LOCAL_ONLY.
// False positives (marking cloud-safe data as private) cost GPU time.
// False negatives (marking private data as cloud-safe) leak PII. No contest.

import type { PrivacyLevel, PrivateDataCategory } from './types'

/**
 * Result from the privacy gate scan.
 */
export interface PrivacyGateResult {
  level: PrivacyLevel
  detectedCategories: PrivateDataCategory[]
  /** Human-readable explanation of why this was classified as private */
  reason: string | null
}

/**
 * Scans a payload (system prompt + user content) for private data signals.
 *
 * This is a deterministic scan using pattern matching. It does NOT use an LLM.
 * It is intentionally conservative: it flags anything that might be private.
 *
 * Call this BEFORE routing. The result feeds into the classifier and router.
 */
export function scanPrivacy(systemPrompt: string, userContent: string): PrivacyGateResult {
  const combined = `${systemPrompt}\n${userContent}`
  const detected: PrivateDataCategory[] = []
  const reasons: string[] = []

  // ── Client PII ──
  if (PII_PATTERNS.some((p) => p.test(combined))) {
    detected.push('client_pii')
    reasons.push('client PII detected (names, emails, phone numbers, or addresses)')
  }

  // ── Dietary / Allergy ──
  if (DIETARY_PATTERNS.some((p) => p.test(combined))) {
    detected.push('dietary_allergy')
    reasons.push('dietary restrictions or allergy data detected')
  }

  // ── Financial ──
  if (FINANCIAL_PATTERNS.some((p) => p.test(combined))) {
    detected.push('financial')
    reasons.push('financial data detected (quotes, invoices, revenue, pricing)')
  }

  // ── Conversational / Messages ──
  if (CONVERSATION_PATTERNS.some((p) => p.test(combined))) {
    detected.push('conversational')
    reasons.push('conversational data detected (chat messages, inquiry content)')
  }

  // ── Business Data ──
  if (BUSINESS_PATTERNS.some((p) => p.test(combined))) {
    detected.push('business_data')
    reasons.push('business-sensitive data detected (pricing strategy, client lists, lead scores)')
  }

  // ── Contracts / Legal ──
  if (CONTRACT_PATTERNS.some((p) => p.test(combined))) {
    detected.push('contracts_legal')
    reasons.push('contract or legal document data detected')
  }

  // ── Staff Data ──
  if (STAFF_PATTERNS.some((p) => p.test(combined))) {
    detected.push('staff_data')
    reasons.push('staff/employee data detected')
  }

  if (detected.length > 0) {
    return {
      level: 'LOCAL_ONLY',
      detectedCategories: detected,
      reason: reasons.join('; '),
    }
  }

  return {
    level: 'CLOUD_SAFE',
    detectedCategories: [],
    reason: null,
  }
}

/**
 * Quick check: is this payload private?
 * Convenience wrapper for callers that only need the boolean.
 */
export function isPrivatePayload(systemPrompt: string, userContent: string): boolean {
  return scanPrivacy(systemPrompt, userContent).level === 'LOCAL_ONLY'
}

/**
 * Caller-declared override: mark a task as private regardless of content.
 * Use this when you KNOW the task handles private data but the patterns
 * might not catch it (e.g., the prompt references a client by ID, not name).
 */
export function forceLocalOnly(reason: string): PrivacyGateResult {
  return {
    level: 'LOCAL_ONLY',
    detectedCategories: ['client_pii'],
    reason: `Caller-declared private: ${reason}`,
  }
}

// ============================================
// PATTERN DEFINITIONS
// ============================================
// These patterns are intentionally broad. False positives are cheap
// (task runs on local GPU instead of cloud). False negatives leak data.

/** Client PII: names in context, email addresses, phone numbers, physical addresses */
const PII_PATTERNS: RegExp[] = [
  // Email addresses
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  // Phone numbers (various formats)
  /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  // Contextual PII references
  /\b(client name|client email|client phone|client address|guest name|guest list)\b/i,
  /\b(contact info|contact details|mailing address|billing address)\b/i,
  // Names in structured data contexts
  /\b(first_name|last_name|full_name|client_name|guest_name)\b/i,
  // Address patterns
  /\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct)\b/i,
]

/** Dietary and allergy data (safety-critical) */
const DIETARY_PATTERNS: RegExp[] = [
  /\b(allerg|allergen|anaphyla|epipen)\b/i,
  /\b(dietary restriction|dietary preference|dietary requirement|dietary need)\b/i,
  /\b(gluten.free|nut.free|dairy.free|shellfish|lactose|celiac|vegan|vegetarian)\b/i,
  /\b(food.allergy|food.sensitivity|food.intolerance)\b/i,
  /\b(medical.diet|medical.condition|health.condition)\b/i,
  /\b(kosher|halal|pescatarian)\b/i,
]

/** Financial data (business-confidential) */
const FINANCIAL_PATTERNS: RegExp[] = [
  /\b(invoice|quote|estimate|billing|payment|charge|refund|deposit)\b/i,
  /\b(revenue|expense|profit|margin|cost|price|rate|fee)\b/i,
  /\b(total_amount|subtotal|tax_amount|balance_due|amount_paid)\b/i,
  /\b(ledger|transaction|financial_summary|payment_status)\b/i,
  /\$\d+/, // Dollar amounts
  /\b\d+\s*cents?\b/i,
]

/** Conversational data (contains PII by nature) */
const CONVERSATION_PATTERNS: RegExp[] = [
  /\b(chat.message|chat.history|conversation.log|message.thread)\b/i,
  /\b(inquiry.content|inquiry.message|client.message|client.note)\b/i,
  /\b(remy.context|remy.conversation|concierge.chat)\b/i,
  /\b(email.body|email.content|email.thread|correspondence)\b/i,
]

/** Business-sensitive data */
const BUSINESS_PATTERNS: RegExp[] = [
  /\b(pricing.strategy|pricing.history|competitive.advantage)\b/i,
  /\b(lead.score|lead.intelligence|client.list|client.portfolio)\b/i,
  /\b(business.insight|business.analytic|business.metric)\b/i,
  /\b(conversion.rate|booking.rate|retention.rate)\b/i,
]

/** Contract and legal data */
const CONTRACT_PATTERNS: RegExp[] = [
  /\b(contract|agreement|terms.of.service|liability|indemnif)\b/i,
  /\b(legal.document|legal.agreement|service.agreement)\b/i,
  /\b(cancellation.policy|refund.policy|payment.terms)\b/i,
]

/** Staff and employee data */
const STAFF_PATTERNS: RegExp[] = [
  /\b(employee.name|staff.name|worker.name|team.member)\b/i,
  /\b(pay.rate|hourly.rate|salary|wage|compensation)\b/i,
  /\b(staff.schedule|shift.schedule|work.schedule|staff.roster)\b/i,
  /\b(staff_member|employee_id|worker_id)\b/i,
]
