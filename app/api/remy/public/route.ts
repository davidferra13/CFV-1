// Remy — Public Layer Streaming API
// UNAUTHENTICATED — for visitors on public-facing pages.
// Rate-limited per IP. No PII involved — could use cloud model,
// but uses Ollama for consistency.

import { NextRequest } from 'next/server'
import { Ollama } from 'ollama'
import { isOllamaEnabled, getOllamaConfig, getOllamaModel } from '@/lib/ai/providers'
import { validateRemyInput } from '@/lib/ai/remy-guardrails'
import { validateRemyRequestBody, validateHistory } from '@/lib/ai/remy-input-validation'
import {
  REMY_PUBLIC_PERSONALITY,
  REMY_PUBLIC_TOPIC_GUARDRAILS,
  REMY_PUBLIC_ANTI_INJECTION,
} from '@/lib/ai/remy-public-personality'
import { loadRemyPublicContext, formatPublicContext } from '@/lib/ai/remy-public-context'
import { checkRateLimit } from '@/lib/rateLimit'

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

function buildPublicSystemPrompt(contextBlock: string): string {
  const parts: string[] = []

  parts.push(REMY_PUBLIC_PERSONALITY)
  parts.push(REMY_PUBLIC_TOPIC_GUARDRAILS)
  parts.push(REMY_PUBLIC_ANTI_INJECTION)
  parts.push(contextBlock)

  parts.push(`\nRESPONSE FORMAT:
Write your reply in natural language with markdown formatting (bold, bullets, etc.).
Keep responses concise — 1-3 paragraphs max.
When relevant, suggest the visitor submit an inquiry or visit the booking page.`)

  return parts.join('\n')
}

// ─── Conversation History ───────────────────────────────────────────────────

function formatHistory(history: Array<{ role: string; content: string }>): string {
  if (history.length === 0) return ''
  const recent = history.slice(-6) // Shorter context for public layer
  const formatted = recent
    .map((m) => `${m.role === 'user' ? 'Visitor' : 'Remy'}: ${m.content}`)
    .join('\n')
  return `Previous conversation:\n${formatted}\n\n`
}

// ─── POST Handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'

    // Rate limit check (Redis-backed — survives serverless cold starts)
    try {
      await checkRateLimit(`remy-public:${ip}`, 5, 60_000)
    } catch {
      return new Response(
        encodeSSE({
          type: 'error',
          data: "I'm getting a lot of messages. Give me a moment to catch up! Try again in about a minute.",
        }),
        { headers: sseHeaders() }
      )
    }

    const rawBody = await req.json()
    const validated = validateRemyRequestBody(rawBody)
    if (!validated) {
      return new Response(
        encodeSSE({ type: 'error', data: 'Invalid request. Please try again.' }),
        { headers: sseHeaders() }
      )
    }
    const { message, tenantId } = validated
    const history = validateHistory(rawBody.history, 6)

    // Validate tenant ID exists and is a real chef (prevent arbitrary ID probing)
    if (
      !tenantId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)
    ) {
      return new Response(
        encodeSSE({ type: 'error', data: 'Configuration error - please refresh the page.' }),
        { headers: sseHeaders() }
      )
    }

    // Input validation (reuse guardrails — same dangerous content checks)
    const inputCheck = validateRemyInput(message)
    if (!inputCheck.allowed) {
      // Use public-appropriate refusal
      const publicRefusal =
        inputCheck.category === 'dangerous_content' || inputCheck.category === 'abuse'
          ? "I'm here to help with food and events. Let's keep it on topic!"
          : inputCheck.refusal
      return new Response(encodeSSE({ type: 'error', data: publicRefusal }), {
        headers: sseHeaders(),
      })
    }

    // Check Ollama availability
    if (!isOllamaEnabled()) {
      return new Response(
        encodeSSE({
          type: 'error',
          data: "Our AI assistant is currently offline. Sign up to explore ChefFlow's full feature set directly.",
        }),
        { headers: sseHeaders() }
      )
    }

    // Load public context for this chef
    const context = await loadRemyPublicContext(tenantId)
    const contextBlock = formatPublicContext(context)
    const systemPrompt = buildPublicSystemPrompt(contextBlock)
    const conversationHistory = formatHistory(history ?? [])

    // Build message for Ollama
    const fullPrompt = `${conversationHistory}Visitor: ${message}`

    const config = getOllamaConfig()
    const model = getOllamaModel('fast') // Use fast model for public (lighter, faster)
    const ollama = new Ollama({ host: config.baseUrl })

    // Stream response
    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), 60_000) // 60s for public (shorter)

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
              num_predict: 512, // Shorter responses for public
            },
            keep_alive: '30m',
            think: false,
          } as any)

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
                  data: 'Response took too long. Try a shorter question!',
                })
              )
            )
          } else {
            console.error('[remy-public] Streaming error:', err?.message)
            controller.enqueue(
              encoder.encode(
                encodeSSE({
                  type: 'error',
                  data: "Something went wrong. I'll be back shortly!",
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
    console.error('[remy-public] Route error:', err?.message)
    return new Response(
      encodeSSE({
        type: 'error',
        data: 'Something went wrong. Please try again!',
      }),
      { headers: sseHeaders() }
    )
  }
}
