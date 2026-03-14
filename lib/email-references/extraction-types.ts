/**
 * Shared types for the GOLDMINE extraction pipeline.
 *
 * NO 'use server' — must be importable from both build scripts and server actions.
 * Zod schemas for deterministic extraction, Ollama enrichment, follow-up parsing,
 * outbound analysis, and thread intelligence.
 */

import { z } from 'zod'

// ─── Deterministic Extraction (regex, no AI) ────────────────────────────

export const DateMentionSchema = z.object({
  raw: z.string(),
  parsed: z.string().nullable(), // ISO 8601 if parseable, null otherwise
  context: z.string(), // Surrounding text for disambiguation
})
export type DateMention = z.infer<typeof DateMentionSchema>

export const GuestCountMentionSchema = z.object({
  raw: z.string(),
  number: z.number().nullable(),
  range_low: z.number().nullable(),
  range_high: z.number().nullable(),
})
export type GuestCountMention = z.infer<typeof GuestCountMentionSchema>

export const BudgetMentionSchema = z.object({
  raw: z.string(),
  amount_cents: z.number().nullable(),
  per_person: z.boolean(),
})
export type BudgetMention = z.infer<typeof BudgetMentionSchema>

export const DeterministicFieldsSchema = z.object({
  phones: z.array(z.string()),
  emails: z.array(z.string()),
  dates: z.array(DateMentionSchema),
  guest_counts: z.array(GuestCountMentionSchema),
  budget_mentions: z.array(BudgetMentionSchema),
  dietary_mentions: z.array(z.string()),
  cannabis_mentions: z.array(z.string()),
  occasion_keywords: z.array(z.string()),
  location_mentions: z.array(z.string()),
  referral_signals: z.array(z.string()),
})
export type DeterministicFields = z.infer<typeof DeterministicFieldsSchema>

// ─── Ollama Enrichment (freeform → structured) ─────────────────────────

export const OllamaEnrichedFieldsSchema = z.object({
  client_name: z.string().nullable(),
  occasion_normalized: z.string().nullable(),
  service_style: z.string().nullable(),
  referral_source: z.string().nullable(),
  cannabis_preference: z.string().nullable(),
  special_notes: z.string().nullable(),
  confidence: z.enum(['high', 'medium', 'low']),
})
export type OllamaEnrichedFields = z.infer<typeof OllamaEnrichedFieldsSchema>

// ─── Follow-Up Extraction (incremental info from thread replies) ────────

export const FollowUpInformationType = z.enum([
  'date_change',
  'guest_count_update',
  'dietary_addition',
  'menu_selection',
  'menu_discussion',
  'logistics',
  'confirmation',
  'cancellation',
  'pricing_discussion',
  'gratitude',
  'question',
  'general',
])

export const FollowUpFieldsSchema = z.object({
  information_type: FollowUpInformationType,
  new_facts: z.record(z.string(), z.string()),
  supersedes: z.array(z.string()),
  confidence: z.enum(['high', 'medium', 'low']),
})
export type FollowUpFields = z.infer<typeof FollowUpFieldsSchema>

// ─── Outbound (Chef Reply) Analysis ────────────────────────────────────

export const OutboundAnalysisSchema = z.object({
  reply_to_message_id: z.string().nullable(),
  latency_minutes: z.number().nullable(),
  contains_pricing: z.boolean(),
  quoted_amount_cents: z.number().nullable(),
  per_person_rate_cents: z.number().nullable(),
  guest_count_for_pricing: z.number().nullable(),
  menu_items_mentioned: z.array(z.string()),
  courses_offered: z.number().nullable(),
  tone: z.enum(['formal', 'casual', 'warm', 'brief']).nullable(),
  includes_availability_confirm: z.boolean(),
  includes_follow_up_question: z.boolean(),
  sign_off_style: z.string().nullable(),
})
export type OutboundAnalysis = z.infer<typeof OutboundAnalysisSchema>

// ─── Thread Intelligence ────────────────────────────────────────────────

export type ThreadStage =
  | 'initial_inquiry'
  | 'information_gathering'
  | 'negotiation'
  | 'confirmation'
  | 'pre_event_logistics'
  | 'post_event'
  | 'declined'
  | 'expired'

export type ThreadOutcome =
  | 'booked'
  | 'likely_booked'
  | 'declined_by_client'
  | 'declined_by_chef'
  | 'expired'
  | 'unknown'

export const ThreadStageEntrySchema = z.object({
  stage: z.string(),
  entered_at: z.string(),
  message_id: z.string(),
})

export const ThreadIntelligenceSchema = z.object({
  thread_id: z.string(),
  client_name: z.string().nullable(),
  client_email: z.string().nullable(),
  client_phone: z.string().nullable(),
  event_date: z.string().nullable(),
  guest_count: z.number().nullable(),
  location: z.string().nullable(),
  occasion: z.string().nullable(),
  budget_cents: z.number().nullable(),
  dietary_restrictions: z.array(z.string()),
  cannabis_preference: z.string().nullable(),
  referral_source: z.string().nullable(),

  // Thread flow
  stages: z.array(ThreadStageEntrySchema),
  outcome: z.string(),
  outcome_confidence: z.enum(['high', 'medium', 'low']),

  // Chef response metrics
  first_response_minutes: z.number().nullable(),
  total_messages: z.number(),
  inbound_count: z.number(),
  outbound_count: z.number(),
  duration_days: z.number().nullable(),

  // Pricing (from outbound analysis)
  quoted_amount_cents: z.number().nullable(),
  per_person_rate_cents: z.number().nullable(),
})
export type ThreadIntelligence = z.infer<typeof ThreadIntelligenceSchema>

// ─── Per-Email Extraction Result ────────────────────────────────────────

export type ExtractionStatus = 'complete' | 'deterministic_only' | 'ollama_failed'

export interface EmailExtraction {
  message_id: string
  category: string
  extraction_status: ExtractionStatus
  deterministic: DeterministicFields
  enriched: OllamaEnrichedFields | null
  follow_up: FollowUpFields | null
  outbound: OutboundAnalysis | null
}
