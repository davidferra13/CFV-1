'use server'

// Remy Memory System — extract, store, load, and manage persistent memories
// PRIVACY: Memories contain distilled client insights — must stay local via Ollama.

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
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
    const result = await parseWithOllama(
      EXTRACTION_PROMPT,
      `CHEF: ${userMessage}`,
      ExtractedMemorySchema,
      { modelTier: 'fast', cache: false }
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

      const contentHash = hashContent(mem.content)

      // Check for existing duplicate
      const { data: existing } = await supabase
        .from('remy_memories')
        .select('id, access_count, importance')
        .eq('tenant_id', tenantId)
        .eq('content_hash', contentHash)
        .eq('is_active', true)
        .maybeSingle()

      if (existing) {
        // Reinforce existing memory: bump access_count, update importance if higher
        await supabase
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
        const { data: clients } = await supabase
          .from('clients')
          .select('id')
          .eq('tenant_id', tenantId)
          .ilike('full_name', `%${mem.relatedClientName}%`)
          .limit(1)
        relatedClientId = (clients?.[0]?.id as string) ?? null

        // GUARD: If this is a client_insight but the client doesn't exist in DB,
        // skip saving — it's likely a hallucinated or misheard name.
        if (mem.category === 'client_insight' && !relatedClientId) {
          console.warn(
            `[remy-memory] Skipping client_insight for unknown client "${mem.relatedClientName}"`
          )
          continue
        }
      }

      // Insert new memory
      await supabase.from('remy_memories').insert({
        tenant_id: tenantId,
        category: mem.category,
        content: mem.content,
        importance: mem.importance,
        content_hash: contentHash,
        related_client_id: relatedClientId,
        source_artifact_id: sourceArtifactId ?? null,
        source_message: userMessage,
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

// ─── Load Relevant Memories ────────────────────────────────────────────────

export async function loadRelevantMemories(
  currentMessage: string,
  intentCategory?: string,
  mentionedClientName?: string
): Promise<RemyMemory[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const memories: RemyMemory[] = []
  const seenIds = new Set<string>()

  // Layer 1: Client-specific memories (if a client is mentioned)
  if (mentionedClientName) {
    const { data: clients } = await supabase
      .from('clients')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('full_name', `%${mentionedClientName}%`)
      .limit(1)

    if (clients?.[0]) {
      const { data } = await supabase
        .from('remy_memories')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('related_client_id', clients[0].id as string)
        .eq('is_active', true)
        .order('importance', { ascending: false })
        .limit(10)

      for (const row of data ?? []) {
        if (!seenIds.has(row.id as string)) {
          seenIds.add(row.id as string)
          memories.push(mapRowToMemory(row))
        }
      }
    }
  }

  // Layer 2: High-importance memories (always loaded)
  const { data: highImportance } = await supabase
    .from('remy_memories')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .gte('importance', 8)
    .order('importance', { ascending: false })
    .limit(15)

  for (const row of highImportance ?? []) {
    if (!seenIds.has(row.id as string)) {
      seenIds.add(row.id as string)
      memories.push(mapRowToMemory(row))
    }
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

  const { data: categoryMatched } = await supabase
    .from('remy_memories')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .in('category', categories)
    .order('last_accessed_at', { ascending: false })
    .limit(10)

  for (const row of categoryMatched ?? []) {
    if (!seenIds.has(row.id as string)) {
      seenIds.add(row.id as string)
      memories.push(mapRowToMemory(row))
    }
  }

  // Layer 4: Recently accessed memories (recency bias)
  const { data: recent } = await supabase
    .from('remy_memories')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('last_accessed_at', { ascending: false })
    .limit(5)

  for (const row of recent ?? []) {
    if (!seenIds.has(row.id as string)) {
      seenIds.add(row.id as string)
      memories.push(mapRowToMemory(row))
    }
  }

  // Hard cap: 30 memories max in context
  const capped = memories.slice(0, 30)

  // Bump last_accessed_at for all loaded memories (non-blocking)
  const loadedIds = capped.map((m) => m.id)
  if (loadedIds.length > 0) {
    supabase
      .from('remy_memories')
      .update({ last_accessed_at: new Date().toISOString() })
      .in('id', loadedIds)
      .then(() => {})
      .catch((err) => console.error('[remy-memory] Failed to bump access:', err))
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

  const contentHash = hashContent(input.content)

  // Check for duplicates
  const { data: existing } = await supabase
    .from('remy_memories')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('content_hash', contentHash)
    .eq('is_active', true)
    .maybeSingle()

  if (existing) {
    return { id: existing.id as string }
  }

  const { data, error } = await supabase
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
    createdAt: row.created_at as string,
    lastAccessedAt: row.last_accessed_at as string,
  }
}
