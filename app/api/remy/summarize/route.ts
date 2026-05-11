// Remy - Async Conversation Summarization Endpoint (Phase 3)
// Fire-and-forget: client POSTs conversation messages, server generates
// an LLM summary, embeds it, and stores in rag_chunks for semantic retrieval.

import { NextRequest, NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { generateLLMSummary } from '@/lib/ai/remy-conversation-summary-server'
import { embedText } from '@/lib/ai/embeddings'
import { pgClient } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_MESSAGES = 200
const MAX_MESSAGE_LENGTH = 5000

export async function POST(req: NextRequest) {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant' }, { status: 401 })
    }

    const body = await req.json()
    const { messages, conversationId } = body

    if (!Array.isArray(messages) || messages.length < 2) {
      return NextResponse.json({ error: 'At least 2 messages required' }, { status: 400 })
    }

    // Validate and truncate messages
    const validated = messages
      .slice(0, MAX_MESSAGES)
      .map((m: { role?: string; content?: string }) => ({
        role: typeof m.role === 'string' ? m.role : 'user',
        content: typeof m.content === 'string' ? m.content.slice(0, MAX_MESSAGE_LENGTH) : '',
      }))

    // Return 202 immediately, do the work after responding
    const response = NextResponse.json({ accepted: true }, { status: 202 })

    // Process in background (non-blocking)
    summarizeAndStore(tenantId, validated, conversationId || null).catch((err) => {
      console.error('[remy/summarize] Background summarization failed:', err)
    })

    return response
  } catch (err) {
    console.error('[remy/summarize] Request error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function summarizeAndStore(
  tenantId: string,
  messages: Array<{ role: string; content: string }>,
  conversationId: string | null
): Promise<void> {
  // Generate LLM summary (falls back to deterministic if Ollama offline)
  const summary = await generateLLMSummary(messages)

  // Build chunk text combining summary, topics, and entities
  const chunkText = [
    summary.summary,
    summary.topics.length > 0 ? `Topics: ${summary.topics.join(', ')}` : '',
    summary.entities.length > 0 ? `Entities: ${summary.entities.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  // Embed for semantic retrieval
  const embedding = await embedText(chunkText)

  // Store in rag_chunks (with or without embedding)
  const sourceId = conversationId || `conv_${Date.now()}`
  const metadata = JSON.stringify({
    messageCount: summary.messageCount,
    topics: summary.topics,
    entities: summary.entities,
    sentiment: (summary as unknown as Record<string, unknown>).sentiment || 'neutral',
    decisions: (summary as unknown as Record<string, unknown>).decisions || [],
    actionItems: (summary as unknown as Record<string, unknown>).actionItems || [],
    generatedAt: summary.generatedAt,
  })

  if (embedding) {
    await pgClient`
      INSERT INTO rag_chunks (tenant_id, source_type, source_id, chunk_text, embedding, metadata)
      VALUES (
        ${tenantId},
        'conversation_summary',
        ${sourceId},
        ${chunkText},
        ${JSON.stringify(embedding)}::vector,
        ${metadata}::jsonb
      )
      ON CONFLICT DO NOTHING
    `
  } else {
    // Store without embedding (can be backfilled later)
    await pgClient`
      INSERT INTO rag_chunks (tenant_id, source_type, source_id, chunk_text, embedding, metadata)
      VALUES (
        ${tenantId},
        'conversation_summary',
        ${sourceId},
        ${chunkText},
        ${JSON.stringify(new Array(768).fill(0))}::vector,
        ${metadata}::jsonb
      )
      ON CONFLICT DO NOTHING
    `
  }

  console.log(
    `[remy/summarize] Stored summary for conversation ${sourceId} (${summary.messageCount} messages, ${summary.topics.length} topics)`
  )
}
