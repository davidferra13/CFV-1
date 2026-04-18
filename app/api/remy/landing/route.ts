// Remy - Landing Page Concierge Streaming API
// UNAUTHENTICATED - for visitors on the public landing page and marketing pages.
// No tenantId required - uses platform-level feature knowledge instead.
// Rate-limited per IP. Routes through configured cloud AI runtime.

import { NextRequest } from 'next/server'
import { Ollama } from 'ollama'
import { isOllamaEnabled, getOllamaConfig, getOllamaModel } from '@/lib/ai/providers'
import { validateRemyInput } from '@/lib/ai/remy-guardrails'
import {
  validateRemyRequestBody,
  validateHistory,
  checkRecipeGenerationBlock,
} from '@/lib/ai/remy-input-validation'
import { buildLandingSystemPrompt } from '@/lib/ai/remy-landing-personality'
import { checkRateLimit } from '@/lib/rateLimit'
import {
  createSurfaceLatencyTracker,
  getSurfaceRuntimeOptions,
  trySurfaceInstantAnswer,
} from '../surface-runtime-utils'

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

// ─── Conversation History ───────────────────────────────────────────────────

function formatHistory(history: Array<{ role: string; content: string }>): string {
  if (history.length === 0) return ''
  const recent = history.slice(-6)
  const formatted = recent
    .map((m) => `${m.role === 'user' ? 'Visitor' : 'Remy'}: ${m.content}`)
    .join('\n')
  return `Previous conversation:\n${formatted}\n\n`
}

// ─── POST Handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const routeStartedAt = Date.now()
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'

    // Rate limit check (Redis-backed - survives serverless cold starts)
    // 5 messages/min rate limit + 10 messages/30min session limit
    try {
      await checkRateLimit(`remy-landing:${ip}`, 5, 60_000)
      await checkRateLimit(`remy-landing-session:${ip}`, 10, 30 * 60_000)
    } catch {
      return new Response(
        encodeSSE({
          type: 'error',
          data: "I'm getting a lot of messages - give me a moment to catch up! Try again in about a minute.",
        }),
        { headers: sseHeaders() }
      )
    }

    const rawBody = await req.json()
    const validated = validateRemyRequestBody(rawBody)
    if (!validated) {
      return new Response(
        encodeSSE({ type: 'error', data: 'Invalid request - please try again.' }),
        { headers: sseHeaders() }
      )
    }
    const { message } = validated
    const history = validateHistory(rawBody.history, 6)

    // Input validation
    const inputCheck = validateRemyInput(message)
    if (!inputCheck.allowed) {
      const publicRefusal =
        inputCheck.category === 'dangerous_content' || inputCheck.category === 'abuse'
          ? "I'm here to help with ChefFlow - let's keep it on topic!"
          : inputCheck.refusal
      return new Response(encodeSSE({ type: 'error', data: publicRefusal }), {
        headers: sseHeaders(),
      })
    }

    // Recipe generation is banned on ALL surfaces (CLAUDE.md: "not ever")
    const recipeBlock = checkRecipeGenerationBlock(message)
    if (recipeBlock) {
      return new Response(encodeSSE({ type: 'error', data: recipeBlock }), {
        headers: sseHeaders(),
      })
    }

    // Check Ollama availability
    if (!isOllamaEnabled()) {
      return new Response(
        encodeSSE({
          type: 'error',
          data: "I'm taking a quick break - check back in a few minutes!",
        }),
        { headers: sseHeaders() }
      )
    }

    const systemPrompt = buildLandingSystemPrompt()
    const conversationHistory = formatHistory(history ?? [])
    const fullPrompt = `${conversationHistory}Visitor: ${message}`
    const { contextScope, tokenBudget } = getSurfaceRuntimeOptions(message)
    const latency = createSurfaceLatencyTracker('landing', contextScope)

    const instant = trySurfaceInstantAnswer('landing', message)
    if (instant) {
      latency.logFastPath('instant')
      return new Response(
        encodeSSE({ type: 'token', data: instant.text }) + encodeSSE({ type: 'done', data: null }),
        { headers: sseHeaders() }
      )
    }

    const config = getOllamaConfig()
    const model = getOllamaModel('fast')
    const ollama = new Ollama({ host: config.baseUrl })

    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), 60_000)

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
              num_predict: tokenBudget,
            },
            keep_alive: '30m',
          } as any)

          for await (const chunk of ollamaStream) {
            if (abortController.signal.aborted) break
            if (chunk.message?.content) {
              latency.markFirstToken()
              controller.enqueue(
                encoder.encode(encodeSSE({ type: 'token', data: chunk.message.content }))
              )
            }
          }

          latency.logDone({ route_ms: Date.now() - routeStartedAt, token_budget: tokenBudget })
          controller.enqueue(encoder.encode(encodeSSE({ type: 'done', data: null })))
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            latency.logError(err)
            controller.enqueue(
              encoder.encode(
                encodeSSE({
                  type: 'error',
                  data: 'Response took too long - try a shorter question!',
                })
              )
            )
          } else {
            latency.logError(err)
            controller.enqueue(
              encoder.encode(
                encodeSSE({
                  type: 'error',
                  data: "Something went wrong - I'll be back shortly!",
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
    console.error('[remy-landing] Route error:', err?.message)
    return new Response(
      encodeSSE({
        type: 'error',
        data: 'Something went wrong - please try again!',
      }),
      { headers: sseHeaders() }
    )
  }
}
