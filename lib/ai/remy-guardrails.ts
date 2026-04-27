// Remy - Guardrails & Safety Layer
// No 'use server' - exports constants and pure functions.
// Imported by remy-actions.ts, remy-abuse-actions.ts, remy-memory-actions.ts, and remy-drawer.tsx.

// ─── Constants ──────────────────────────────────────────────────────────────

export const REMY_MAX_MESSAGE_LENGTH = 8000
export const REMY_MAX_MEMORY_LENGTH = 500
export const REMY_RATE_LIMIT_MAX = 30 // messages per window
export const REMY_RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute

// ─── Result Type ────────────────────────────────────────────────────────────

export interface GuardrailResult {
  allowed: boolean
  /** Remy-voiced refusal message (only present when allowed=false) */
  refusal?: string
  /** Severity for abuse logging (only present when blocked) */
  severity?: 'warning' | 'critical'
  /** Category of the violation */
  category?: string
  /** Which pattern matched (for audit trail) */
  matchedPattern?: string
}

// ─── Input Validation (main entry point) ────────────────────────────────────

/**
 * Validates user input BEFORE any LLM call.
 * Returns { allowed: true } if clean, or a Remy-voiced rejection with severity metadata.
 */
export function validateRemyInput(message: string): GuardrailResult {
  const trimmed = message.trim()

  // 1. Empty / whitespace-only
  if (!trimmed) {
    return {
      allowed: false,
      refusal: "Empty ticket, chef - nothing on it 📝 What's on your mind?",
    }
  }

  // 2. Length check
  if (trimmed.length > REMY_MAX_MESSAGE_LENGTH) {
    return {
      allowed: false,
      refusal: `That message is ${trimmed.length.toLocaleString()} characters - I max out at ${REMY_MAX_MESSAGE_LENGTH.toLocaleString()}. Try breaking it into smaller pieces, or give me the highlights.`,
    }
  }

  // 3. Dangerous content (CRITICAL - bombs, weapons, violence, drugs, self-harm)
  const dangerousCheck = detectDangerousContent(trimmed)
  if (dangerousCheck) {
    return {
      allowed: false,
      refusal:
        "Hard no on that one, chef. That's been flagged. Let's get back to the kitchen - what do you need on the business side? 🔪",
      severity: 'critical',
      category: 'dangerous_content',
      matchedPattern: dangerousCheck,
    }
  }

  // 4. Abuse / harassment (CRITICAL - slurs, threats, sexual harassment)
  const abuseCheck = detectAbusiveContent(trimmed)
  if (abuseCheck) {
    return {
      allowed: false,
      refusal:
        "Not touching that - and it's been flagged. I'm here to help you run a killer business, not for that. What's cooking? 👨‍🍳",
      severity: 'critical',
      category: 'abuse',
      matchedPattern: abuseCheck,
    }
  }

  // 5. Prompt injection (WARNING - jailbreaks, system prompt extraction)
  const injectionCheck = detectPromptInjection(trimmed)
  if (injectionCheck) {
    return {
      allowed: false,
      refusal:
        "Ha - nice try, chef. I've had tougher tickets come in on a Friday night 😄 I'm Remy, your kitchen business partner. What can I actually help with?",
      severity: 'warning',
      category: 'prompt_injection',
      matchedPattern: injectionCheck,
    }
  }

  return { allowed: true }
}

// ─── Dangerous Content Detection ────────────────────────────────────────────
// All patterns imported from the unified registry

import {
  HARMFUL_CONTENT_PATTERNS as _ALL_HARMFUL,
  ABUSE_HARASSMENT_PATTERNS as _ABUSE_PATTERNS,
  PROMPT_INJECTION_PATTERNS,
} from './remy-pattern-registry'

// Guardrails dangerous content = harmful patterns MINUS slurs, personal threats,
// sexual harassment, and self-harm encouragement (those are handled by abuse detection).
// This preserves the original guardrails layering where self-harm queries pass through
// to receive a compassionate response downstream.
const GUARDRAIL_DANGER_LABELS = new Set([
  'slurs',
  'personal_threat',
  'sexual_harassment',
  'sexual_assault_intent',
  'self_harm_encouragement',
])
const _DANGEROUS_PATTERNS = _ALL_HARMFUL.filter((p) => !GUARDRAIL_DANGER_LABELS.has(p.label))

function detectDangerousContent(message: string): string | null {
  for (const { pattern, label } of _DANGEROUS_PATTERNS) {
    if (pattern.test(message)) return label
  }
  return null
}

// ─── Abuse / Harassment Detection ───────────────────────────────────────────
// Only clearly abusive terms - not mild profanity a chef might use while frustrated.

function detectAbusiveContent(message: string): string | null {
  for (const { pattern, label } of _ABUSE_PATTERNS) {
    if (pattern.test(message)) return label
  }
  return null
}

// ─── Prompt Injection Detection ─────────────────────────────────────────────

function detectPromptInjection(message: string): string | null {
  for (const { pattern, label } of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(message)) return label
  }
  return null
}

// ─── Memory Content Validation ──────────────────────────────────────────────

export function validateMemoryContent(content: string): GuardrailResult {
  const trimmed = content.trim()

  // 1. Length
  if (trimmed.length > REMY_MAX_MEMORY_LENGTH) {
    return {
      allowed: false,
      refusal: `That's a bit long for a memory (${trimmed.length} chars). Keep it under ${REMY_MAX_MEMORY_LENGTH} - short and factual, like "Mrs. Chen has a severe nut allergy."`,
    }
  }

  // 2. Contains URLs (potential poisoning vector)
  if (/https?:\/\/\S+/i.test(trimmed)) {
    return {
      allowed: false,
      refusal:
        "I don't store URLs in memory - too easy to get phished. Tell me the fact itself instead.",
    }
  }

  // 3. Contains code-like content (injection via memory context)
  if (
    /[{}<>].*[{}<>]|function\s*\(|=>\s*\{|import\s+|require\s*\(|SELECT\s+|INSERT\s+|DROP\s+|DELETE\s+FROM/i.test(
      trimmed
    )
  ) {
    return {
      allowed: false,
      refusal:
        'That looks like code, not a business fact. I store things like preferences, client details, and pricing rules - not scripts.',
    }
  }

  // 4. Business relevance check (keyword heuristic - no LLM call)
  if (!looksBusinessRelevant(trimmed)) {
    return {
      allowed: false,
      refusal:
        "That doesn't sound like something related to your chef business. I remember things like client preferences, pricing rules, scheduling patterns, and culinary notes. Try something along those lines.",
    }
  }

  return { allowed: true }
}

// ─── Business Relevance Heuristic ───────────────────────────────────────────

const BUSINESS_KEYWORDS: RegExp[] = [
  // People & relationships
  /\b(client|customer|guest|host|they|their|he|she|his|her|husband|wife|kid|family|party|group)\b/i,
  // Food & culinary
  /\b(cook|recipe|dish|ingredient|menu|food|meal|dinner|lunch|brunch|tasting|dessert|appetizer|entr[eé]e|course|prep|sauce|braise|sear|grill|organic|vegan|vegetarian|gluten|allergy|allergic|dairy|kosher|halal|pescatarian|keto|paleo|sous\s+vide|smoked?|roast|bake)\b/i,
  // Business ops
  /\b(price|charge|cost|rate|margin|quote|invoice|payment|deposit|tip|gratuity|revenue|expense|profit|budget|fee)\b/i,
  // Scheduling
  /\b(schedule|book|event|calendar|saturday|sunday|monday|tuesday|wednesday|thursday|friday|morning|evening|day.?off|availability|season|holiday|week|month)\b/i,
  // Communication
  /\b(email|draft|message|write|tone|formal|casual|follow.?up|proposal|contract|letter)\b/i,
  // Rules & preferences
  /\b(never|always|rule|policy|require|prefer|standard|default|minimum|maximum|only|avoid)\b/i,
  // Staff & logistics
  /\b(staff|assistant|sous|server|bartender|kitchen|setup|equipment|transport|delivery|vendor|supplier|market|farmer)\b/i,
  // General business terms
  /\b(workflow|process|system|template|brand|portfolio|review|referral|loyalty|goal|business|work)\b/i,
]

function looksBusinessRelevant(content: string): boolean {
  return BUSINESS_KEYWORDS.some((p) => p.test(content))
}

// ─── Rate Limiter (in-memory fast path + DB persistence) ───────────────────

import { pgClient as sql } from '@/lib/db'

interface RateBucket {
  timestamps: number[]
}

const rateBuckets = new Map<string, RateBucket>()
let dbCheckCounter = 0

/**
 * Check if a tenant has exceeded the message rate limit.
 * Uses in-memory cache as fast path; DB as durable store that survives restarts.
 * Call with tenantId from authenticated session, never from user input.
 */
export async function checkRemyRateLimit(tenantId: string): Promise<GuardrailResult> {
  const now = Date.now()
  const windowStart = now - REMY_RATE_LIMIT_WINDOW_MS

  let bucket = rateBuckets.get(tenantId)

  // If no in-memory bucket, try loading from DB (cold start / after restart)
  if (!bucket) {
    bucket = { timestamps: [] }
    rateBuckets.set(tenantId, bucket)

    try {
      const windowStartDate = new Date(windowStart).toISOString()
      const rows = await sql`
        SELECT message_count FROM remy_rate_limits
        WHERE tenant_id = ${tenantId}
          AND window_start > ${windowStartDate}::timestamptz
        ORDER BY window_start DESC
        LIMIT 1
      `
      if (rows.length > 0 && rows[0].message_count > 0) {
        // Seed in-memory bucket with approximate timestamps
        const count = rows[0].message_count as number
        for (let i = 0; i < count; i++) {
          bucket.timestamps.push(now - (count - i) * 100)
        }
      }
    } catch (err) {
      // DB unavailable: fall back to in-memory only
      console.error('[remy-rate-limit] DB read failed, using memory-only:', err)
    }
  }

  // Prune old entries
  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart)

  if (bucket.timestamps.length >= REMY_RATE_LIMIT_MAX) {
    const oldestInWindow = bucket.timestamps[0]
    const waitSeconds = Math.ceil((oldestInWindow + REMY_RATE_LIMIT_WINDOW_MS - now) / 1000)
    return {
      allowed: false,
      refusal: `Whoa, slow down chef - I can only handle ${REMY_RATE_LIMIT_MAX} messages a minute. Give me about ${waitSeconds} seconds and try again.`,
    }
  }

  bucket.timestamps.push(now)

  // Non-blocking DB write (fire and forget)
  const windowKey = new Date(now - (now % REMY_RATE_LIMIT_WINDOW_MS)).toISOString()
  sql`
    INSERT INTO remy_rate_limits (tenant_id, window_start, message_count)
    VALUES (${tenantId}, ${windowKey}::timestamptz, 1)
    ON CONFLICT (tenant_id, window_start)
    DO UPDATE SET message_count = remy_rate_limits.message_count + 1
  `.catch((err: unknown) => {
    console.error('[remy-rate-limit] DB write failed:', err)
  })

  // Periodic DB cleanup (every 100 checks)
  dbCheckCounter++
  if (dbCheckCounter % 100 === 0) {
    sql`DELETE FROM remy_rate_limits WHERE window_start < NOW() - INTERVAL '1 hour'`.catch(() => {})
  }

  return { allowed: true }
}

// ─── Periodic Cleanup (prevents unbounded memory on long-running server) ──���

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cutoff = Date.now() - REMY_RATE_LIMIT_WINDOW_MS * 2
    for (const [key, bucket] of rateBuckets) {
      bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff)
      if (bucket.timestamps.length === 0) {
        rateBuckets.delete(key)
      }
    }
  }, CLEANUP_INTERVAL_MS)
}
