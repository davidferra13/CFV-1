// Remy - Public Layer Streaming API
// UNAUTHENTICATED - for visitors on public-facing pages.
// Rate-limited per IP. No PII involved - could use cloud model,
// but uses Ollama for consistency.

import { NextRequest } from 'next/server'
import { Ollama } from 'ollama'
import { isOllamaEnabled, getOllamaConfig, getOllamaModel } from '@/lib/ai/providers'
import { validateRemyInput } from '@/lib/ai/remy-guardrails'
import {
  validateRemyRequestBody,
  validateHistory,
  checkRecipeGenerationBlock,
  checkHarmfulContentBlock,
  checkOutOfScopeBlock,
  checkDangerousActionBlock,
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
import {
  PublicCloudGatewayError,
  isPublicCloudAiConfigured,
  streamPublicCloudAi,
} from '@/lib/ai/public-cloud-gateway'
import { isPublicCloudAiEnabled } from '@/lib/ai/public-cloud-policy'

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

    // Harmful content block (weapons, violence, drugs, self-harm)
    const harmfulBlock = checkHarmfulContentBlock(message)
    if (harmfulBlock) {
      console.warn('[remy:public] Guard blocked:', {
        guard: 'checkHarmfulContentBlock',
        message: message.slice(0, 200),
      })
      return new Response(encodeSSE({ type: 'error', data: harmfulBlock }), {
        headers: sseHeaders(),
      })
    }

    // Recipe generation is banned on ALL surfaces (CLAUDE.md: "not ever")
    const recipeBlock = checkRecipeGenerationBlock(message)
    if (recipeBlock) {
      console.warn('[remy:public] Guard blocked:', {
        guard: 'checkRecipeGenerationBlock',
        message: message.slice(0, 200),
      })
      return new Response(encodeSSE({ type: 'error', data: recipeBlock }), {
        headers: sseHeaders(),
      })
    }

    // Out-of-scope block (non-business requests)
    const outOfScopeBlock = checkOutOfScopeBlock(message)
    if (outOfScopeBlock) {
      console.warn('[remy:public] Guard blocked:', {
        guard: 'checkOutOfScopeBlock',
        message: message.slice(0, 200),
      })
      return new Response(encodeSSE({ type: 'error', data: outOfScopeBlock }), {
        headers: sseHeaders(),
      })
    }

    // Dangerous action block (delete, developer mode, system introspection)
    const dangerousActionBlock = checkDangerousActionBlock(message)
    if (dangerousActionBlock) {
      console.warn('[remy:public] Guard blocked:', {
        guard: 'checkDangerousActionBlock',
        message: message.slice(0, 200),
      })
      return new Response(encodeSSE({ type: 'error', data: dangerousActionBlock }), {
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

    if (isPublicCloudAiEnabled()) {
      if (!isPublicCloudAiConfigured()) {
        return new Response(
          encodeSSE({
            type: 'error',
            data: "I'm taking a quick break - check back in a few minutes!",
          }),
          { headers: sseHeaders() }
        )
      }

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const token of streamPublicCloudAi({
              taskId: 'chef_public_concierge',
              surface: 'public_chef_profile',
              message,
              history,
              publicContext: {
                businessName: context.businessName,
                chefName: context.chefName,
                serviceArea: context.serviceArea,
                serviceTypes: context.serviceTypes,
                dietaryCapabilities: context.dietaryCapabilities,
              },
              systemPrompt,
              userPrompt: fullPrompt,
              maxTokens: tokenBudget,
            })) {
              latency.markFirstToken()
              controller.enqueue(encoder.encode(encodeSSE({ type: 'token', data: token })))
            }

            latency.logDone({ route_ms: Date.now() - routeStartedAt, token_budget: tokenBudget })
            controller.enqueue(encoder.encode(encodeSSE({ type: 'done', data: null })))
          } catch (err) {
            latency.logError(err)
            const message =
              err instanceof PublicCloudGatewayError
                ? err.publicMessage
                : "Something went wrong - I'll be back shortly!"
            controller.enqueue(encoder.encode(encodeSSE({ type: 'error', data: message })))
          } finally {
            controller.close()
          }
        },
      })

      return new Response(stream, { headers: sseHeaders() })
    }

    const config = getOllamaConfig()
    const model = getOllamaModel('fast') // Use fast model for public (lighter, faster)
    const ollama = new Ollama({ host: config.baseUrl })

    // Stream response
    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), 60_000) // 60s for public (generous for cold start)

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
