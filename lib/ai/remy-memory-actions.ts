'use server'

// Remy Memory System — extract, store, load, and manage persistent memories
// PRIVACY: Memories contain distilled client insights — must stay local via Ollama.

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { dispatchPrivate } from '@/lib/ai/dispatch'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { createHash } from 'crypto'
import { validateMemoryContent } from '@/lib/ai/remy-guardrails'
import type { RemyMemory, MemoryCategory } from '@/lib/ai/remy-memory-types'

// ─── Extraction Schema ─────────────────────────────────────────────────────

const ExtractedMemorySchema = z.object({
  memories: z.array(
    z.object({
      content: z.string().describe('A concise, factual statement about what was learned'),
      category: z.enum([
        'chef_preference',
        'client_insight',
        'business_rule',
        'communication_style',
        'culinary_note',
        'scheduling_pattern',
        'pricing_pattern',
        'workflow_preference',
      ]),
      importance: z
        .number()
        .min(1)
        .max(10)
        .describe('1=trivial, 10=critical (allergies, hard rules)'),
      relatedClientName: z
        .string()
        .optional()
        .describe('Client name if this memory is about a specific client'),
    })
  ),
})

const EXTRACTION_PROMPT = `You are a memory extraction system for a private chef's AI assistant.
Given a conversation between a chef and their AI assistant, extract any NEW facts, preferences, or insights worth remembering for future conversations.

EXTRACT memories when:
- The chef states a preference ("I always use organic produce")
- A client insight is revealed ("they're vegetarian", "she has a nut allergy")
- A business rule is established ("Never double-book Saturdays")
- A pricing decision is made ("I charge $150/person for tasting menus")
- A scheduling pattern emerges ("I prefer shopping the day before")
- A communication style is noted ("Keep emails to clients short and warm")
- A culinary note is shared ("My signature is the braised short ribs")

DO NOT extract:
- Generic conversational filler ("Thanks!" / "Got it")
- Information the assistant provided (only extract what the CHEF said/revealed)
- Temporary one-time facts ("I'm running late today")
- Overly specific transient details ("I need to buy 3 lbs of butter today")

For importance scoring:
- 10: Safety-critical (allergies, dietary restrictions, medical needs)
- 7-9: Core business rules, key client relationship facts
- 4-6: Preferences, patterns, style notes
- 1-3: Minor observations, one-time mentions

Return JSON: { "memories": [...] }
If there are NO new memories to extract, return: { "memories": [] }`

const MEMORY_EXTRACTION_RETRY_DELAYS_MS = [0, 1200]
const MEMORY_RETRIEVAL_LIMIT = 80
const MEMORY_CONTEXT_LIMIT = 30
const MEMORY_MIN_RETRIEVAL_SCORE = 36
const MEMORY_STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'have',
  'how',
  'i',
  'if',
  'in',
  'is',
  'it',
  'me',
  'my',
  'of',
  'on',
  'or',
  'our',
  'please',
  'the',
  'their',
  'them',
  'there',
  'they',
  'this',
  'to',
  'we',
  'what',
  'when',
  'where',
  'who',
  'why',
  'with',
  'would',
  'you',
  'your',
])

// ─── Extract & Save Memories (background, non-blocking) ────────────────────

export async function extractAndSaveMemories(
  userMessage: string,
  _remyResponse?: string,
  sourceArtifactId?: string
): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  // SAFETY: Only extract from the chef's message — never from Remy's response.
  // If Remy hallucinates, we must not save that hallucination as a "real" memory.
  // The extraction prompt says "only extract what the CHEF said" but LLMs aren't
  // perfect — the safest approach is to never show them Remy's text at all.

  try {
    const result = await parseWithMemoryRetries(
      'extraction',
      EXTRACTION_PROMPT,
      `CHEF: ${userMessage}`,
      ExtractedMemorySchema,
      { modelTier: 'fast', cache: false, taskType: 'extraction' }
    )

    if (!result.memories || result.memories.length === 0) return

    const supabase: any = createServerClient()

    for (const mem of result.memories) {
      // Validate extracted memory content before saving
      const memCheck = validateMemoryContent(mem.content)
      if (!memCheck.allowed) {
        console.warn(`[remy-memory] Skipping invalid extracted memory: ${mem.content.slice(0, 80)}`)
        continue
      }

      // Resolve client ID if a client name was mentioned
      const relatedClientId = mem.relatedClientName
        ? await resolveClientIdByName(supabase, tenantId, mem.relatedClientName)
        : null

      // GUARD: If this is a client_insight but the client doesn't exist in DB,
      // skip saving — it's likely a hallucinated or misheard name.
      if (mem.category === 'client_insight' && mem.relatedClientName && !relatedClientId) {
        console.warn(
          `[remy-memory] Skipping client_insight for unknown client "${mem.relatedClientName}"`
        )
        continue
      }

      await saveOrReinforceMemory(supabase, {
        tenantId,
        category: mem.category,
        content: mem.content,
        importance: mem.importance,
        relatedClientId,
        sourceArtifactId: sourceArtifactId ?? null,
        sourceMessage: userMessage,
      })
    }
  } catch (err) {
    // Non-blocking — never throw. Memory extraction failure must not affect the user.
    if (err instanceof OllamaOfflineError) {
      console.warn('[remy-memory] Ollama offline — skipping memory extraction')
      return
    }
    console.error('[remy-memory] Memory extraction failed:', err)
  }
}

// ─── Correction-Aware Memory (Formula > AI) ──────────────────────────────
// Detects when a chef corrects Remy ("no, Sarah is allergic to shellfish, not tree nuts")
// and automatically deactivates the old wrong memory + saves the corrected version.

const CORRECTION_PATTERNS: RegExp[] = [
  /^no[,.]?\s+(actually|it'?s|she|he|they|that'?s|the|sarah|mike|lisa|dave|james)/i,
  /^(actually|correction|wait)[,.]?\s/i,
  /^that'?s (wrong|incorrect|not right|not true)/i,
  /^(i said|i meant|i mean|what i meant)\b/i,
  /not\s+(\w+)[,.]?\s*(it'?s|she'?s|he'?s|they'?re|it is|she is|he is)\s+/i,
  /^(wrong|nope|incorrect)[,.]?\s/i,
]

function detectsCorrection(message: string): boolean {
  const trimmed = message.trim()
  return CORRECTION_PATTERNS.some((p) => p.test(trimmed))
}

export async function handleCorrectionMemory(
  userMessage: string
): Promise<{ corrected: boolean; deactivated?: string; created?: string }> {
  if (!detectsCorrection(userMessage)) {
    return { corrected: false }
  }

  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  try {
    // Use Ollama to understand what's being corrected and what the new fact is
    const CorrectionSchema = z.object({
      oldFact: z.string().describe('The incorrect fact being corrected (what was wrong)'),
      newFact: z.string().describe('The corrected fact (what is actually true)'),
      category: z.enum([
        'chef_preference',
        'client_insight',
        'business_rule',
        'communication_style',
        'culinary_note',
        'scheduling_pattern',
        'pricing_pattern',
        'workflow_preference',
      ]),
      importance: z.number().min(1).max(10),
      relatedClientName: z.string().optional(),
    })

    const result = await parseWithMemoryRetries(
      'correction',
      `You are a correction parser. The chef is correcting something they or their AI assistant previously said.
Extract what was WRONG (the old fact) and what is CORRECT (the new fact).
Return JSON: { "oldFact": "...", "newFact": "...", "category": "...", "importance": 1-10, "relatedClientName": "..." }
If you can't determine a clear correction, return: { "oldFact": "", "newFact": "", "category": "chef_preference", "importance": 1 }`,
      `Chef says: "${userMessage}"`,
      CorrectionSchema,
      { modelTier: 'fast', cache: false, taskType: 'extraction' }
    )

    // If parsing couldn't extract a meaningful correction, bail
    if (!result.oldFact || !result.newFact) {
      return { corrected: false }
    }

    // Search for existing memories that match the OLD (wrong) fact
    const relatedClientId = result.relatedClientName
      ? await resolveClientIdByName(supabase, tenantId, result.relatedClientName)
      : null

    const { data: candidates } = await supabase
      .from('remy_memories')
      .select('id, content, category, related_client_id, importance, last_accessed_at')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(80)

    let bestMatch: { id: string; content: string; score: number } | null = null

    for (const row of candidates ?? []) {
      const score = scoreCorrectionCandidate(
        row as Record<string, unknown>,
        result.oldFact,
        result.newFact,
        result.category,
        relatedClientId
      )
      if (score >= 32 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { id: row.id as string, content: row.content as string, score }
      }
    }

    // Deactivate the old wrong memory if found
    let deactivatedId: string | undefined
    if (bestMatch) {
      await supabase
        .from('remy_memories')
        .update({ is_active: false })
        .eq('id', bestMatch.id)
        .eq('tenant_id', tenantId)
      deactivatedId = bestMatch.id
      console.log(`[remy-memory] Deactivated corrected memory: "${bestMatch.content}"`)
    }

    const newMem = await saveOrReinforceMemory(supabase, {
      tenantId,
      category: result.category,
      content: result.newFact,
      importance: result.importance,
      relatedClientId,
      sourceMessage: userMessage,
    })

    console.log(`[remy-memory] Saved corrected memory: "${result.newFact}"`)

    return {
      corrected: true,
      deactivated: deactivatedId,
      created: newMem.id,
    }
  } catch (err) {
    if (err instanceof OllamaOfflineError) {
      console.warn('[remy-memory] Ollama offline — skipping correction detection')
      return { corrected: false }
    }
    console.error('[remy-memory] Correction detection failed:', err)
    return { corrected: false }
  }
}

// ─── Load Relevant Memories ────────────────────────────────────────────────

export async function loadRelevantMemories(
  currentMessage: string,
  intentCategory?: string,
  mentionedClientName?: string
): Promise<RemyMemory[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const relatedClientId = mentionedClientName
    ? await resolveClientIdByName(supabase, tenantId, mentionedClientName)
    : null
  const preferredCategories = getPreferredMemoryCategories(intentCategory, currentMessage)
  const messageKeywords = extractMemoryKeywords(currentMessage)

  const { data, error } = await supabase
    .from('remy_memories')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('importance', { ascending: false })
    .order('last_accessed_at', { ascending: false })
    .limit(MEMORY_RETRIEVAL_LIMIT)

  if (error) {
    console.error('[remy-memory] Failed to load memories:', error.message)
    return []
  }

  const scoredEntries: Array<{ row: Record<string, unknown>; score: number }> = (data ?? []).map(
    (row: Record<string, unknown>) => ({
      row,
      score: scoreMemoryForRetrieval(
        row,
        currentMessage,
        messageKeywords,
        preferredCategories,
        relatedClientId
      ),
    })
  )

  const capped = scoredEntries
    .filter((entry: { row: Record<string, unknown>; score: number }) => {
      return entry.score >= MEMORY_MIN_RETRIEVAL_SCORE
    })
    .sort(
      (
        a: { row: Record<string, unknown>; score: number },
        b: { row: Record<string, unknown>; score: number }
      ) => b.score - a.score
    )
    .slice(0, MEMORY_CONTEXT_LIMIT)
    .map((entry: { row: Record<string, unknown>; score: number }) => mapRowToMemory(entry.row))

  // Bump last_accessed_at for all loaded memories (non-blocking)
  const loadedIds = capped.map((m: RemyMemory) => m.id)
  if (loadedIds.length > 0) {
    supabase
      .from('remy_memories')
      .update({ last_accessed_at: new Date().toISOString() })
      .in('id', loadedIds)
      .then(() => {})
      .catch((err: any) => console.error('[remy-memory] Failed to bump access:', err))
  }

  return capped
}

// ─── Delete Memory ─────────────────────────────────────────────────────────

export async function deleteRemyMemory(memoryId: string): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('remy_memories')
    .update({ is_active: false })
    .eq('id', memoryId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to delete memory: ${error.message}`)
}

// ─── List Memories (for UI / admin view) ───────────────────────────────────

export async function listRemyMemories(options?: {
  category?: MemoryCategory
  limit?: number
}): Promise<RemyMemory[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  let query = supabase
    .from('remy_memories')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('importance', { ascending: false })
    .order('last_accessed_at', { ascending: false })
    .limit(options?.limit ?? 100)

  if (options?.category) {
    query = query.eq('category', options.category)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to list memories: ${error.message}`)

  return (data ?? []).map(mapRowToMemory)
}

// ─── Decay Stale Memories ──────────────────────────────────────────────────

export async function decayStaleMemories(): Promise<{ deactivated: number }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Memories not accessed in 90 days with low importance get deactivated
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)

  const { data, error } = await supabase
    .from('remy_memories')
    .update({ is_active: false })
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .lt('importance', 5)
    .lt('last_accessed_at', cutoff.toISOString())
    .lt('access_count', 3)
    .select('id')

  if (error) {
    console.error('[remy-memory] Decay failed:', error)
    return { deactivated: 0 }
  }

  return { deactivated: data?.length ?? 0 }
}

// ─── Add Memory Manually ──────────────────────────────────────────────────

export async function addRemyMemoryManual(input: {
  content: string
  category: MemoryCategory
  importance?: number
}): Promise<{ id: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()
  return saveOrReinforceMemory(supabase, {
    tenantId,
    category: input.category,
    content: input.content,
    importance: input.importance,
    sourceMessage: 'Manually added by chef',
  })
}

export async function detectDraftFeedback(
  userMessage: string,
  previousTasks: Array<{ taskType?: string | null }>
): Promise<{ learned: boolean; content?: string }> {
  const lower = userMessage.trim().toLowerCase()
  if (!lower) return { learned: false }

  const cameFromDraft =
    previousTasks?.some((task) => {
      const taskType = String(task?.taskType ?? '')
      return taskType.startsWith('draft.') || taskType.startsWith('email.')
    }) ?? false

  if (!cameFromDraft) return { learned: false }

  let content: string | null = null

  if (/\b(shorter|more concise|less wordy|too long)\b/i.test(lower)) {
    content =
      'Keep client-facing drafts shorter and more concise when the chef gives style feedback.'
  } else if (/\b(more formal|more professional)\b/i.test(lower)) {
    content = 'Use a more formal, professional tone in client-facing drafts when requested.'
  } else if (/\b(more casual|less formal|warmer|friendlier)\b/i.test(lower)) {
    content = 'Use a warmer, more casual tone in client-facing drafts when requested.'
  } else if (/\b(more direct|be direct|less fluffy)\b/i.test(lower)) {
    content = 'Keep client-facing drafts direct and avoid unnecessary filler when requested.'
  }

  if (!content) return { learned: false }

  try {
    await addRemyMemoryManual({
      content,
      category: 'communication_style',
      importance: 6,
    })
    return { learned: true, content }
  } catch (err) {
    console.warn('[remy-memory] Draft feedback learning failed:', err)
    return { learned: false }
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function parseWithMemoryRetries<T>(
  label: 'extraction' | 'correction',
  systemPrompt: string,
  userContent: string,
  schema: z.ZodType<T>,
  options?: Partial<import('@/lib/ai/dispatch').DispatchOptions<T>>
): Promise<T> {
  let lastError: unknown = null

  for (const [attemptIndex, delayMs] of MEMORY_EXTRACTION_RETRY_DELAYS_MS.entries()) {
    if (delayMs > 0) {
      await wait(delayMs)
    }

    try {
      return (await dispatchPrivate(systemPrompt, userContent, schema, options)).result
    } catch (err) {
      if (err instanceof OllamaOfflineError) throw err
      lastError = err
      console.warn(
        `[remy-memory] ${label} attempt ${attemptIndex + 1}/${MEMORY_EXTRACTION_RETRY_DELAYS_MS.length} failed:`,
        err instanceof Error ? err.message : err
      )
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Memory ${label} failed`)
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function resolveClientIdByName(
  supabase: any,
  tenantId: string,
  clientName: string
): Promise<string | null> {
  const normalizedName = clientName.trim()
  if (!normalizedName) return null

  const { data: clients } = await supabase
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('full_name', `%${normalizedName}%`)
    .limit(1)

  return (clients?.[0]?.id as string) ?? null
}

async function saveOrReinforceMemory(
  supabase: any,
  payload: {
    tenantId: string
    category: MemoryCategory
    content: string
    importance?: number
    relatedClientId?: string | null
    sourceArtifactId?: string | null
    sourceMessage?: string | null
  }
): Promise<{ id: string }> {
  const contentHash = hashContent(payload.content)
  const importance = getDeterministicImportance(
    payload.content,
    payload.category,
    payload.importance
  )

  const { data: existing } = await supabase
    .from('remy_memories')
    .select('id, access_count, importance')
    .eq('tenant_id', payload.tenantId)
    .eq('content_hash', contentHash)
    .eq('is_active', true)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('remy_memories')
      .update({
        access_count: (existing.access_count as number) + 1,
        importance: Math.max(existing.importance as number, importance),
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    return { id: existing.id as string }
  }

  const { data, error } = await supabase
    .from('remy_memories')
    .insert({
      tenant_id: payload.tenantId,
      category: payload.category,
      content: payload.content.trim(),
      importance,
      content_hash: contentHash,
      related_client_id: payload.relatedClientId ?? null,
      source_artifact_id: payload.sourceArtifactId ?? null,
      source_message: payload.sourceMessage ?? null,
    })
    .select('id')
    .single()

  if (error) {
    const duplicateLike = error.code === '23505' || /duplicate key/i.test(error.message)
    if (duplicateLike) {
      const { data: duplicate } = await supabase
        .from('remy_memories')
        .select('id, access_count')
        .eq('tenant_id', payload.tenantId)
        .eq('content_hash', contentHash)
        .eq('is_active', true)
        .maybeSingle()

      if (duplicate?.id) {
        await supabase
          .from('remy_memories')
          .update({
            access_count: Number(duplicate.access_count ?? 1) + 1,
            last_accessed_at: new Date().toISOString(),
          })
          .eq('id', duplicate.id)
        return { id: duplicate.id as string }
      }
    }
    throw new Error(`Failed to save memory: ${error.message}`)
  }

  return { id: data.id as string }
}

function getPreferredMemoryCategories(
  intentCategory: string | undefined,
  currentMessage: string
): MemoryCategory[] {
  const lower = currentMessage.toLowerCase()

  if (intentCategory === 'command') {
    return ['workflow_preference', 'communication_style', 'scheduling_pattern', 'business_rule']
  }

  if (intentCategory === 'question') {
    return ['chef_preference', 'business_rule', 'culinary_note', 'client_insight']
  }

  if (/\b(draft|email|reply|follow up|message|text|tone)\b/i.test(lower)) {
    return ['communication_style', 'client_insight', 'workflow_preference']
  }

  if (/\b(price|pricing|quote|rate|charge|budget|deposit)\b/i.test(lower)) {
    return ['pricing_pattern', 'business_rule', 'chef_preference']
  }

  if (/\b(allerg|dietary|client|guest|family|anniversary|birthday)\b/i.test(lower)) {
    return ['client_insight', 'chef_preference', 'business_rule']
  }

  return ['chef_preference', 'client_insight', 'business_rule']
}

function extractMemoryKeywords(message: string): string[] {
  return [...new Set(normalizeMemoryContent(message).split(' '))]
    .filter((word) => word.length >= 3 && !MEMORY_STOPWORDS.has(word))
    .slice(0, 16)
}

function scoreMemoryForRetrieval(
  row: Record<string, unknown>,
  currentMessage: string,
  messageKeywords: string[],
  preferredCategories: MemoryCategory[],
  relatedClientId: string | null
): number {
  const importance = Number(row.importance ?? 0)
  const accessCount = Number(row.access_count ?? 0)
  const category = row.category as MemoryCategory
  const related = (row.related_client_id as string | null) ?? null
  const normalizedContent = normalizeMemoryContent(String(row.content ?? ''))
  const lowerMessage = currentMessage.toLowerCase()
  const isPreferredCategory = preferredCategories.includes(category)
  const hasClientMatch = Boolean(relatedClientId && related && relatedClientId === related)

  let score = importance * 8
  score += Math.min(accessCount, 6) * 2

  if (isPreferredCategory) score += 14
  if (importance >= 8) score += 10
  if (hasClientMatch) score += 40

  const overlapCount = messageKeywords.reduce(
    (count, keyword) => count + (normalizedContent.includes(keyword) ? 1 : 0),
    0
  )
  const hasOverlap = overlapCount > 0
  score += overlapCount * 8

  if (!hasOverlap && !isPreferredCategory && !hasClientMatch && importance < 8) {
    return -1
  }

  if (
    /\b(allerg|dietary|gluten|shellfish|nut|vegan|vegetarian|kosher|halal)\b/i.test(lowerMessage) &&
    category === 'client_insight'
  ) {
    score += 18
  }

  const lastAccessedAt = String(row.last_accessed_at ?? '')
  if (lastAccessedAt) {
    const daysSinceAccess = Math.max(
      0,
      (Date.now() - new Date(lastAccessedAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceAccess <= 1) score += 10
    else if (daysSinceAccess <= 7) score += 7
    else if (daysSinceAccess <= 30) score += 4
    else if (daysSinceAccess <= 90) score += 2
    else if (!hasOverlap && !hasClientMatch && importance < 7) return -1
    else if (daysSinceAccess > 180 && importance < 8) score -= 12
  }

  return score
}

function scoreCorrectionCandidate(
  row: Record<string, unknown>,
  oldFact: string,
  newFact: string,
  category: MemoryCategory,
  relatedClientId: string | null
): number {
  const content = normalizeMemoryContent(String(row.content ?? ''))
  if (!content) return 0

  const normalizedOldFact = normalizeMemoryContent(oldFact)
  const normalizedNewFact = normalizeMemoryContent(newFact)
  const oldKeywords = extractMemoryKeywords(oldFact)
  const newKeywords = extractMemoryKeywords(newFact)

  let score = Number(row.importance ?? 0) * 4

  if ((row.category as MemoryCategory) === category) score += 12
  if (relatedClientId && row.related_client_id === relatedClientId) score += 24
  if (normalizedOldFact && content.includes(normalizedOldFact)) score += 36
  if (normalizedOldFact && normalizedOldFact.includes(content) && content.length >= 12) score += 18

  const oldOverlap = oldKeywords.reduce(
    (count, keyword) => count + (content.includes(keyword) ? 1 : 0),
    0
  )
  const newOverlap = newKeywords.reduce(
    (count, keyword) => count + (content.includes(keyword) ? 1 : 0),
    0
  )

  score += oldOverlap * 10
  score -= newOverlap * 5

  if (normalizedNewFact && content.includes(normalizedNewFact)) {
    score -= 20
  }

  const lastAccessedAt = String(row.last_accessed_at ?? '')
  if (lastAccessedAt) {
    const daysSinceAccess = Math.max(
      0,
      (Date.now() - new Date(lastAccessedAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceAccess <= 30) score += 4
    else if (daysSinceAccess > 180) score -= 6
  }

  return score
}

function getDeterministicImportance(
  content: string,
  category: MemoryCategory,
  suggestedImportance?: number
): number {
  const normalized = normalizeMemoryContent(content)
  const wordCount = normalized.split(' ').filter(Boolean).length

  if (
    /\b(allerg|allergy|anaphyl|epipen|dietary|gluten|shellfish|peanut|tree nut|celiac|kosher|halal|vegan|vegetarian)\b/i.test(
      normalized
    )
  ) {
    return 10
  }

  if (
    category === 'business_rule' &&
    /\b(always|never|must|cannot|cant|do not|dont|only|rule)\b/i.test(normalized)
  ) {
    return 9
  }

  if (
    category === 'pricing_pattern' ||
    /\b(\$|usd|deposit|retainer|minimum|rate|per person|per guest|pricing|price|quote|percent|margin)\b/i.test(
      normalized
    )
  ) {
    return 8
  }

  if (category === 'client_insight') {
    return 7
  }

  if (
    category === 'communication_style' ||
    category === 'workflow_preference' ||
    category === 'scheduling_pattern'
  ) {
    return 6
  }

  if (category === 'chef_preference' || category === 'culinary_note') {
    return wordCount <= 4 ? 4 : 6
  }

  return Math.max(4, Math.min(10, suggestedImportance ?? 5))
}

function normalizeMemoryContent(content: string): string {
  return content
    .normalize('NFKD')
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9$%/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hashContent(content: string): string {
  return createHash('sha256').update(normalizeMemoryContent(content)).digest('hex').slice(0, 32)
}

function mapRowToMemory(row: Record<string, unknown>): RemyMemory {
  return {
    id: row.id as string,
    category: row.category as MemoryCategory,
    content: row.content as string,
    importance: row.importance as number,
    accessCount: row.access_count as number,
    relatedClientId: row.related_client_id as string | null,
    createdAt: row.created_at as string,
    lastAccessedAt: row.last_accessed_at as string,
  }
}
