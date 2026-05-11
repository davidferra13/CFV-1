'use server'

// Server-side LLM-powered conversation summarization (Phase 3)
// Uses AI SDK generateObject() with local Ollama to produce rich summaries.
// Falls back to deterministic summarization if Ollama is offline.

import { generateObject } from 'ai'
import { ollama, models } from '@/lib/ai/ai-provider'
import { z } from 'zod'
import type { ConversationSummary } from '@/lib/ai/remy-conversation-summary'
import { embedText } from '@/lib/ai/embeddings'
import { pgClient } from '@/lib/db'

const SummarySchema = z.object({
  summary: z.string().describe('2-3 sentence summary of the conversation'),
  topics: z.array(z.string()).describe('Main topics discussed'),
  entities: z.array(z.string()).describe('People, events, recipes mentioned'),
  decisions: z.array(z.string()).describe('Decisions made during the conversation'),
  actionItems: z.array(z.string()).describe('Action items or follow-ups identified'),
  sentiment: z.enum(['positive', 'neutral', 'frustrated', 'urgent']),
})

const SUMMARY_PROMPT = `You are a conversation summarizer for a private chef's AI assistant (Remy).
Given a transcript of a conversation between a chef and Remy, produce a structured summary.

Guidelines:
- Summary should be 2-3 sentences capturing the key discussion points and outcomes.
- Topics should be broad categories (e.g. "events", "clients", "recipes", "finances", "scheduling").
- Entities should be specific proper nouns: client names, event names, recipe names, ingredient names.
- Decisions should be concrete commitments or choices made during the conversation.
- Action items should be tasks the chef or Remy committed to doing.
- Sentiment should reflect the chef's overall tone in the conversation.

Return valid JSON matching the schema.`

/**
 * Generate an LLM-powered conversation summary via Ollama.
 * Falls back to a minimal deterministic summary if the LLM call fails.
 */
export async function generateLLMSummary(
  messages: Array<{ role: string; content: string }>
): Promise<ConversationSummary> {
  // Format messages into a readable transcript
  const transcript = messages
    .map((m) => {
      const speaker = m.role === 'user' ? 'Chef' : 'Remy'
      return `${speaker}: ${m.content}`
    })
    .join('\n')

  // Truncate very long transcripts to avoid token limits
  const maxChars = 6000
  const truncatedTranscript =
    transcript.length > maxChars
      ? transcript.slice(0, maxChars) + '\n[...conversation truncated for summary]'
      : transcript

  try {
    const result = await generateObject({
      model: models.fast,
      schema: SummarySchema,
      system: SUMMARY_PROMPT,
      prompt: truncatedTranscript,
    })

    return {
      summary: result.object.summary,
      topics: result.object.topics,
      entities: result.object.entities,
      messageCount: messages.length,
      generatedAt: new Date().toISOString(),
      // Extend with LLM-only fields stored in metadata
      decisions: result.object.decisions,
      actionItems: result.object.actionItems,
      sentiment: result.object.sentiment,
    } as ConversationSummary & {
      decisions: string[]
      actionItems: string[]
      sentiment: string
    }
  } catch (err) {
    // Fallback: build a minimal deterministic summary
    console.warn(
      '[remy-summary-server] LLM summarization failed, using fallback:',
      err instanceof Error ? err.message : String(err)
    )
    return buildFallbackSummary(messages)
  }
}

/**
 * Minimal deterministic fallback when Ollama is offline.
 * Extracts basic info without any LLM call.
 */
function buildFallbackSummary(
  messages: Array<{ role: string; content: string }>
): ConversationSummary {
  const userMessages = messages.filter((m) => m.role === 'user')
  const allText = messages.map((m) => m.content.toLowerCase()).join(' ')

  // Simple topic detection
  const topicMap: Record<string, string[]> = {
    events: ['event', 'party', 'dinner', 'wedding', 'catering', 'brunch'],
    clients: ['client', 'customer', 'guest', 'booking'],
    finances: ['invoice', 'payment', 'revenue', 'quote', 'pricing', 'deposit'],
    recipes: ['recipe', 'dish', 'menu', 'ingredient', 'cook', 'prep'],
    scheduling: ['calendar', 'schedule', 'date', 'availability'],
  }

  const topics: string[] = []
  for (const [topic, keywords] of Object.entries(topicMap)) {
    if (keywords.some((kw) => allText.includes(kw))) {
      topics.push(topic)
    }
  }

  // Simple entity extraction (proper nouns)
  const entities: string[] = []
  const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g
  const skipNames = new Set(['good morning', 'good afternoon', 'good evening'])
  for (const msg of messages) {
    let match
    while ((match = namePattern.exec(msg.content)) !== null) {
      const name = match[1]
      if (name.length >= 4 && name.length <= 40 && !skipNames.has(name.toLowerCase())) {
        if (!entities.includes(name)) entities.push(name)
        if (entities.length >= 5) break
      }
    }
  }

  const topicStr = topics.length > 0 ? topics.join(', ') : 'general topics'
  const firstQ = userMessages[0]?.content.slice(0, 80) || 'various topics'

  return {
    summary: `Conversation about ${topicStr}. Started with: "${firstQ}"`,
    topics,
    entities,
    messageCount: messages.length,
    generatedAt: new Date().toISOString(),
  }
}

// ─── Semantic Summary Retrieval ─────────────────────────────────────

interface StoredSummary {
  summary: string
  generatedAt: string
  topics: string[]
  entities: string[]
  distance: number
}

/**
 * Search rag_chunks for semantically similar past conversation summaries.
 * Uses pgvector cosine distance on the embedded summary text.
 * Falls back to empty array if embeddings or pgvector unavailable.
 */
export async function searchSemanticSummaries(
  query: string,
  tenantId: string,
  options: { limit?: number } = {}
): Promise<Array<{ summary: string; generatedAt: string }>> {
  const limit = options.limit ?? 3

  try {
    const queryEmbedding = await embedText(query)
    if (!queryEmbedding) return []

    const vecStr = JSON.stringify(queryEmbedding)
    const rows = await pgClient<StoredSummary[]>`
      SELECT
        chunk_text as summary,
        (metadata->>'generatedAt') as "generatedAt",
        COALESCE(
          ARRAY(SELECT jsonb_array_elements_text(metadata->'topics')),
          ARRAY[]::text[]
        ) as topics,
        COALESCE(
          ARRAY(SELECT jsonb_array_elements_text(metadata->'entities')),
          ARRAY[]::text[]
        ) as entities,
        (embedding <=> ${vecStr}::vector) as distance
      FROM rag_chunks
      WHERE tenant_id = ${tenantId}
        AND source_type = 'conversation_summary'
        AND embedding IS NOT NULL
      ORDER BY distance
      LIMIT ${limit}
    `

    // Filter out low-relevance results (distance > 0.8)
    return rows
      .filter((r) => r.distance < 0.8)
      .map((r) => ({
        summary: r.summary,
        generatedAt: r.generatedAt || new Date().toISOString(),
      }))
  } catch (err) {
    console.warn(
      '[remy-summary-server] Semantic summary search failed:',
      err instanceof Error ? err.message : String(err)
    )
    return []
  }
}
