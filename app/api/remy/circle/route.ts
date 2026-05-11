// Remy - Circle Layer Streaming API
// AUTHENTICATED - for members of a dinner circle (chefs, clients, guests).
// Dual-tier context: base for everyone, business for chef only.
// Feed mode posts response to hub_messages. Private mode streams only.

import { NextRequest } from 'next/server'
import { streamText, stepCountIs } from 'ai'
import { createOllamaProvider } from '@/lib/ai/ai-provider'
import { buildCircleTools } from '@/lib/ai/remy-tools'
import { requireAuth } from '@/lib/auth/get-user'
import { isOllamaEnabled, getOllamaConfig, getOllamaModel } from '@/lib/ai/providers'
import { validateRemyInput } from '@/lib/ai/remy-guardrails'
import {
  validateRemyRequestBody,
  validateHistory,
  checkRecipeGenerationBlock,
} from '@/lib/ai/remy-input-validation'
import { checkRateLimit } from '@/lib/rateLimit'
import {
  REMY_CIRCLE_PERSONALITY,
  REMY_CIRCLE_TOPIC_GUARDRAILS,
  REMY_CIRCLE_ANTI_INJECTION,
} from '@/lib/ai/remy-circle-personality'
import {
  loadRemyCircleContext,
  formatCircleContext,
  getCircleContextScope,
} from '@/lib/ai/remy-circle-context'
import { postRemyMessage, determineRemyVisibility } from '@/lib/hub/remy-circle-actions'
import { createSurfaceLatencyTracker } from '../surface-runtime-utils'
import { createServerClient } from '@/lib/db/server'
import { REMY_ARCHETYPES } from '@/lib/ai/remy-archetypes'
import { createStreamScanner } from '@/lib/ai/remy-output-guardrails'
import { db } from '@/lib/db'
import { clients } from '@/lib/db/schema/schema'
import { eq } from 'drizzle-orm'

// --- Types ---

interface StreamEvent {
  type: 'token' | 'done' | 'error' | 'visibility'
  data: unknown
}

// --- SSE Helpers ---

function encodeSSE(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

function sseHeaders() {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  }
}

// --- Auth Helper ---

async function requireCircleMember(
  groupId: string,
  authUserId: string
): Promise<{ profileId: string; role: string; tenantId: string }> {
  const db: any = createServerClient({ admin: true })

  // Find the user's hub profile
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single()

  if (!profile) throw new Error('No hub profile found for this user')

  // Check membership
  const { data: membership } = await db
    .from('hub_group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership) throw new Error('Not a member of this circle')

  // Get tenantId from the circle
  const { data: group } = await db.from('hub_groups').select('tenant_id').eq('id', groupId).single()

  if (!group?.tenant_id) throw new Error('Circle has no tenant')

  return {
    profileId: profile.id,
    role: membership.role,
    tenantId: group.tenant_id,
  }
}

// --- System Prompt Builder ---

function buildCircleSystemPrompt(contextBlock: string, archetypeModifier?: string | null): string {
  const parts: string[] = []

  parts.push(REMY_CIRCLE_PERSONALITY)
  if (archetypeModifier) {
    parts.push(`\n## PERSONALITY FLAVOR (inherited from chef's archetype)\n${archetypeModifier}`)
  }
  parts.push(REMY_CIRCLE_TOPIC_GUARDRAILS)
  parts.push(REMY_CIRCLE_ANTI_INJECTION)
  parts.push(`\n${contextBlock}`)

  parts.push(`\nRESPONSE FORMAT:
Write your reply in natural language with markdown formatting (bold, bullets, etc.).
Default to the shortest useful answer.
Answer in the first line.
Use 1 short paragraph or up to 3 bullets by default.
When discussing menu items, add culinary color and knowledge.
Flag dietary concerns prominently.
Keep responses warm and hospitality-forward.`)

  return parts.join('\n')
}

// --- History ---

function formatHistory(
  history: Array<{ role: string; content: string }>,
  memberName: string
): string {
  if (history.length === 0) return ''
  const recent = history.slice(-12)
  const formatted = recent
    .map((m) => `${m.role === 'user' ? memberName : 'Remy'}: ${m.content}`)
    .join('\n')
  return `Previous conversation:\n${formatted}\n\n`
}

// --- POST Handler ---

export async function POST(req: NextRequest) {
  try {
    const routeStartedAt = Date.now()

    // Auth - any authenticated user
    const user = await requireAuth()

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
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const { message } = validated
    const history = validateHistory((rawBody as Record<string, unknown>)?.history, 12)
    const groupId = (rawBody as Record<string, unknown>)?.groupId as string
    const mode = ((rawBody as Record<string, unknown>)?.mode as string) ?? 'feed'

    if (!groupId || typeof groupId !== 'string') {
      return new Response(JSON.stringify({ error: 'groupId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Verify circle membership
    let member: { profileId: string; role: string; tenantId: string }
    try {
      member = await requireCircleMember(groupId, user.id)
    } catch {
      return new Response(JSON.stringify({ error: 'Not a member of this circle' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Input validation
    const inputCheck = validateRemyInput(message)
    if (!inputCheck.allowed) {
      return new Response(
        encodeSSE({
          type: 'error',
          data: inputCheck.refusal ?? "Let's keep it about the food and this dinner!",
        }),
        { status: 400, headers: sseHeaders() }
      )
    }

    const recipeBlock = checkRecipeGenerationBlock(message)
    if (recipeBlock) {
      return new Response(encodeSSE({ type: 'error', data: recipeBlock }), {
        status: 400,
        headers: sseHeaders(),
      })
    }

    // Rate limiting per circle
    try {
      await checkRateLimit(`remy-circle:${groupId}`, 20, 60_000)
    } catch {
      return new Response(
        encodeSSE({
          type: 'error',
          data: 'Slow down - Remy can only handle 20 messages a minute per circle.',
        }),
        { status: 429, headers: sseHeaders() }
      )
    }

    // Check AI runtime
    if (!isOllamaEnabled()) {
      return new Response(
        encodeSSE({
          type: 'error',
          data: 'Remy is taking a quick break - check back in a few minutes!',
        }),
        { headers: sseHeaders() }
      )
    }

    // Determine context scope and visibility
    const contextScope = getCircleContextScope(message, member.role)
    const visibility = determineRemyVisibility(message, member.role)
    const latency = createSurfaceLatencyTracker('circle', contextScope)

    // Load context + other client names for output guardrails (parallel)
    const [ctx, otherClientNames] = await Promise.all([
      loadRemyCircleContext(groupId, member.role, contextScope),
      db
        .select({ fullName: clients.fullName })
        .from(clients)
        .where(eq(clients.tenantId, member.tenantId))
        .then((rows) => rows.map((r) => r.fullName)),
    ])
    const contextBlock = formatCircleContext(ctx)

    // Load chef archetype for personality flavor
    let archetypeModifier: string | null = null
    try {
      const db: any = createServerClient({ admin: true })
      const { data: chefSettings } = await db
        .from('chef_settings')
        .select('remy_archetype')
        .eq('tenant_id', member.tenantId)
        .single()
      if (chefSettings?.remy_archetype) {
        const arch = REMY_ARCHETYPES.find((a) => a.id === chefSettings.remy_archetype)
        if (arch) archetypeModifier = arch.promptModifier
      }
    } catch {
      // No archetype set, use default personality
    }

    const systemPrompt = buildCircleSystemPrompt(contextBlock, archetypeModifier)

    // Get member display name for history
    const memberName = ctx.members.find((m) => m.role === member.role)?.displayName ?? 'Member'
    const conversationHistory = formatHistory(history ?? [], memberName)
    const fullPrompt = `${conversationHistory}${memberName}: ${message}`

    // Token budget based on scope
    const tokenBudget = contextScope === 'minimal' ? 600 : contextScope === 'full' ? 1500 : 1000

    const config = getOllamaConfig()
    const model = getOllamaModel('standard')

    // Emit visibility event so client knows how to render
    const encoder = new TextEncoder()
    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), 30_000)

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Tell client the visibility tier
          controller.enqueue(encoder.encode(encodeSSE({ type: 'visibility', data: visibility })))

          let fullResponse = ''
          const memberDisplayName = ctx.members.find((m) => m.role === member.role)?.displayName
          const outputScanner = createStreamScanner({
            surface: 'circle',
            currentClientName: memberDisplayName ?? undefined,
            otherClientNames,
          })
          let outputBlocked = false

          // AI SDK streamText with limited read-only tools for circle
          const ollamaProvider = createOllamaProvider(config.baseUrl)
          const circleTools = buildCircleTools(member.tenantId)
          const aiResult = streamText({
            model: ollamaProvider(model),
            system: systemPrompt,
            messages: [{ role: 'user', content: fullPrompt }],
            tools: circleTools,
            stopWhen: stepCountIs(3),
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
                fullResponse += scanResult.text
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
                fullResponse += scanFlush.text
                controller.enqueue(
                  encoder.encode(encodeSSE({ type: 'token', data: scanFlush.text }))
                )
              }
            }
          }

          // Post to circle feed if in feed mode (non-blocking)
          if (!outputBlocked && mode === 'feed' && fullResponse.trim()) {
            postRemyMessage({
              groupId,
              tenantId: member.tenantId,
              body: fullResponse.trim(),
              visible: visibility,
              intent: 'question',
              triggeredByMessageId: undefined,
            }).catch((err) => {
              console.error('[remy-circle] Failed to post feed message:', err?.message)
            })
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
                encodeSSE({ type: 'error', data: "Something went wrong - I'll be back shortly!" })
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
    if (err?.message?.includes('Unauthorized') || err?.digest === 'NEXT_REDIRECT') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.error('[remy-circle] Route error:', err?.message)
    return new Response(
      encodeSSE({ type: 'error', data: 'Something went wrong - please try again!' }),
      { headers: sseHeaders() }
    )
  }
}
