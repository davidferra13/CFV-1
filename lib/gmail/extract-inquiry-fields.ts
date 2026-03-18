/**
 * Bridge between deterministic email extractors and the Gmail sync pipeline.
 *
 * Runs instant regex extraction on raw email text, then computes a lead score.
 * No Ollama, no network calls - works offline, instantly, for free.
 *
 * Used by handleInquiry() to populate inquiry fields BEFORE attempting Ollama,
 * and by platform handlers to add lead scoring to already-parsed inquiries.
 */

import { extractAllDeterministicFields } from '@/scripts/email-references/deterministic-extractors'
import { scoreFromExtraction } from '@/lib/inquiries/goldmine-lead-score'
import type { DeterministicFields } from '@/scripts/email-references/extraction-types'

// ─── Types ──────────────────────────────────────────────────────────────

export interface ExtractedInquiryFields {
  /** Event date (ISO string if parseable, raw text otherwise) */
  confirmed_date: string | null
  /** Number of guests */
  confirmed_guest_count: number | null
  /** Budget in cents */
  confirmed_budget_cents: number | null
  /** Location text */
  confirmed_location: string | null
  /** Occasion keyword */
  confirmed_occasion: string | null
  /** Dietary restrictions array */
  confirmed_dietary_restrictions: string[]
  /** Cannabis preference text */
  confirmed_cannabis_preference: string | null
  /** Phone number */
  client_phone: string | null
  /** Referral source */
  referral_source: string | null
}

export interface LeadScoreData {
  /** 0-100 normalized score */
  lead_score: number
  /** hot / warm / cold */
  lead_tier: 'hot' | 'warm' | 'cold'
  /** Human-readable factors that contributed to the score */
  lead_score_factors: string[]
}

export interface ExtractAndScoreOptions {
  /** Timestamp of the email being parsed (used to resolve YYYY-MM-DD placeholders) */
  observedAt?: string | null
}

// ─── Extract + Score ────────────────────────────────────────────────────

/**
 * Run deterministic extraction on an email and compute lead score.
 * Returns both the extracted fields and the scoring result.
 */
export function extractAndScoreEmail(
  subject: string,
  body: string,
  threadContext?: {
    total_messages: number
    has_pricing_quoted: boolean
  },
  options?: ExtractAndScoreOptions
): {
  fields: ExtractedInquiryFields
  score: LeadScoreData
  raw: DeterministicFields
} {
  // 1. Run all regex extractors
  const raw = extractAllDeterministicFields(subject, body)

  // 2. Map to inquiry fields
  const fields = mapToInquiryFields(raw, options)

  // 3. Compute lead score
  const scoreResult = scoreFromExtraction(raw, threadContext)

  return {
    fields,
    score: {
      lead_score: scoreResult.score,
      lead_tier: scoreResult.tier,
      lead_score_factors: scoreResult.factors,
    },
    raw,
  }
}

/**
 * Compute lead score from already-parsed inquiry fields.
 * Used by platform parsers that have their own extraction logic.
 */
export function scoreInquiryFields(fields: {
  confirmed_date: string | null
  confirmed_guest_count: number | null
  confirmed_budget_cents: number | null
  confirmed_location: string | null
  confirmed_occasion: string | null
  confirmed_dietary_restrictions: string[] | null
  confirmed_cannabis_preference: string | null
  referral_source?: string | null
}): LeadScoreData {
  const scoreResult = scoreFromExtraction(
    {
      dates: fields.confirmed_date ? [{ raw: fields.confirmed_date }] : [],
      guest_counts: fields.confirmed_guest_count ? [{ number: fields.confirmed_guest_count }] : [],
      budget_mentions: fields.confirmed_budget_cents
        ? [{ amount_cents: fields.confirmed_budget_cents }]
        : [],
      occasion_keywords: fields.confirmed_occasion ? [fields.confirmed_occasion] : [],
      dietary_mentions: fields.confirmed_dietary_restrictions || [],
      cannabis_mentions: fields.confirmed_cannabis_preference
        ? [fields.confirmed_cannabis_preference]
        : [],
      location_mentions: fields.confirmed_location ? [fields.confirmed_location] : [],
      referral_signals: fields.referral_source ? [fields.referral_source] : [],
    },
    {
      total_messages: 1, // First contact - single message
      has_pricing_quoted: false, // Chef hasn't quoted yet
    }
  )

  return {
    lead_score: scoreResult.score,
    lead_tier: scoreResult.tier,
    lead_score_factors: scoreResult.factors,
  }
}

// ─── Internal Mapping ───────────────────────────────────────────────────

function resolveDatePlaceholder(value: string | null, observedAt?: string | null): string | null {
  if (!value) return null

  // Already concrete date/time.
  if (!value.startsWith('YYYY-')) {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
    return value
  }

  const match = /^YYYY-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value

  const month = Number.parseInt(match[1], 10)
  const day = Number.parseInt(match[2], 10)
  if (!Number.isFinite(month) || !Number.isFinite(day)) return value

  const anchor = observedAt ? new Date(observedAt) : new Date()
  if (Number.isNaN(anchor.getTime())) return value

  let year = anchor.getUTCFullYear()
  const anchorMonth = anchor.getUTCMonth() + 1
  const anchorDay = anchor.getUTCDate()

  if (month < anchorMonth || (month === anchorMonth && day < anchorDay - 7)) {
    year += 1
  }

  const resolved = new Date(Date.UTC(year, month - 1, day))
  if (Number.isNaN(resolved.getTime())) return value
  return resolved.toISOString().slice(0, 10)
}

function mapToInquiryFields(
  raw: DeterministicFields,
  options?: ExtractAndScoreOptions
): ExtractedInquiryFields {
  // Best date: prefer parsed ISO, fall back to raw
  let confirmedDate: string | null = null
  if (raw.dates.length > 0) {
    const best = raw.dates.find((d) => d.parsed) || raw.dates[0]
    confirmedDate = resolveDatePlaceholder(best.parsed || best.raw, options?.observedAt)
  }

  // Best guest count: prefer exact number, then range_low
  let guestCount: number | null = null
  if (raw.guest_counts.length > 0) {
    const best = raw.guest_counts[0]
    guestCount = best.number || best.range_low || null
  }

  // Best budget: prefer first with amount
  let budgetCents: number | null = null
  if (raw.budget_mentions.length > 0) {
    const best = raw.budget_mentions.find((b) => b.amount_cents && b.amount_cents > 0)
    if (best) {
      budgetCents = best.amount_cents
      // If per-person and we have guest count, multiply
      if (best.per_person && guestCount) {
        budgetCents = best.amount_cents! * guestCount
      }
    }
  }

  return {
    confirmed_date: confirmedDate,
    confirmed_guest_count: guestCount,
    confirmed_budget_cents: budgetCents,
    confirmed_location: raw.location_mentions[0] || null,
    confirmed_occasion: raw.occasion_keywords[0] || null,
    confirmed_dietary_restrictions: raw.dietary_mentions,
    confirmed_cannabis_preference:
      raw.cannabis_mentions.length > 0 ? raw.cannabis_mentions.join(', ') : null,
    client_phone: raw.phones[0] || null,
    referral_source: raw.referral_signals[0] || null,
  }
}
