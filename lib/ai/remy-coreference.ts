// Remy — Coreference Resolution (Phase 3A)
// Deterministic entity tracker for conversational follow-ups.
// Tracks entities mentioned across conversation turns so pronouns
// like "her", "it", "that event" resolve correctly.
// NO LLM — pure regex + entity matching.

import type { RemyMessage } from '@/lib/ai/remy-types'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TrackedEntity {
  type: 'client' | 'event' | 'inquiry' | 'recipe' | 'invoice'
  name: string
  /** When this entity was last referenced (turn index) */
  lastMentionedTurn: number
}

export interface EntityContext {
  entities: TrackedEntity[]
  /** Max entities to track (oldest get evicted) */
  maxEntities: number
}

// ─── Entity Extraction ──────────────────────────────────────────────────────

// Patterns to extract entity references from Remy's responses
const ENTITY_PATTERNS: Array<{
  type: TrackedEntity['type']
  patterns: RegExp[]
}> = [
  {
    type: 'client',
    patterns: [
      // "Sarah Henderson", "the Henderson event" -> Henderson
      /(?:for|about|from|to|with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g,
      // "Client: Sarah Henderson"
      /client[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
    ],
  },
  {
    type: 'event',
    patterns: [
      // "Spring Garden Party", "Wedding Reception"
      /(?:event|occasion)[:\s]+["']?([A-Z][^"'\n,]{3,40})["']?/gi,
      // "the Garden Party", "Morrison Wedding"
      /(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Party|Wedding|Dinner|Brunch|Luncheon|Reception|Gala|Ceremony|Celebration|Event|Gathering))/g,
    ],
  },
  {
    type: 'inquiry',
    patterns: [
      /inquiry\s+from\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      /lead[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    ],
  },
]

/**
 * Extract entity references from a message (either user or Remy).
 * Returns entities found in the text.
 */
export function extractEntities(text: string, turnIndex: number): TrackedEntity[] {
  const found: TrackedEntity[] = []
  const seen = new Set<string>()

  for (const { type, patterns } of ENTITY_PATTERNS) {
    for (const pattern of patterns) {
      // Reset lastIndex for global regexes
      pattern.lastIndex = 0
      let match
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1]?.trim()
        if (!name || name.length < 3 || name.length > 50) continue
        // Skip common false positives
        if (SKIP_NAMES.has(name.toLowerCase())) continue
        const key = `${type}:${name.toLowerCase()}`
        if (seen.has(key)) continue
        seen.add(key)
        found.push({ type, name, lastMentionedTurn: turnIndex })
      }
    }
  }

  return found
}

const SKIP_NAMES = new Set([
  'remy',
  'chef',
  'chefflow',
  'unknown',
  'the event',
  'the client',
  'good morning',
  'good afternoon',
  'good evening',
  'hey chef',
  'let me',
  'i can',
  'you have',
  'here are',
  'no problem',
])

// ─── Pronoun Resolution ─────────────────────────────────────────────────────

interface PronounMatch {
  pronoun: string
  gender: 'female' | 'male' | 'neutral' | 'any'
  entityType: TrackedEntity['type'] | 'any'
}

const PRONOUN_PATTERNS: Array<{ pattern: RegExp; match: Omit<PronounMatch, 'pronoun'> }> = [
  // Female pronouns -> client
  { pattern: /\b(?:her|she|she's)\b/i, match: { gender: 'female', entityType: 'client' } },
  // Male pronouns -> client
  { pattern: /\b(?:his|he|he's|him)\b/i, match: { gender: 'male', entityType: 'client' } },
  // Neutral pronouns -> any
  {
    pattern: /\b(?:them|they|they're|their)\b/i,
    match: { gender: 'neutral', entityType: 'client' },
  },
  // "it" / "that" -> event or inquiry (most recent non-client entity)
  { pattern: /\bthat\s+event\b/i, match: { gender: 'any', entityType: 'event' } },
  { pattern: /\bthat\s+inquiry\b/i, match: { gender: 'any', entityType: 'inquiry' } },
  { pattern: /\bthat\s+(?:recipe|dish)\b/i, match: { gender: 'any', entityType: 'recipe' } },
  // "the payment status" / "the menu" -> resolves to most recent event context
  {
    pattern: /\bthe\s+(?:payment|deposit|invoice|balance)\b/i,
    match: { gender: 'any', entityType: 'event' },
  },
  {
    pattern: /\bthe\s+(?:menu|prep\s+list|grocery\s+list|timeline)\b/i,
    match: { gender: 'any', entityType: 'event' },
  },
]

/**
 * Check if a message contains unresolved references (pronouns or "that X").
 * Returns an enriched version of the message with context injected,
 * or null if no resolution is needed/possible.
 */
export function resolveReferences(message: string, entityContext: EntityContext): string | null {
  if (entityContext.entities.length === 0) return null

  const resolutions: string[] = []

  for (const { pattern, match } of PRONOUN_PATTERNS) {
    if (!pattern.test(message)) continue

    // Find the most recently mentioned entity of the right type
    const candidates = entityContext.entities
      .filter((e) => match.entityType === 'any' || e.type === match.entityType)
      .sort((a, b) => b.lastMentionedTurn - a.lastMentionedTurn)

    if (candidates.length > 0) {
      const entity = candidates[0]
      resolutions.push(`[Context: "${entity.type}" refers to ${entity.name}]`)
    }
  }

  if (resolutions.length === 0) return null

  // Prepend resolution context to the message
  return `${resolutions.join(' ')} ${message}`
}

// ─── Entity Context Management ──────────────────────────────────────────────

/**
 * Create a fresh entity context.
 */
export function createEntityContext(maxEntities = 10): EntityContext {
  return { entities: [], maxEntities }
}

/**
 * Update entity context with entities from a new message.
 * Merges new entities, updates turn indexes for re-mentions,
 * and evicts oldest if over capacity.
 */
export function updateEntityContext(
  ctx: EntityContext,
  newEntities: TrackedEntity[]
): EntityContext {
  const updated = [...ctx.entities]

  for (const entity of newEntities) {
    const existing = updated.find(
      (e) => e.type === entity.type && e.name.toLowerCase() === entity.name.toLowerCase()
    )
    if (existing) {
      // Update turn index for re-mention
      existing.lastMentionedTurn = entity.lastMentionedTurn
    } else {
      updated.push(entity)
    }
  }

  // Evict oldest if over capacity
  if (updated.length > ctx.maxEntities) {
    updated.sort((a, b) => b.lastMentionedTurn - a.lastMentionedTurn)
    updated.length = ctx.maxEntities
  }

  return { ...ctx, entities: updated }
}

/**
 * Build entity context from a conversation's message history.
 * Call this when loading an existing conversation to reconstruct entity state.
 */
export function buildEntityContextFromHistory(messages: RemyMessage[]): EntityContext {
  let ctx = createEntityContext()

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const entities = extractEntities(msg.content, i)
    ctx = updateEntityContext(ctx, entities)
  }

  return ctx
}
