// Remy - Client Layer Streaming API
// AUTHENTICATED - for clients in the client portal.
// Routes through configured cloud AI runtime. Scoped to the authenticated client's own data only.

import { NextRequest } from 'next/server'
import { Ollama } from 'ollama'
import { requireClient } from '@/lib/auth/get-user'
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
import { checkRateLimit } from '@/lib/rateLimit'
import {
  REMY_CLIENT_PERSONALITY,
  REMY_CLIENT_TOPIC_GUARDRAILS,
  REMY_CLIENT_ANTI_INJECTION,
} from '@/lib/ai/remy-client-personality'
import { loadRemyClientContext, formatClientContext } from '@/lib/ai/remy-client-context'
import { suggestClientNavFromWorkGraph } from '@/lib/client-work-graph/build'
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

type NavSuggestion = {
  label: string
  href: string
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
Default to the shortest useful answer.
Answer in the first line.
Use 1 short paragraph or up to 3 bullets by default.
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

function extractNavSuggestions(content: string): NavSuggestion[] {
  const navMatch = content.match(/NAV_SUGGESTIONS:\s*(\[[\s\S]*?\])/)
  if (!navMatch) return []

  try {
    const parsed = JSON.parse(navMatch[1]) as Array<Record<string, unknown>>
    return parsed
      .filter((item) => typeof item.label === 'string' && typeof item.href === 'string')
      .map((item) => ({
        label: item.label as string,
        href: item.href as string,
      }))
  } catch {
    return []
  }
}

// ─── POST Handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const routeStartedAt = Date.now()
    // Auth - must be an authenticated client
    const user = await requireClient()

    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Request body must be valid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const validated = validateRemyRequestBody(rawBody)
    if (!validated) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request body - message field is required and must be a non-empty string',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    const { message } = validated
    const history = validateHistory((rawBody as Record<string, unknown>)?.history, 8)

    // Input validation
    const inputCheck = validateRemyInput(message)
    if (!inputCheck.allowed) {
      const clientRefusal =
        inputCheck.category === 'dangerous_content' || inputCheck.category === 'abuse'
          ? "I'm here to help with your events and dining - let's keep it on topic!"
          : inputCheck.refusal
      return new Response(encodeSSE({ type: 'error', data: clientRefusal }), {
        status: 400,
        headers: sseHeaders(),
      })
    }

    // Harmful content block (weapons, violence, drugs, self-harm)
    const harmfulBlock = checkHarmfulContentBlock(message)
    if (harmfulBlock) {
      console.warn('[remy:client] Guard blocked:', {
        guard: 'checkHarmfulContentBlock',
        clientId: user.entityId,
        message: message.slice(0, 200),
      })
      return new Response(encodeSSE({ type: 'error', data: harmfulBlock }), {
        status: 400,
        headers: sseHeaders(),
      })
    }

    // Hard block recipe generation requests in client lane before any model call.
    const recipeBlock = checkRecipeGenerationBlock(message)
    if (recipeBlock) {
      console.warn('[remy:client] Guard blocked:', {
        guard: 'checkRecipeGenerationBlock',
        clientId: user.entityId,
        message: message.slice(0, 200),
      })
      return new Response(encodeSSE({ type: 'error', data: recipeBlock }), {
        status: 400,
        headers: sseHeaders(),
      })
    }

    // Out-of-scope block (non-business requests)
    const outOfScopeBlock = checkOutOfScopeBlock(message)
    if (outOfScopeBlock) {
      console.warn('[remy:client] Guard blocked:', {
        guard: 'checkOutOfScopeBlock',
        clientId: user.entityId,
        message: message.slice(0, 200),
      })
      return new Response(encodeSSE({ type: 'error', data: outOfScopeBlock }), {
        status: 400,
        headers: sseHeaders(),
      })
    }

    // Dangerous action block (delete, developer mode, system introspection)
    const dangerousActionBlock = checkDangerousActionBlock(message)
    if (dangerousActionBlock) {
      console.warn('[remy:client] Guard blocked:', {
        guard: 'checkDangerousActionBlock',
        clientId: user.entityId,
        message: message.slice(0, 200),
      })
      return new Response(encodeSSE({ type: 'error', data: dangerousActionBlock }), {
        status: 400,
        headers: sseHeaders(),
      })
    }

    // Rate limiting (shared limiter with in-memory fallback)
    try {
      await checkRateLimit(`remy-client:${user.tenantId!}`, 12, 60_000)
    } catch {
      return new Response(
        encodeSSE({
          type: 'error',
          data: 'Whoa, slow down - I can only handle 12 messages a minute. Try again shortly.',
        }),
        {
          status: 429,
          headers: sseHeaders(),
        }
      )
    }

    // Check AI runtime availability via configured endpoint (cloud in production)
    if (!isOllamaEnabled()) {
      return new Response(
        encodeSSE({
          type: 'error',
          data: "I'm taking a quick break - check back in a few minutes!",
        }),
        { headers: sseHeaders() }
      )
    }

    // Load client-scoped context
    const context = await loadRemyClientContext(user.entityId, user.tenantId!)
    const { contextScope, tokenBudget } = getSurfaceRuntimeOptions(message)
    const latency = createSurfaceLatencyTracker('client', contextScope)
    const instant = trySurfaceInstantAnswer('client', message, {
      clientName: context.clientName,
      upcomingEventCount: context.upcomingEvents.length,
      pendingQuoteCount: context.pendingQuotes.length,
      openInquiryCount: context.openInquiries,
    })
    if (instant) {
      latency.logFastPath('instant')
      return new Response(
        encodeSSE({ type: 'token', data: instant.text }) + encodeSSE({ type: 'done', data: null }),
        { headers: sseHeaders() }
      )
    }

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
    const timeout = setTimeout(() => abortController.abort(), 30_000) // 30s

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = ''
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
              fullResponse += chunk.message.content
              controller.enqueue(
                encoder.encode(encodeSSE({ type: 'token', data: chunk.message.content }))
              )
            }
          }

          if (extractNavSuggestions(fullResponse).length === 0) {
            const navSuggestions = suggestClientNavFromWorkGraph(message, context.workGraph)
            if (navSuggestions.length > 0) {
              controller.enqueue(
                encoder.encode(
                  encodeSSE({
                    type: 'token',
                    data: `\n\nNAV_SUGGESTIONS: ${JSON.stringify(navSuggestions)}`,
                  })
                )
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
        data: 'Something went wrong - please try again!',
      }),
      { headers: sseHeaders() }
    )
  }
}
