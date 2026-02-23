// Remy — Client Layer Streaming API
// AUTHENTICATED — for clients in the client portal.
// PRIVACY: Client data = PII → must use Ollama. No cloud models. EVER.
// Scoped to the authenticated client's own data only.

import { NextRequest } from 'next/server'
import { Ollama } from 'ollama'
import { requireClient } from '@/lib/auth/get-user'
import {
  isOllamaEnabled,
  getOllamaConfig,
  getOllamaModel,
  getOllamaContextSize,
} from '@/lib/ai/providers'
import { validateRemyInput, checkRemyRateLimit } from '@/lib/ai/remy-guardrails'
import { validateRemyRequestBody, validateHistory } from '@/lib/ai/remy-input-validation'
import {
  REMY_CLIENT_PERSONALITY,
  REMY_CLIENT_TOPIC_GUARDRAILS,
  REMY_CLIENT_ANTI_INJECTION,
} from '@/lib/ai/remy-client-personality'
import { loadRemyClientContext, formatClientContext } from '@/lib/ai/remy-client-context'

// ─── Types ──────────────────────────────────────────────────────────────────

interface StreamEvent {
  type: 'token' | 'done' | 'error'
  data: unknown
}

// ─── SSE Helpers ────────────────────────────────────────────────────────────

function encodeSSE(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

function sseHeaders() {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  }
}

// ─── System Prompt Builder ──────────────────────────────────────────────────

function buildClientSystemPrompt(contextBlock: string): string {
  const parts: string[] = []

  parts.push(REMY_CLIENT_PERSONALITY)
  parts.push(REMY_CLIENT_TOPIC_GUARDRAILS)
  parts.push(REMY_CLIENT_ANTI_INJECTION)
  parts.push(contextBlock)

  parts.push(`\nRESPONSE FORMAT:
Write your reply in natural language with markdown formatting (bold, bullets, etc.).
Keep responses concise — 1-3 paragraphs max.
When relevant, suggest the client navigate to the appropriate page in their portal.
If you want to suggest page navigation links, end your response with a line containing only:
NAV_SUGGESTIONS: [{"label":"Page Name","href":"/route"}]
Only include nav suggestions when genuinely helpful.`)

  return parts.join('\n')
}

// ─── Conversation History ───────────────────────────────────────────────────

function formatHistory(history: Array<{ role: string; content: string }>): string {
  if (history.length === 0) return ''
  const recent = history.slice(-8)
  const formatted = recent
    .map((m) => `${m.role === 'user' ? 'Client' : 'Remy'}: ${m.content}`)
    .join('\n')
  return `Previous conversation:\n${formatted}\n\n`
}

// ─── POST Handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Auth — must be an authenticated client
    const user = await requireClient()

    const rawBody = await req.json()
    const validated = validateRemyRequestBody(rawBody)
    if (!validated) {
      return new Response(
        encodeSSE({ type: 'error', data: 'Invalid request — please try again.' }),
        { headers: sseHeaders() }
      )
    }
    const { message } = validated
    const history = validateHistory(rawBody.history, 8)

    // Rate limiting (reuse tenant-based rate limiter)
    const rateCheck = checkRemyRateLimit(user.tenantId!)
    if (!rateCheck.allowed) {
      return new Response(encodeSSE({ type: 'error', data: rateCheck.refusal }), {
        headers: sseHeaders(),
      })
    }

    // Input validation
    const inputCheck = validateRemyInput(message)
    if (!inputCheck.allowed) {
      const clientRefusal =
        inputCheck.category === 'dangerous_content' || inputCheck.category === 'abuse'
          ? "I'm here to help with your events and dining — let's keep it on topic!"
          : inputCheck.refusal
      return new Response(encodeSSE({ type: 'error', data: clientRefusal }), {
        headers: sseHeaders(),
      })
    }

    // Check Ollama availability — client data = PII, must use Ollama
    if (!isOllamaEnabled()) {
      return new Response(
        encodeSSE({
          type: 'error',
          data: "I'm taking a quick break — check back in a few minutes!",
        }),
        { headers: sseHeaders() }
      )
    }

    // Load client-scoped context
    const context = await loadRemyClientContext(user.entityId, user.tenantId!)
    const contextBlock = formatClientContext(context)
    const systemPrompt = buildClientSystemPrompt(contextBlock)
    const conversationHistory = formatHistory(history ?? [])

    // Build message for Ollama
    const fullPrompt = `${conversationHistory}Client: ${message}`

    const config = getOllamaConfig()
    const model = getOllamaModel('standard') // Standard model for client (PII requires quality)
    const ollama = new Ollama({ host: config.baseUrl })

    // Stream response
    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), 180_000) // 3 min — 30b model can be slow

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const ollamaStream = await ollama.chat({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: fullPrompt },
            ],
            stream: true,
            options: {
              temperature: 0.7,
              num_predict: 800, // Moderate length for client responses
              num_ctx: getOllamaContextSize('client'),
            },
            keep_alive: '5m',
          })

          for await (const chunk of ollamaStream) {
            if (abortController.signal.aborted) break
            if (chunk.message?.content) {
              controller.enqueue(
                encoder.encode(encodeSSE({ type: 'token', data: chunk.message.content }))
              )
            }
          }

          controller.enqueue(encoder.encode(encodeSSE({ type: 'done', data: null })))
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            controller.enqueue(
              encoder.encode(
                encodeSSE({
                  type: 'error',
                  data: 'Response took too long — try a shorter question!',
                })
              )
            )
          } else {
            console.error('[remy-client] Streaming error:', err?.message)
            controller.enqueue(
              encoder.encode(
                encodeSSE({
                  type: 'error',
                  data: "Something went wrong — I'll be back shortly!",
                })
              )
            )
          }
        } finally {
          clearTimeout(timeout)
          controller.close()
        }
      },
    })

    return new Response(stream, { headers: sseHeaders() })
  } catch (err: any) {
    // Auth failures return 401
    if (err?.message?.includes('Unauthorized')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.error('[remy-client] Route error:', err?.message)
    return new Response(
      encodeSSE({
        type: 'error',
        data: 'Something went wrong — please try again!',
      }),
      { headers: sseHeaders() }
    )
  }
}
