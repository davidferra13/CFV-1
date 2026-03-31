// Service Lifecycle Detection Engine
// Deterministic pattern matching first, Ollama fallback for ambiguous content.
// NOT a 'use server' file - called from both server actions and Gmail sync pipeline.

import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { ALL_CHECKPOINTS, type CheckpointDef } from './seed'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CheckpointDetection {
  checkpoint_key: string
  value: any
  confidence: number // 0-1 (1.0 for deterministic, 0.5-0.9 for AI)
  excerpt: string
  method: 'field' | 'regex' | 'ollama'
}

export interface DetectionResult {
  detected: CheckpointDetection[]
  missing: string[]
  stageAssessment: number
  method: 'deterministic' | 'hybrid'
}

// Minimal inquiry shape - only the fields the detector reads
export interface InquiryRow {
  id: string
  status: string
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  channel?: string | null
  confirmed_date?: string | null
  confirmed_guest_count?: number | null
  confirmed_location?: string | null
  confirmed_occasion?: string | null
  confirmed_budget_cents?: number | null
  confirmed_dietary_restrictions?: string | null
  confirmed_service_expectations?: string | null
  confirmed_cannabis_preference?: string | null
  source_message?: string | null
  first_response_at?: string | null
  auto_responded_at?: string | null
  converted_to_event_id?: string | null
  service_style_pref?: string | null
  budget_range?: string | null
  created_at?: string | null
  [key: string]: any // allow dynamic field access
}

// ---------------------------------------------------------------------------
// Auto-detect rule parser
// ---------------------------------------------------------------------------

interface ParsedRule {
  type: 'field_present' | 'inquiry_status' | 'event_status' | 'text_match'
  key: string
}

export function parseAutoDetectRule(rule: string): ParsedRule | null {
  const colonIdx = rule.indexOf(':')
  if (colonIdx === -1) return null
  const type = rule.substring(0, colonIdx) as ParsedRule['type']
  const key = rule.substring(colonIdx + 1)
  if (!type || !key) return null
  if (!['field_present', 'inquiry_status', 'event_status', 'text_match'].includes(type)) return null
  return { type, key }
}

// ---------------------------------------------------------------------------
// Text match patterns (hardcoded, not DB-configurable)
// Each pattern_name maps to an array of regexes. Any match = checkpoint detected.
// ---------------------------------------------------------------------------

const PATTERNS: Record<string, RegExp[]> = {
  dietary: [
    /\b(gluten[- ]?free|celiac|coeliac)\b/i,
    /\b(vegan|vegetarian|pescatarian|flexitarian)\b/i,
    /\b(nut[- ]?free|tree nut|peanut)\s*(allergy|free|restriction)/i,
    /\b(dairy[- ]?free|lactose[- ]?(?:free|intolerant))\b/i,
    /\b(halal|kosher)\b/i,
    /\b(allerg(?:y|ies|ic))\s+(?:to\s+)?(\w+)/i,
    /\b(no|can'?t eat|avoid|doesn'?t eat|intolerant to)\s+(\w+)/i,
    /\b(shellfish|soy|egg)\s*(allergy|free|restriction|intolerant)/i,
  ],
  cuisine_preference: [
    /\b(italian|french|indian|thai|japanese|mexican|mediterranean|chinese|korean|middle eastern|greek|spanish)\s*(food|cuisine|style|cooking|dishes)?\b/i,
    /\b(comfort food|farm[- ]to[- ]table|fusion|molecular|fine dining|rustic|modern|classic)\s*(cuisine|style|cooking)?\b/i,
    /\blove[sd]?\s+(\w+)\s*(food|cuisine|dishes)/i,
    /\bfavorite\s*(cuisine|food|restaurant)/i,
  ],
  service_style: [
    /\b(plated|family[- ]style|buffet|station|cocktail|canap[ée]|passed|tasting)\s*(service|dinner|style|format)?\b/i,
    /\b(sit[- ]down|standing|casual|formal)\s*(dinner|service|event)?\b/i,
  ],
  course_count: [
    /\b(\d+)[- ]?course/i,
    /\b(three|four|five|six|seven|eight|multi)[- ]?course/i,
    /\b(appetizer|starter|entr[ée]e|main|dessert|amuse)[- ]?(bouche)?\b/i,
  ],
  drinks: [
    /\b(wine|cocktail|beer|champagne|prosecco|spirits?|bartender|bar)\b/i,
    /\b(drink|beverage|pairing|sommelier)\b/i,
    /\b(byob|bring\s+(?:your\s+)?own)\b/i,
    /\bopen\s+bar\b/i,
  ],
  kitchen: [
    /\b(kitchen|oven|stove|grill|cooktop|induction|gas|electric)\b/i,
    /\b(outdoor|indoor|limited|small|no kitchen|no oven)\b/i,
    /\b(counter space|workspace|prep area|cooking area)\b/i,
  ],
  vibe: [
    /\b(romantic|intimate|lively|elegant|casual|fun|relaxed|sophisticated|cozy)\b/i,
    /\b(theme|mood|atmosphere|ambiance|decor)\b/i,
    /\b(music|candle|lighting|flowers|table[- ]?setting)\b/i,
  ],
  gratuity: [/\b(gratuity|tip|tipping)\b/i, /\b(service charge|service fee)\b/i],
  cancellation_policy: [
    /\b(cancel|cancellation)\s*(policy|terms|clause|fee)/i,
    /\b(refund|non[- ]?refundable)\b/i,
  ],
  deposit: [
    /\b(deposit|down[- ]?payment|retainer)\b/i,
    /\b(pay\s+(?:now|upfront|in advance))\b/i,
    /\b(\d+%?\s*(?:deposit|down|upfront))\b/i,
  ],
  menu_feedback: [
    /\b(looks?\s+(?:great|good|amazing|perfect|wonderful))\b/i,
    /\b(love\s+(?:the|this|that)\s*menu)\b/i,
    /\b(change|swap|replace|substitute|instead of)\b/i,
    /\b(not sure about|don'?t (?:like|want)|rather have|prefer)\b/i,
    /\b(approved?|confirm|finalize|go\s+(?:with|ahead))\b/i,
  ],
  confirmation: [
    /\b(confirm(?:ed|ation)?)\b/i,
    /\b(all\s+set|everything\s+(?:is\s+)?confirmed|good\s+to\s+go)\b/i,
    /\b(looking\s+forward|see\s+you|can'?t\s+wait)\b/i,
  ],
}

// ---------------------------------------------------------------------------
// Build lookup: checkpoint_key -> auto_detect_rule
// ---------------------------------------------------------------------------

const RULE_TO_CHECKPOINTS: Map<string, CheckpointDef[]> = new Map()

for (const cp of ALL_CHECKPOINTS) {
  if (!cp.auto_detect_rule) continue
  const existing = RULE_TO_CHECKPOINTS.get(cp.auto_detect_rule) || []
  existing.push(cp)
  RULE_TO_CHECKPOINTS.set(cp.auto_detect_rule, existing)
}

// ---------------------------------------------------------------------------
// detectFromFields - deterministic, instant, no AI
// ---------------------------------------------------------------------------

export function detectFromFields(
  inquiry: InquiryRow,
  event?: { status?: string }
): CheckpointDetection[] {
  const detections: CheckpointDetection[] = []

  for (const [rule, checkpoints] of RULE_TO_CHECKPOINTS) {
    const parsed = parseAutoDetectRule(rule)
    if (!parsed) continue

    let matched = false
    let value: any = null
    let excerpt = ''

    switch (parsed.type) {
      case 'field_present': {
        const fieldValue = inquiry[parsed.key]
        if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
          matched = true
          value = fieldValue
          excerpt = `${parsed.key}: ${String(fieldValue).substring(0, 200)}`
        }
        break
      }
      case 'inquiry_status': {
        if (inquiry.status === parsed.key) {
          matched = true
          value = inquiry.status
          excerpt = `Inquiry status: ${inquiry.status}`
        }
        break
      }
      case 'event_status': {
        if (event && event.status === parsed.key) {
          matched = true
          value = event.status
          excerpt = `Event status: ${event.status}`
        }
        break
      }
      // text_match is handled by detectFromText, not here
      case 'text_match':
        break
    }

    if (matched) {
      for (const cp of checkpoints) {
        detections.push({
          checkpoint_key: cp.checkpoint_key,
          value,
          confidence: 1.0,
          excerpt,
          method: 'field',
        })
      }
    }
  }

  return detections
}

// ---------------------------------------------------------------------------
// detectFromText - deterministic regex matching on conversation text
// ---------------------------------------------------------------------------

export function detectFromText(text: string): CheckpointDetection[] {
  if (!text || text.trim().length === 0) return []

  const detections: CheckpointDetection[] = []

  for (const [rule, checkpoints] of RULE_TO_CHECKPOINTS) {
    const parsed = parseAutoDetectRule(rule)
    if (!parsed || parsed.type !== 'text_match') continue

    const patterns = PATTERNS[parsed.key]
    if (!patterns) continue

    for (const regex of patterns) {
      const match = text.match(regex)
      if (match) {
        // Extract a snippet around the match for context
        const matchStart = match.index ?? 0
        const snippetStart = Math.max(0, matchStart - 40)
        const snippetEnd = Math.min(text.length, matchStart + match[0].length + 40)
        const excerpt = text.substring(snippetStart, snippetEnd).trim()

        for (const cp of checkpoints) {
          detections.push({
            checkpoint_key: cp.checkpoint_key,
            value: match[0],
            confidence: 0.85, // regex match = high but not certain
            excerpt,
            method: 'regex',
          })
        }
        break // one match per pattern group is enough
      }
    }
  }

  return detections
}

// ---------------------------------------------------------------------------
// detectFromConversation - Ollama-powered detection for ambiguous content
// Only runs for checkpoints not already detected by deterministic methods.
// ---------------------------------------------------------------------------

const OllamaDetectionSchema = z.object({
  detections: z.array(
    z.object({
      checkpoint_key: z.string(),
      value: z.string(),
      confidence: z.number().min(0).max(1),
      excerpt: z.string(),
    })
  ),
})

export async function detectFromConversation(
  thread: string,
  existingDetected: Set<string>,
  availableCheckpoints: CheckpointDef[]
): Promise<CheckpointDetection[]> {
  if (!thread || thread.trim().length === 0) return []

  // Only ask Ollama about checkpoints not yet detected
  const undetected = availableCheckpoints.filter(
    (cp) => !existingDetected.has(cp.checkpoint_key) && cp.auto_detect_rule
  )

  // Only look at stages 1-3 for conversation detection (most relevant)
  const relevantUndetected = undetected.filter((cp) => cp.stage_number <= 3)

  if (relevantUndetected.length === 0) return []

  const checkpointList = relevantUndetected
    .map((cp) => `- ${cp.checkpoint_key}: ${cp.checkpoint_label}`)
    .join('\n')

  const systemPrompt = `You are a data extraction assistant for a private chef booking system.
Given a conversation thread between a chef and a potential client, identify which of the following checkpoints can be confirmed from the text.

For each checkpoint you can detect, extract the relevant value and the exact text excerpt that supports it.

Only include checkpoints you are confident about (confidence >= 0.6). Do not guess or infer.

Checkpoints to look for:
${checkpointList}

Return ONLY detected checkpoints. If none are found, return an empty detections array.`

  try {
    const result = await parseWithOllama(
      systemPrompt,
      thread.substring(0, 8000), // limit input size
      OllamaDetectionSchema,
      { timeoutMs: 15000, maxTokens: 1024 }
    )

    return result.detections
      .filter((d) => d.confidence >= 0.6)
      .map((d) => ({
        checkpoint_key: d.checkpoint_key,
        value: d.value,
        confidence: d.confidence,
        excerpt: d.excerpt,
        method: 'ollama' as const,
      }))
  } catch (err) {
    // If Ollama is offline, deterministic detection already ran.
    // Don't crash the pipeline; just skip AI detection.
    if (err instanceof OllamaOfflineError) {
      console.warn('[lifecycle-detector] Ollama offline, skipping AI detection')
      return []
    }
    console.error('[lifecycle-detector] Ollama detection failed', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// runFullDetection - combined pipeline
// Fields first, then text, then AI for gaps.
// ---------------------------------------------------------------------------

export async function runFullDetection(
  inquiry: InquiryRow,
  conversationThread: string,
  event?: { status?: string }
): Promise<DetectionResult> {
  // Step 1: Deterministic field detection (instant)
  const fieldDetections = detectFromFields(inquiry, event)
  const detectedKeys = new Set(fieldDetections.map((d) => d.checkpoint_key))

  // Step 2: Deterministic text detection (instant)
  const textToAnalyze = [conversationThread, inquiry.source_message || '']
    .filter(Boolean)
    .join('\n\n')

  const textDetections = detectFromText(textToAnalyze)

  // Merge, preferring field detections (higher confidence)
  for (const td of textDetections) {
    if (!detectedKeys.has(td.checkpoint_key)) {
      detectedKeys.add(td.checkpoint_key)
    }
  }

  const allDeterministic = [...fieldDetections, ...textDetections]
  // Deduplicate by checkpoint_key, keeping highest confidence
  const deduped = deduplicateDetections(allDeterministic)
  const dedupedKeys = new Set(deduped.map((d) => d.checkpoint_key))

  // Step 3: Ollama for gaps (only if there's conversation text)
  let aiDetections: CheckpointDetection[] = []
  let method: 'deterministic' | 'hybrid' = 'deterministic'

  if (textToAnalyze.trim().length > 50) {
    aiDetections = await detectFromConversation(textToAnalyze, dedupedKeys, ALL_CHECKPOINTS)
    if (aiDetections.length > 0) {
      method = 'hybrid'
    }
  }

  const allDetected = [...deduped, ...aiDetections]

  // Compute what's still missing (required checkpoints in stages 1-3)
  const allDetectedKeys = new Set(allDetected.map((d) => d.checkpoint_key))
  const missing = ALL_CHECKPOINTS.filter(
    (cp) => cp.is_required && cp.stage_number <= 3 && !allDetectedKeys.has(cp.checkpoint_key)
  ).map((cp) => cp.checkpoint_key)

  // Assess current stage based on highest stage with any detection
  const stageAssessment = assessCurrentStage(allDetected)

  return {
    detected: allDetected,
    missing,
    stageAssessment,
    method,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deduplicateDetections(detections: CheckpointDetection[]): CheckpointDetection[] {
  const byKey = new Map<string, CheckpointDetection>()
  for (const d of detections) {
    const existing = byKey.get(d.checkpoint_key)
    if (!existing || d.confidence > existing.confidence) {
      byKey.set(d.checkpoint_key, d)
    }
  }
  return Array.from(byKey.values())
}

function assessCurrentStage(detections: CheckpointDetection[]): number {
  if (detections.length === 0) return 1

  // Find the highest stage number that has at least one detection
  let maxStage = 1
  for (const d of detections) {
    // Parse stage from checkpoint_key (s1_xxx -> 1, s2_xxx -> 2, etc.)
    const match = d.checkpoint_key.match(/^s(\d+)_/)
    if (match) {
      const stage = parseInt(match[1], 10)
      if (stage > maxStage) maxStage = stage
    }
  }

  return maxStage
}
