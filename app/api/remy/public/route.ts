// Remy - Public Layer Streaming API
// UNAUTHENTICATED - for visitors on public-facing pages.
// Rate-limited per IP. No PII involved - could use cloud model,
// but uses Ollama for consistency.

import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { createOllamaProvider } from '@/lib/ai/ai-provider'
import { isOllamaEnabled, getOllamaConfig, getOllamaModel } from '@/lib/ai/providers'
import { validateRemyInput } from '@/lib/ai/remy-guardrails'
import {
  validateRemyRequestBody,
  validateHistory,
  checkRecipeGenerationBlock,
} from '@/lib/ai/remy-input-validation'
import {
  REMY_PUBLIC_PERSONALITY,
  REMY_PUBLIC_TOPIC_GUARDRAILS,
  REMY_PUBLIC_ANTI_INJECTION,
} from '@/lib/ai/remy-public-personality'
import { loadRemyPublicContext, formatPublicContext } from '@/lib/ai/remy-public-context'
import { checkRateLimit } from '@/lib/rateLimit'
import {
  createSurfaceLatencyTracker,
  getSurfaceRuntimeOptions,
  trySurfaceInstantAnswer,
} from '../surface-runtime-utils'
import { createStreamScanner } from '@/lib/ai/remy-output-guardrails'

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
Default to the shortest useful answer.
Answer in the first line.
Use 1 short paragraph or up to 3 bullets by default.
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
    const routeStartedAt = Date.now()
    // Get client IP for rate limiting
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'

    // Rate limit check (Redis-backed - survives serverless cold starts)
    try {
      await checkRateLimit(`remy-public:${ip}`, 5, 60_000)
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
    const { message, tenantId } = validated
    const history = validateHistory(rawBody.history, 6)

    // Validate tenant ID
    if (!tenantId) {
      return new Response(
        encodeSSE({ type: 'error', data: 'Configuration error - please refresh the page.' }),
        { headers: sseHeaders() }
      )
    }

    // Input validation (reuse guardrails - same dangerous content checks)
    const inputCheck = validateRemyInput(message)
    if (!inputCheck.allowed) {
      // Use public-appropriate refusal
      const publicRefusal =
        inputCheck.category === 'dangerous_content' || inputCheck.category === 'abuse'
          ? "I'm here to help with food and events - let's keep it on topic!"
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

    // Load public context for this chef
    const context = await loadRemyPublicContext(tenantId)
    const { contextScope, tokenBudget } = getSurfaceRuntimeOptions(message)
    const latency = createSurfaceLatencyTracker('public', contextScope)
    const instant = trySurfaceInstantAnswer('public', message, {
      businessName: context.businessName,
      chefName: context.chefName,
      serviceArea: context.serviceArea,
      serviceTypes: context.serviceTypes,
      dietaryCapabilities: context.dietaryCapabilities,
    })
    if (instant) {
      latency.logFastPath('instant')
      return new Response(
        encodeSSE({ type: 'token', data: instant.text }) + encodeSSE({ type: 'done', data: null }),
        { headers: sseHeaders() }
      )
    }

    const contextBlock = formatPublicContext(context)
    const systemPrompt = buildPublicSystemPrompt(contextBlock)
    const conversationHistory = formatHistory(history ?? [])

    // Build message for Ollama
    const fullPrompt = `${conversationHistory}Visitor: ${message}`

    const config = getOllamaConfig()
    const model = getOllamaModel('fast') // Use fast model for public (lighter, faster)

    // Stream response via AI SDK (no tools for public surface)
    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), 60_000) // 60s for public (generous for cold start)

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const outputScanner = createStreamScanner({ surface: 'public' })
          let outputBlocked = false

          const ollamaProvider = createOllamaProvider(config.baseUrl)
          const aiResult = streamText({
            model: ollamaProvider(model),
            system: systemPrompt,
            messages: [{ role: 'user', content: fullPrompt }],
            temperature: 0.7,
            maxOutputTokens: tokenBudget,
            abortSignal: abortController.signal,
          })

          for await (const token of aiResult.textStream) {
            if (abortController.signal.aborted || outputBlocked) break
            if (token) {
              latency.markFirstToken()
              const scanResult = outputScanner.feed(token)
              if (scanResult) {
                if (!scanResult.safe) {
                  controller.enqueue(
                    encoder.encode(encodeSSE({ type: 'error', data: scanResult.text }))
                  )
                  controller.close()
                  outputBlocked = true
                  break
                }
                controller.enqueue(
                  encoder.encode(encodeSSE({ type: 'token', data: scanResult.text }))
                )
              }
            }
          }

          // Flush remaining scanner buffer
          if (!outputBlocked) {
            const scanFlush = outputScanner.flush()
            if (scanFlush) {
              if (!scanFlush.safe) {
                controller.enqueue(
                  encoder.encode(encodeSSE({ type: 'error', data: scanFlush.text }))
                )
                outputBlocked = true
              } else {
                controller.enqueue(
                  encoder.encode(encodeSSE({ type: 'token', data: scanFlush.text }))
                )
              }
            }
          }

          if (!outputBlocked) {
            latency.logDone({ route_ms: Date.now() - routeStartedAt, token_budget: tokenBudget })
            controller.enqueue(encoder.encode(encodeSSE({ type: 'done', data: null })))
          }
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
    console.error('[remy-public] Route error:', err?.message)
    return new Response(
      encodeSSE({
        type: 'error',
        data: 'Something went wrong - please try again!',
      }),
      { headers: sseHeaders() }
    )
  }
}
