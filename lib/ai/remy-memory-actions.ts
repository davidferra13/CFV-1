'use server'

// Remy Memory System - extract, store, load, and manage persistent memories
// PRIVACY: Memories contain distilled client insights - must stay local via Ollama.

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { createHash } from 'crypto'
import { validateMemoryContent } from '@/lib/ai/remy-guardrails'
import type { RemyMemory, MemoryCategory } from '@/lib/ai/remy-memory-types'
import { listRuntimeFileMemories } from '@/lib/ai/remy-runtime-memory'
import { searchMemPalace } from '@/lib/ai/mempalace-bridge'

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

// ─── Extract & Save Memories (background, non-blocking) ────────────────────

export async function extractAndSaveMemories(
  userMessage: string,
  _remyResponse?: string,
  sourceArtifactId?: string
): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  // SAFETY: Only extract from the chef's message - never from Remy's response.
  // If Remy hallucinates, we must not save that hallucination as a "real" memory.
  // The extraction prompt says "only extract what the CHEF said" but LLMs aren't
  // perfect - the safest approach is to never show them Remy's text at all.

  try {
    const result = await parseWithOllama(
      EXTRACTION_PROMPT,
      `CHEF: ${userMessage}`,
      ExtractedMemorySchema,
      { modelTier: 'fast', cache: false }
    )

    if (!result.memories || result.memories.length === 0) return

    const db: any = createServerClient()

    for (const mem of result.memories) {
      // Validate extracted memory content before saving
      const memCheck = validateMemoryContent(mem.content)
      if (!memCheck.allowed) {
        console.warn(`[remy-memory] Skipping invalid extracted memory: ${mem.content.slice(0, 80)}`)
        continue
      }

      const contentHash = hashContent(mem.content)

      // Check for existing duplicate
      const { data: existing } = await db
        .from('remy_memories')
        .select('id, access_count, importance')
        .eq('tenant_id', tenantId)
        .eq('content_hash', contentHash)
        .eq('is_active', true)
        .maybeSingle()

      if (existing) {
        // Reinforce existing memory: bump access_count, update importance if higher
        await db
          .from('remy_memories')
          .update({
            access_count: (existing.access_count as number) + 1,
            importance: Math.max(existing.importance as number, mem.importance),
            last_accessed_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
        continue
      }

      // Resolve client ID if a client name was mentioned
      let relatedClientId: string | null = null
      if (mem.relatedClientName) {
        const { data: clients } = await db
          .from('clients')
          .select('id')
          .eq('tenant_id', tenantId)
          .ilike('full_name', `%${mem.relatedClientName}%`)
          .limit(1)
        relatedClientId = (clients?.[0]?.id as string) ?? null

        // GUARD: If this is a client_insight but the client doesn't exist in DB,
        // skip saving - it's likely a hallucinated or misheard name.
        if (mem.category === 'client_insight' && !relatedClientId) {
          console.warn(
            `[remy-memory] Skipping client_insight for unknown client "${mem.relatedClientName}"`
          )
          continue
        }
      }

      // Insert new memory
      await db.from('remy_memories').insert({
        tenant_id: tenantId,
        category: mem.category,
        content: mem.content,
        importance: mem.importance,
        content_hash: contentHash,
        related_client_id: relatedClientId,
        source_artifact_id: sourceArtifactId ?? null,
        source_message: userMessage,
      })

      // CIL observation: feed memory into per-tenant knowledge graph (non-blocking)
      try {
        const { notifyCIL } = await import('@/lib/cil/notify')
        const entityIds = [`chef_${tenantId}`]
        if (relatedClientId) entityIds.push(`client_${relatedClientId}`)
        await notifyCIL({
          tenantId,
          source: 'memory',
          entityIds,
          payload: {
            category: mem.category,
            content: mem.content,
            importance: mem.importance,
            label: mem.relatedClientName || mem.category,
          },
        })
      } catch {
        // CIL failure is non-fatal
      }
    }
  } catch (err) {
    // Non-blocking - never throw. Memory extraction failure must not affect the user.
    if (err instanceof OllamaOfflineError) {
      console.warn('[remy-memory] Ollama offline - skipping memory extraction')
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
  const db: any = createServerClient()

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

    const result = await parseWithOllama(
      `You are a correction parser. The chef is correcting something they or their AI assistant previously said.
Extract what was WRONG (the old fact) and what is CORRECT (the new fact).
Return JSON: { "oldFact": "...", "newFact": "...", "category": "...", "importance": 1-10, "relatedClientName": "..." }
If you can't determine a clear correction, return: { "oldFact": "", "newFact": "", "category": "chef_preference", "importance": 1 }`,
      `Chef says: "${userMessage}"`,
      CorrectionSchema,
      { modelTier: 'fast', cache: false }
    )

    // If parsing couldn't extract a meaningful correction, bail
    if (!result.oldFact || !result.newFact) {
      return { corrected: false }
    }

    // Search for existing memories that match the OLD (wrong) fact
    const { data: candidates } = await db
      .from('remy_memories')
      .select('id, content, category')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(50)

    // Find the best match by checking content overlap with the old fact
    const oldWords = result.oldFact
      .toLowerCase()
      .split(/\s+/)
      .filter((w: string) => w.length > 3)
    let bestMatch: { id: string; content: string; score: number } | null = null

    for (const row of candidates ?? []) {
      const content = (row.content as string).toLowerCase()
      const matchScore = oldWords.reduce((score: number, word: string) => {
        return score + (content.includes(word) ? 1 : 0)
      }, 0)
      const normalized = matchScore / Math.max(oldWords.length, 1)
      if (normalized > 0.4 && (!bestMatch || normalized > bestMatch.score)) {
        bestMatch = { id: row.id as string, content: row.content as string, score: normalized }
      }
    }

    // Deactivate the old wrong memory if found
    let deactivatedId: string | undefined
    if (bestMatch) {
      await db
        .from('remy_memories')
        .update({ is_active: false })
        .eq('id', bestMatch.id)
        .eq('tenant_id', tenantId)
      deactivatedId = bestMatch.id
      console.log(`[remy-memory] Deactivated corrected memory: "${bestMatch.content}"`)
    }

    // Save the corrected memory
    const contentHash = hashContent(result.newFact)

    // Resolve client ID if mentioned
    let relatedClientId: string | null = null
    if (result.relatedClientName) {
      const { data: clients } = await db
        .from('clients')
        .select('id')
        .eq('tenant_id', tenantId)
        .ilike('full_name', `%${result.relatedClientName}%`)
        .limit(1)
      relatedClientId = (clients?.[0]?.id as string) ?? null
    }

    const { data: newMem } = await db
      .from('remy_memories')
      .insert({
        tenant_id: tenantId,
        category: result.category,
        content: result.newFact,
        importance: result.importance,
        content_hash: contentHash,
        related_client_id: relatedClientId,
        source_message: userMessage,
      })
      .select('id')
      .single()

    console.log(`[remy-memory] Saved corrected memory: "${result.newFact}"`)

    return {
      corrected: true,
      deactivated: deactivatedId,
      created: newMem?.id as string | undefined,
    }
  } catch (err) {
    if (err instanceof OllamaOfflineError) {
      console.warn('[remy-memory] Ollama offline - skipping correction detection')
      return { corrected: false }
    }
    console.error('[remy-memory] Correction detection failed:', err)
    return { corrected: false }
  }
}

// ─── Load Relevant Memories ────────────────────────────────────────────────

export async function loadRelevantMemories(
  _currentMessage: string,
  intentCategory?: string,
  mentionedClientName?: string
): Promise<RemyMemory[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const runtimeMemories = sortMemories(await listRuntimeFileMemories())
  const memories: RemyMemory[] = []
  const seenIds = new Set<string>()

  const pushMemory = (memory: RemyMemory) => {
    if (seenIds.has(memory.id)) return
    seenIds.add(memory.id)
    memories.push(memory)
  }

  // Layer 0: Semantic search via MemPalace (non-blocking enhancement)
  // Finds contextually relevant memories that SQL filters would miss.
  // If MemPalace is unavailable, this silently returns nothing.
  try {
    const palaceResults = await searchMemPalace(_currentMessage, {
      limit: 5,
      wing: 'chefflow-conversations',
    })
    for (const result of palaceResults) {
      if (result.similarity > 0.3) {
        pushMemory({
          id: `palace:${result.source}:${result.similarity}`,
          content: result.content,
          category: 'chef_preference' as MemoryCategory,
          importance: Math.round(result.similarity * 10),
          source: 'palace',
          createdAt: new Date().toISOString(),
          lastAccessedAt: new Date().toISOString(),
          accessCount: 0,
          relatedClientId: null,
          relatedClientName: null,
          editable: false,
        })
      }
    }
  } catch {
    // Non-blocking: MemPalace is optional
  }

  // Layer 1: Client-specific memories (if a client is mentioned)
  if (mentionedClientName) {
    for (const memory of runtimeMemories) {
      if (matchesRelatedClientName(memory, mentionedClientName)) {
        pushMemory(memory)
      }
    }

    const { data: clients } = await db
      .from('clients')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('full_name', `%${mentionedClientName}%`)
      .limit(1)

    if (clients?.[0]) {
      const { data } = await db
        .from('remy_memories')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('related_client_id', clients[0].id as string)
        .eq('is_active', true)
        .order('importance', { ascending: false })
        .limit(10)

      for (const row of data ?? []) {
        pushMemory(mapRowToMemory(row))
      }
    }
  }

  // Layer 2: High-importance memories (always loaded)
  for (const memory of runtimeMemories) {
    if (memory.importance >= 8) {
      pushMemory(memory)
    }
  }

  const { data: highImportance } = await db
    .from('remy_memories')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .gte('importance', 8)
    .order('importance', { ascending: false })
    .limit(15)

  for (const row of highImportance ?? []) {
    pushMemory(mapRowToMemory(row))
  }

  // Layer 3: Category-matched memories (based on intent)
  const categoryMap: Record<string, MemoryCategory[]> = {
    question: ['chef_preference', 'business_rule', 'culinary_note'],
    command: ['workflow_preference', 'communication_style', 'scheduling_pattern'],
  }
  const categories = categoryMap[intentCategory ?? ''] ?? [
    'chef_preference',
    'client_insight',
    'business_rule',
  ]

  for (const memory of runtimeMemories) {
    if (categories.includes(memory.category)) {
      pushMemory(memory)
    }
  }

  const { data: categoryMatched } = await db
    .from('remy_memories')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .in('category', categories)
    .order('last_accessed_at', { ascending: false })
    .limit(10)

  for (const row of categoryMatched ?? []) {
    pushMemory(mapRowToMemory(row))
  }

  // Layer 4: Recently accessed memories (recency bias)
  const { data: recent } = await db
    .from('remy_memories')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('last_accessed_at', { ascending: false })
    .limit(5)

  for (const row of recent ?? []) {
    pushMemory(mapRowToMemory(row))
  }

  // Hard cap: 30 memories max in context
  const capped = memories.slice(0, 30)

  // Bump last_accessed_at for all loaded memories (non-blocking)
  const loadedIds = capped.filter((m) => m.source === 'database').map((m) => m.id)
  if (loadedIds.length > 0) {
    db.from('remy_memories')
      .update({ last_accessed_at: new Date().toISOString() })
      .in('id', loadedIds)
      .then(() => {})
      .catch((err: any) => console.error('[remy-memory] Failed to bump access:', err))
  }

  return capped
}

// ─── Delete Memory ─────────────────────────────────────────────────────────

export async function deleteRemyMemory(memoryId: string): Promise<void> {
  if (memoryId.startsWith('runtime:')) {
    throw new Error('Runtime file memories are managed in memory/runtime/remy.json')
  }

  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { error } = await db
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
  const db: any = createServerClient()
  const runtimeMemories = await listRuntimeFileMemories()

  let query = db
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

  const databaseMemories = (data ?? []).map(mapRowToMemory)
  const combined = [...databaseMemories, ...runtimeMemories].filter((memory) =>
    options?.category ? memory.category === options.category : true
  )

  return sortMemories(combined).slice(0, options?.limit ?? 100)
}

// ─── Decay Stale Memories ──────────────────────────────────────────────────

export async function decayStaleMemories(): Promise<{ deactivated: number }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Memories not accessed in 90 days with low importance get deactivated
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)

  const { data, error } = await db
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
  const db: any = createServerClient()

  const contentHash = hashContent(input.content)

  // Check for duplicates
  const { data: existing } = await db
    .from('remy_memories')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('content_hash', contentHash)
    .eq('is_active', true)
    .maybeSingle()

  if (existing) {
    return { id: existing.id as string }
  }

  const { data, error } = await db
    .from('remy_memories')
    .insert({
      tenant_id: tenantId,
      category: input.category,
      content: input.content,
      importance: input.importance ?? 5,
      content_hash: contentHash,
      source_message: 'Manually added by chef',
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to add memory: ${error.message}`)
  return { id: data.id }
}

// ─── Draft Feedback Learning ─────────────────────────────────────────────────
// Detects when a chef gives feedback on a draft (email, message, etc.) and
// saves the style preference as a memory for future drafts.

const DRAFT_TASK_TYPES = [
  'email.followup',
  'email.generic',
  'email.thankyou',
  'email.inquiry_reply',
  'communication.draft',
]

const FEEDBACK_PATTERNS: Array<{ pattern: RegExp; preference: string }> = [
  {
    pattern: /too (formal|stiff|corporate|cold)/i,
    preference: 'Prefers less formal, warmer tone in drafts',
  },
  {
    pattern: /too (casual|informal|chatty|friendly)/i,
    preference: 'Prefers more professional tone in drafts',
  },
  { pattern: /too (long|wordy|verbose)/i, preference: 'Prefers shorter, more concise drafts' },
  { pattern: /too (short|brief|terse)/i, preference: 'Prefers more detailed, longer drafts' },
  {
    pattern: /more (personal|warm|friendly|human)/i,
    preference: 'Prefers warm, personal tone in drafts',
  },
  {
    pattern: /more (professional|formal|polished)/i,
    preference: 'Prefers professional, polished tone in drafts',
  },
  { pattern: /shorter|cut it down|trim/i, preference: 'Prefers shorter, more concise drafts' },
  { pattern: /more detail|flesh.* out|expand/i, preference: 'Prefers more detailed drafts' },
  {
    pattern: /don'?t (say|use|write|include) ["']?(\w+)/i,
    preference: 'Avoid specific phrasing in drafts',
  },
  {
    pattern: /sound(s)? like (ai|a robot|chatgpt|automated)/i,
    preference: 'Drafts should sound natural and human, not AI-generated',
  },
]

export async function detectDraftFeedback(
  userMessage: string,
  previousTasks: Array<{ taskType: string; status: string; data?: unknown }>
): Promise<void> {
  // Only trigger if previous message had a draft-producing task
  const hadDraft = previousTasks.some(
    (t) => DRAFT_TASK_TYPES.includes(t.taskType) && (t.status === 'done' || t.status === 'pending')
  )
  if (!hadDraft) return

  // Check if the user's message contains draft feedback
  for (const { pattern, preference } of FEEDBACK_PATTERNS) {
    if (pattern.test(userMessage)) {
      try {
        await addRemyMemoryManual({
          content: preference,
          category: 'communication_style',
          importance: 6,
        })
        console.log(`[remy-memory] Saved draft feedback preference: "${preference}"`)
      } catch (err) {
        console.error('[remy-memory] Failed to save draft feedback:', err)
      }
      return // Save at most one preference per message
    }
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function hashContent(content: string): string {
  const normalized = content.toLowerCase().trim().replace(/\s+/g, ' ')
  return createHash('sha256').update(normalized).digest('hex').slice(0, 32)
}

function mapRowToMemory(row: Record<string, unknown>): RemyMemory {
  return {
    id: row.id as string,
    category: row.category as MemoryCategory,
    content: row.content as string,
    importance: row.importance as number,
    accessCount: row.access_count as number,
    relatedClientId: row.related_client_id as string | null,
    relatedClientName: null,
    createdAt: row.created_at as string,
    lastAccessedAt: row.last_accessed_at as string,
    source: 'database',
    editable: true,
  }
}

function matchesRelatedClientName(memory: RemyMemory, mentionedClientName: string): boolean {
  if (!memory.relatedClientName) return false

  const memoryName = memory.relatedClientName.toLowerCase()
  const mentionedName = mentionedClientName.toLowerCase()

  return memoryName.includes(mentionedName) || mentionedName.includes(memoryName)
}

function sortMemories(memories: RemyMemory[]): RemyMemory[] {
  return [...memories].sort((left, right) => {
    if (right.importance !== left.importance) {
      return right.importance - left.importance
    }

    const leftTime = Date.parse(left.lastAccessedAt)
    const rightTime = Date.parse(right.lastAccessedAt)
    if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime) && rightTime !== leftTime) {
      return rightTime - leftTime
    }

    return left.content.localeCompare(right.content)
  })
}
