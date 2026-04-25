// Remy - Streaming Chat API Route
// Processes chef messages with full business context via cloud AI runtime.
// Uses Server-Sent Events (SSE) to stream token-by-token responses.

import { NextRequest } from 'next/server'
import { Ollama } from 'ollama'
import { requireChef } from '@/lib/auth/get-user'
import { loadRemyContext, resolveMessageEntities } from '@/lib/ai/remy-context'
import { classifyIntent } from '@/lib/ai/remy-classifier'
import { runCommand } from '@/lib/ai/command-orchestrator'
import { getTaskName } from '@/lib/ai/command-task-descriptions'
import { routeForRemy } from '@/lib/ai/llm-router'
// Pi retired - no cross-monitor endpoint snapshot needed
import { getRemyArchetype, getAiPreferences } from '@/lib/ai/privacy-actions'
import { getSurveyState } from '@/lib/ai/remy-survey-actions'
import { buildSurveyPromptSection } from '@/lib/ai/remy-survey-prompt'
import type { SurveyState } from '@/lib/ai/remy-survey-constants'
import { getCulinaryProfileForPrompt } from '@/lib/ai/chef-profile-actions'
import { getFavoriteChefs } from '@/lib/favorite-chefs/actions'
import { validateRemyInput } from '@/lib/ai/remy-guardrails'
import {
  validateRemyRequestBody,
  validateHistory,
  sanitizeErrorForClient,
  checkRecipeGenerationBlock,
  checkOutOfScopeBlock,
  checkDangerousActionBlock,
} from '@/lib/ai/remy-input-validation'
import { isRemyBlocked, isRemyAdmin, logRemyAbuse } from '@/lib/ai/remy-abuse-actions'
import { acquireInteractiveLock, releaseInteractiveLock } from '@/lib/ai/queue'
import { checkRateLimit } from '@/lib/rateLimit'
import {
  loadRelevantMemories,
  listRemyMemories,
  addRemyMemoryManual,
} from '@/lib/ai/remy-memory-actions'
import { recordRemyMetric } from '@/lib/ai/remy-metrics'
import { searchRemyConversationSummaries } from '@/lib/ai/mempalace-bridge'
import type { RemyMessage, RemyTaskResult, RemyMemoryItem } from '@/lib/ai/remy-types'
import type { MemoryCategory } from '@/lib/ai/remy-memory-types'
import {
  buildGreetingFastPath,
  OLLAMA_STREAM_TIMEOUT_MS,
  detectMemoryIntent,
  encodeSSE,
  extractNavSuggestions,
  suggestFollowUpActions,
  formatCategoryLabel,
  getOperatorResponseTokenBudget,
  shouldUseThinking,
  sseErrorResponse,
  sseHeaders,
  summarizeTaskResults,
  ThinkingBlockFilter,
} from './route-runtime-utils'
import {
  buildRemySystemPrompt,
  formatConversationHistory,
  determineContextScope,
  getEarlyScopeHint,
} from './route-prompt-utils'
import {
  buildStreamDynamicPersonalityBlock,
  completeStreamOnboardingTurn,
  encodeCuratedStreamMessage,
  getCuratedStreamGreeting,
  getCuratedStreamReplyForMessage,
  getStreamOnboardingStage,
} from './route-personality-utils'
import { tryInstantAnswer } from './route-instant-answers'
import { parseTaskChain, looksLikeChain } from '@/lib/ai/remy-chain-parser'
import {
  scanReceipt,
  formatReceiptForConfirmation,
  analyzeDishPhoto,
  formatDishPhotoResponse,
  processVoiceMemo,
} from '@/lib/ai/remy-vision-actions'
import { formatVoiceMemoResponse } from '@/lib/ai/voice-memo-format'

//  POST Handler

async function getRemyRuntimeState(
  tenantId: string
): Promise<{ allowed: boolean; message?: string }> {
  const prefs = await getAiPreferences()
  if (prefs && !prefs.remy_enabled) {
    return {
      allowed: false,
      message: 'Remy is disabled. You can re-enable it in Settings > Privacy & Data.',
    }
  }
  return { allowed: true }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireChef()

    // Parallelize: runtime state check, body parsing, and admin check are independent
    const [runtimeState, rawBody, admin] = await Promise.all([
      getRemyRuntimeState(user.tenantId!),
      req.json().catch(() => null as unknown),
      isRemyAdmin(),
    ])

    if (!runtimeState.allowed) {
      return sseErrorResponse(runtimeState.message ?? 'Remy is disabled for this account.', 403)
    }
    if (!rawBody) {
      return sseErrorResponse('Request body must be valid JSON.', 400)
    }
    const validated = validateRemyRequestBody(rawBody)
    if (!validated) {
      return sseErrorResponse('Invalid request - please try again.', 400)
    }
    const {
      message,
      currentPage,
      recentPages,
      recentActions,
      recentErrors,
      sessionMinutes,
      activeForm,
    } = validated
    const rawRecord =
      rawBody && typeof rawBody === 'object' ? (rawBody as Record<string, unknown>) : {}
    // Cross-chat digest is optional - passed through without validation (plain string)
    const otherChannelDigest =
      typeof rawRecord.otherChannelDigest === 'string'
        ? rawRecord.otherChannelDigest.slice(0, 600)
        : null
    // Previous session topics - client-side summary of last conversation for continuity
    const previousSessionTopics =
      rawRecord.previousSessionTopics &&
      typeof rawRecord.previousSessionTopics === 'object' &&
      'title' in (rawRecord.previousSessionTopics as Record<string, unknown>) &&
      'topics' in (rawRecord.previousSessionTopics as Record<string, unknown>)
        ? (rawRecord.previousSessionTopics as {
            title: string
            topics: string[]
            lastActiveAt: string
          })
        : null
    // Client-provided browser summaries are kept only as fallback when MemPalace is unavailable.
    const fallbackRecentConversationSummaries = Array.isArray(rawRecord.recentConversationSummaries)
      ? (
          rawRecord.recentConversationSummaries as Array<{ summary: string; generatedAt: string }>
        ).slice(0, 5)
      : null
    const history = validateHistory(rawRecord.history, 20) as RemyMessage[]

    //  GUARDRAILS (block + rate limit parallelized for non-admins)
    if (!admin) {
      const [blockStatus, rateLimited] = await Promise.all([
        isRemyBlocked(),
        checkRateLimit(`remy-stream:${user.tenantId!}`, 30, 60_000)
          .then(() => false)
          .catch(() => true),
      ])
      if (blockStatus.blocked) {
        return sseErrorResponse(
          'Your access to Remy has been temporarily suspended due to repeated policy violations.',
          403
        )
      }
      if (rateLimited) {
        return sseErrorResponse(
          'Whoa, slow down chef - I can only handle 30 messages a minute. Give me a moment and try again.',
          429
        )
      }

      const inputCheck = validateRemyInput(message)
      if (!inputCheck.allowed) {
        if (inputCheck.severity) {
          logRemyAbuse({
            severity: inputCheck.severity,
            category: inputCheck.category ?? 'unknown',
            blockedMessage: message,
            guardrailMatched: inputCheck.matchedPattern,
          }).catch((err) => console.error('[non-blocking] Abuse logging failed', err))
        }
        return sseErrorResponse(inputCheck.refusal ?? 'That request is not allowed.', 400)
      }
    }

    //  RECIPE GENERATION BLOCK (hard rule - AI never generates recipes)
    const recipeBlock = checkRecipeGenerationBlock(message)
    if (recipeBlock) {
      // Return as a friendly Remy chat response, not an error
      const body =
        encodeSSE({ type: 'token', data: recipeBlock }) + encodeSSE({ type: 'done', data: null })
      return new Response(body, { headers: sseHeaders() })
    }

    //  OUT-OF-SCOPE BLOCK (non-business requests)
    const outOfScopeBlock = checkOutOfScopeBlock(message)
    if (outOfScopeBlock) {
      // Return as a friendly Remy chat response, not an error
      const body =
        encodeSSE({ type: 'token', data: outOfScopeBlock }) +
        encodeSSE({ type: 'done', data: null })
      return new Response(body, { headers: sseHeaders() })
    }

    //  DANGEROUS ACTION BLOCK (delete, developer mode, system introspection)
    const dangerousActionBlock = checkDangerousActionBlock(message)
    if (dangerousActionBlock) {
      // Return as a friendly Remy refusal, not an error
      const body =
        encodeSSE({ type: 'token', data: dangerousActionBlock }) +
        encodeSSE({ type: 'done', data: null })
      return new Response(body, { headers: sseHeaders() })
    }

    const curatedReply = await getCuratedStreamReplyForMessage(user.tenantId!, message)
    if (curatedReply) {
      return new Response(encodeCuratedStreamMessage(curatedReply), { headers: sseHeaders() })
    }

    //  VISION PATH (4A: receipt scanning, 4B: dish photos)
    const imageBase64 =
      typeof rawRecord.imageBase64 === 'string' && rawRecord.imageBase64.length > 100
        ? (rawRecord.imageBase64 as string)
        : null
    const imageIntent =
      typeof rawRecord.imageIntent === 'string'
        ? (rawRecord.imageIntent as 'receipt' | 'dish' | 'auto')
        : 'auto'

    if (imageBase64) {
      try {
        // Determine intent: explicit from client, or auto-detect from message text
        let resolvedIntent = imageIntent
        if (resolvedIntent === 'auto') {
          const lower = message.toLowerCase()
          const receiptSignals =
            /receipt|expense|grocery|shopping|store|purchase|bought|cost|total|scan/i
          resolvedIntent = receiptSignals.test(lower) ? 'receipt' : 'dish'
        }

        let responseText: string
        if (resolvedIntent === 'receipt') {
          const receiptData = await scanReceipt(imageBase64)
          // Try to match to an upcoming event for context
          const eventHint = message
            .match(/for\s+(.+?)(?:\s*event|\s*dinner|\s*party|$)/i)?.[1]
            ?.trim()
          responseText = await formatReceiptForConfirmation(receiptData, eventHint || undefined)
        } else {
          const dishData = await analyzeDishPhoto(imageBase64)
          responseText = await formatDishPhotoResponse(dishData)
        }

        const body =
          encodeSSE({ type: 'intent', data: 'vision' }) +
          encodeSSE({ type: 'token', data: responseText }) +
          encodeSSE({ type: 'done', data: null })
        return new Response(body, { headers: sseHeaders() })
      } catch (err) {
        const isOllama =
          err instanceof Error &&
          (err.message.includes('Ollama') || err.message.includes('ECONNREFUSED'))
        return new Response(
          encodeSSE({
            type: 'error',
            data: isOllama
              ? 'Vision analysis is temporarily unavailable. Try again in a moment, or describe what you see instead.'
              : 'Failed to analyze the image. Try again or describe what you see instead.',
          }),
          { headers: sseHeaders() }
        )
      }
    }

    //  AUDIO PATH (voice memos - Gemma 4 native audio processing)
    const audioBase64 =
      typeof rawRecord.audioBase64 === 'string' && rawRecord.audioBase64.length > 100
        ? (rawRecord.audioBase64 as string)
        : null

    if (audioBase64) {
      try {
        const memoData = await processVoiceMemo(audioBase64)
        const responseText = formatVoiceMemoResponse(memoData)

        const body =
          encodeSSE({ type: 'intent', data: 'audio' }) +
          encodeSSE({ type: 'token', data: responseText }) +
          encodeSSE({ type: 'done', data: null })
        return new Response(body, { headers: sseHeaders() })
      } catch (err) {
        const isOllama =
          err instanceof Error &&
          (err.message.includes('Ollama') || err.message.includes('ECONNREFUSED'))
        return new Response(
          encodeSSE({
            type: 'error',
            data: isOllama
              ? 'Audio processing is temporarily unavailable. Try again in a moment, or type out your notes instead.'
              : 'Failed to process the audio. Try again or type out your notes instead.',
          }),
          { headers: sseHeaders() }
        )
      }
    }

    //  MEMORY PATH (no streaming needed)
    const memoryIntent = detectMemoryIntent(message)
    if (memoryIntent === 'list') {
      const memories = await listRemyMemories({ limit: 200 })
      const runtimeMemoryCount = memories.filter((memory) => !memory.editable).length
      const memoryItems: RemyMemoryItem[] = memories.map((m) => ({
        id: m.id,
        category: m.category,
        content: m.content,
        importance: m.importance,
        accessCount: m.accessCount,
        relatedClientId: m.relatedClientId,
        relatedClientName: m.relatedClientName,
        createdAt: m.createdAt,
        source: m.source,
        editable: m.editable,
      }))

      let text: string
      if (memories.length === 0) {
        text =
          'I don\'t have any memories saved yet. As we chat, I\'ll pick up on your preferences, client details, and business rules - or you can tell me directly. Try saying "remember that I prefer organic produce" to add one.'
      } else {
        const grouped = new Map<string, typeof memories>()
        for (const mem of memories) {
          if (!grouped.has(mem.category)) grouped.set(mem.category, [])
          grouped.get(mem.category)!.push(mem)
        }
        const lines: string[] = [`Here's everything I remember (${memories.length} memories).\n`]
        if (runtimeMemoryCount > 0) {
          lines.push(
            '_Runtime file memories come from `memory/runtime/remy.json`. Edit that file in VS Code and they will be picked up on the next message._\n'
          )
        } else {
          lines.push('_Use the X button to delete any memory you no longer want me to keep._\n')
        }
        for (const [category, items] of grouped) {
          lines.push(`**${formatCategoryLabel(category)}**`)
          for (const item of items) {
            const sourceNote = item.editable ? '' : ' _(VS Code)_'
            lines.push(`- ${item.content}${item.importance >= 8 ? ' [ALERT]' : ''}${sourceNote}`)
          }
          lines.push('')
        }
        lines.push(
          '_To add a memory, say "remember that..." followed by the fact. Runtime file memories stay read-only in the app._'
        )
        text = lines.join('\n')
      }

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(encodeSSE({ type: 'intent', data: 'memory' })))
          controller.enqueue(encoder.encode(encodeSSE({ type: 'token', data: text })))
          controller.enqueue(encoder.encode(encodeSSE({ type: 'memories', data: memoryItems })))
          controller.enqueue(encoder.encode(encodeSSE({ type: 'done', data: null })))
          controller.close()
        },
      })
      return new Response(stream, { headers: sseHeaders() })
    }

    if (memoryIntent === 'add') {
      let fact = message
      const triggers = [
        /remember\s+that\s+/i,
        /remember\s*:\s*/i,
        /keep\s+in\s+mind\s+(that\s+)?/i,
        /don'?t\s+forget\s+(that\s+)?/i,
        /note\s+that\s+/i,
        /add\s+(a\s+)?memory\s*:?\s*/i,
        /save\s+that\s+/i,
      ]
      for (const t of triggers) fact = fact.replace(t, '')
      fact = fact.trim()

      if (!fact || fact.length < 3) {
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(encodeSSE({ type: 'intent', data: 'memory' })))
            controller.enqueue(
              encoder.encode(
                encodeSSE({
                  type: 'token',
                  data: 'What should I remember? Try something like "remember that my client is vegetarian" or "remember that I charge $150/person for tasting menus."',
                })
              )
            )
            controller.enqueue(encoder.encode(encodeSSE({ type: 'done', data: null })))
            controller.close()
          },
        })
        return new Response(stream, { headers: sseHeaders() })
      }

      let category: MemoryCategory = 'chef_preference'
      const lower = fact.toLowerCase()
      // Client-related: names, pronouns, dietary info, relationship details
      if (
        /\b(client|customer|they|their|he|she|his|her|allergic|allergy|vegetarian|vegan|gluten|lactose|nut|shellfish|celiac|kosher|halal|family|couple|husband|wife|daughter|son|likes|prefers|hates|loves|favorite|anniversary|birthday)\b/i.test(
          lower
        )
      )
        category = 'client_insight'
      // Pricing: rates, costs, margins, financial patterns
      else if (
        /\b(price|charge|cost|rate|per\s+person|per\s+head|margin|quote|minimum|deposit|flat\s+fee|hourly|tip|gratuity|markup|food\s+cost|overhead)\b/i.test(
          lower
        )
      )
        category = 'pricing_pattern'
      // Scheduling: days, times, availability, booking patterns
      else if (
        /\b(schedule|book|saturday|sunday|monday|tuesday|wednesday|thursday|friday|morning|evening|afternoon|night|day\s+before|day\s+of|lead\s+time|advance|last\s+minute|buffer|travel\s+time|off\s+day|vacation|blackout)\b/i.test(
          lower
        )
      )
        category = 'scheduling_pattern'
      // Communication: how they write, email style, preferences
      else if (
        /\b(email|draft|message|write|tone|formal|casual|text|call|phone|respond|reply|follow\s+up|signature|sign\s+off|greeting|close)\b/i.test(
          lower
        )
      )
        category = 'communication_style'
      // Business rules: hard constraints, policies, never/always rules
      else if (
        /\b(never|always|rule|policy|require|must|won'?t|don'?t|refuse|only|no\s+exceptions|non-?negotiable|standard|guarantee|insurance|liability|contract)\b/i.test(
          lower
        )
      )
        category = 'business_rule'
      // Culinary: food preferences, techniques, ingredients, kitchen
      else if (
        /\b(recipe|cook|dish|ingredient|organic|sauce|braise|sear|menu|plating|garnish|seasoning|spice|herb|wine|pairing|ferment|smoke|cure|sous\s+vide|grill|bake|roast|fry|local|farm|seasonal|forage|butcher|fishmonger|purveyor|vendor|supplier)\b/i.test(
          lower
        )
      )
        category = 'culinary_note'
      // Workflow: operational patterns, processes, routines
      else if (
        /\b(workflow|prep|shop|process|order|system|routine|checklist|setup|breakdown|cleanup|station|equipment|kit|cooler|transport|pack|label|store|freeze|thaw|batch|mise\s+en\s+place)\b/i.test(
          lower
        )
      )
        category = 'workflow_preference'

      await addRemyMemoryManual({ content: fact, category, importance: 5 })

      const text = `Got it - I'll remember that. Saved under **${formatCategoryLabel(category)}**.\n\n- ${fact}\n\nYou can say "show my memories" anytime to review or clean up what I know.`
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(encodeSSE({ type: 'intent', data: 'memory' })))
          controller.enqueue(encoder.encode(encodeSSE({ type: 'token', data: text })))
          controller.enqueue(encoder.encode(encodeSSE({ type: 'done', data: null })))
          controller.close()
        },
      })
      return new Response(stream, { headers: sseHeaders() })
    }

    //  WEATHER PATH (6A: on-demand event weather forecasts - no Ollama needed)
    const weatherRegex =
      /(?:weather|forecast)\s+(?:for|at|look\s+like\s+for)\s+(?:my|the|this|next|upcoming)\s+event/i
    if (weatherRegex.test(message)) {
      try {
        const { getWeatherAlerts, formatWeatherAlerts } = await import('@/lib/ai/remy-weather')
        const alerts = await getWeatherAlerts(user.tenantId!)
        const text = await formatWeatherAlerts(alerts)
        const body =
          encodeSSE({ type: 'intent', data: 'question' }) +
          encodeSSE({ type: 'token', data: text }) +
          encodeSSE({ type: 'done', data: null })
        return new Response(body, { headers: sseHeaders() })
      } catch (err) {
        console.error('[remy] Weather fetch failed:', err)
        const body =
          encodeSSE({ type: 'intent', data: 'question' }) +
          encodeSSE({
            type: 'token',
            data: "Couldn't fetch weather data right now. The Open-Meteo API might be down - try again in a few minutes.",
          }) +
          encodeSSE({ type: 'done', data: null })
        return new Response(body, { headers: sseHeaders() })
      }
    }

    //  TRAVEL TIME PATH (6B: on-demand travel estimates - no Ollama needed)
    const travelRegex =
      /(?:travel\s+time|driving\s+time|back.to.back|how\s+(?:long|far)\s+(?:between|to\s+get)|commute|drive\s+between)\s*(?:my\s+)?event/i
    if (travelRegex.test(message)) {
      try {
        const { getTravelEstimates, formatTravelEstimates } =
          await import('@/lib/ai/remy-travel-time')
        const estimates = await getTravelEstimates(user.tenantId!)
        const text = await formatTravelEstimates(estimates)
        const body =
          encodeSSE({ type: 'intent', data: 'question' }) +
          encodeSSE({ type: 'token', data: text }) +
          encodeSSE({ type: 'done', data: null })
        return new Response(body, { headers: sseHeaders() })
      } catch (err) {
        console.error('[remy] Travel time fetch failed:', err)
        const body =
          encodeSSE({ type: 'intent', data: 'question' }) +
          encodeSSE({
            type: 'token',
            data: "Couldn't calculate travel times right now. The routing API might be down - try again in a few minutes.",
          }) +
          encodeSSE({ type: 'done', data: null })
        return new Response(body, { headers: sseHeaders() })
      }
    }

    //  GREETING FAST-PATH: skip Ollama entirely for simple greetings
    // "hi", "hey", "hello", etc. don't need classification, memories, archetype,
    // culinary profile, or any LLM call. Only needs lightweight context for the
    // proactive snapshot (events, payments, inquiries). Context is cached (5 min TTL).
    const GREETING_REGEX =
      /^(?:good\s+morning|good\s+afternoon|good\s+evening|morning|afternoon|evening|hey|hi|hello|yo|sup|what'?s?\s+up)\s*[!.?]*$/i
    if (GREETING_REGEX.test(message.trim())) {
      const curatedGreeting = await getCuratedStreamGreeting(user.tenantId!)
      if (curatedGreeting) {
        return new Response(encodeCuratedStreamMessage(curatedGreeting), { headers: sseHeaders() })
      }

      // Keep greetings truly instant. Full context loading can stall on slow
      // database or enrichment calls, which should never block a simple "hi".
      const greetingText = buildGreetingFastPath()
      const body =
        encodeSSE({ type: 'intent', data: 'question' }) +
        encodeSSE({ type: 'token', data: greetingText }) +
        encodeSSE({ type: 'done', data: null })
      return new Response(body, { headers: sseHeaders() })
    }

    //  INTERACTIVE LOCK: pause background worker while Remy is streaming
    // This prevents the AI queue worker from competing for Ollama while
    // we're streaming a response. Released in the finally block.
    acquireInteractiveLock()

    //  MAIN PATH: classify + load context
    // Early scope hint: determine context scope from message text BEFORE classification.
    // For minimal scope (greetings, how-to, short questions), skip 31 Tier 2 DB queries.
    const earlyScopeHint = getEarlyScopeHint(message)

    // Hard timeout: if the entire pre-stream setup takes >30s, bail out.
    // Gemma 4 loads fast. Classifier + context + memories takes 2-5s.
    const setupTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Pre-stream setup timed out after 30s')), 30_000)
    )

    let context: Awaited<ReturnType<typeof loadRemyContext>>
    let classification: Awaited<ReturnType<typeof classifyIntent>>
    let memories: Awaited<ReturnType<typeof loadRelevantMemories>>
    let culinaryProfile: string | undefined
    let favoriteChefsList: string | undefined
    let archetypeId: string | null = null
    let surveyState: SurveyState | null = null
    let recentConversationSummaries = fallbackRecentConversationSummaries
    let onboardingStage: Awaited<ReturnType<typeof getStreamOnboardingStage>> = null

    try {
      const [
        ctx,
        cls,
        mems,
        profile,
        favChefs,
        mentioned,
        archetype,
        survey,
        palaceSummaries,
        onboarding,
      ] = (await Promise.race([
        Promise.all([
          loadRemyContext(currentPage, earlyScopeHint),
          classifyIntent(message),
          // Skip heavy lookups for minimal scope - they won't be included in the prompt anyway
          earlyScopeHint === 'minimal'
            ? Promise.resolve([])
            : loadRelevantMemories(message, undefined, undefined),
          earlyScopeHint === 'minimal'
            ? Promise.resolve('')
            : getCulinaryProfileForPrompt(user.tenantId!).catch(() => ''),
          earlyScopeHint === 'minimal' ? Promise.resolve([]) : getFavoriteChefs().catch(() => []),
          resolveMessageEntities(message).catch((err) => {
            console.error('[non-blocking] Entity resolution failed:', err)
            return []
          }),
          earlyScopeHint === 'minimal'
            ? Promise.resolve(null)
            : getRemyArchetype().catch(() => null),
          activeForm === 'remy-survey' ? getSurveyState().catch(() => null) : Promise.resolve(null),
          history.length === 0 && earlyScopeHint !== 'minimal'
            ? searchRemyConversationSummaries(message, { limit: 3 }).catch(() => [])
            : Promise.resolve([]),
          getStreamOnboardingStage(user.tenantId!).catch(() => null),
        ]),
        setupTimeout,
      ])) as [
        Awaited<ReturnType<typeof loadRemyContext>>,
        Awaited<ReturnType<typeof classifyIntent>>,
        Awaited<ReturnType<typeof loadRelevantMemories>>,
        string,
        Awaited<ReturnType<typeof getFavoriteChefs>>,
        Awaited<ReturnType<typeof resolveMessageEntities>>,
        string | null,
        SurveyState | null,
        Awaited<ReturnType<typeof searchRemyConversationSummaries>>,
        Awaited<ReturnType<typeof getStreamOnboardingStage>>,
      ]
      context = ctx
      if (mentioned.length > 0) context.mentionedEntities = mentioned
      classification = cls
      memories = mems
      culinaryProfile = profile || undefined
      archetypeId = archetype
      surveyState = survey
      onboardingStage = onboarding
      if (palaceSummaries.length > 0) {
        recentConversationSummaries = palaceSummaries.map((summary) => ({
          summary: summary.summary,
          generatedAt: summary.generatedAt,
        }))
      }
      if (favChefs.length > 0) {
        favoriteChefsList = favChefs
          .map((c) => `- ${c.chefName}${c.reason ? `: ${c.reason}` : ''}`)
          .join('\n')
      }
    } catch (setupErr) {
      releaseInteractiveLock()
      const msg = setupErr instanceof Error ? setupErr.message : String(setupErr)
      const isOllama =
        msg.includes('Ollama') || msg.includes('timeout') || msg.includes('timed out')
      console.error('[remy] Setup failed:', msg)
      return new Response(
        encodeSSE({
          type: 'error',
          data: isOllama
            ? 'The AI model is loading, which can take a minute on the first request. Hit retry and I should be ready!'
            : sanitizeErrorForClient(setupErr, 'Setup failed - please try again in a moment.'),
        }),
        { headers: sseHeaders() }
      )
    }

    // Build survey prompt section if in survey mode
    const surveyPromptSection =
      activeForm === 'remy-survey' ? buildSurveyPromptSection(surveyState) : null

    //  INTENT OVERRIDES (Formula > AI - correct misclassifications)

    // Safety-critical: dietary/allergy queries MUST route through dietary.check
    if (
      classification.intent === 'question' &&
      /(?:allerg|dietary|restriction|epipen|anaphyla|intoleran)/i.test(message)
    ) {
      classification = { ...classification, intent: 'command' }
    }

    // Action verbs that should always be commands, even if classifier said question
    if (classification.intent === 'question') {
      const forceCommandPatterns = [
        /^(?:draft|write|create|make|add|build|generate|prepare|send|email|text)\b/i,
        /^(?:find|search|look up|check|show|pull up|get|grab|fetch)\b.*[A-Z]/i, // action + proper noun
        /^(?:book|reserve|block off|schedule|cancel|reschedule)\b/i,
        /^(?:scale|portion|pack|import|bulk|parse|process|log|record)\b/i,
        /^(?:go to|take me to|open|navigate)\b/i,
        /^(?:brief me|morning briefing|debrief me)\b/i,
        /^(?:upcoming|my|next|show|list)\s+(?:events?|inquir|clients?|recipes?|staff)\b/i,
        /^(?:pending|open|overdue|new)\s+(?:inquir|leads?|invoices?|payments?)\b/i,
      ]
      if (forceCommandPatterns.some((p) => p.test(message))) {
        classification = { ...classification, intent: 'command' }
      }
    }

    // Financial context queries -> question path (LLM answers better from full context)
    if (
      classification.intent === 'command' &&
      /(?:outstanding|payment|invoice|owe|balance|paid|unpaid|overdue|past due)/i.test(message)
    ) {
      classification = { ...classification, intent: 'question' }
    }

    //  INSTANT ANSWER PATH (Formula > AI - skip Ollama entirely for simple facts)
    // For simple factual questions where the answer is already in the loaded context,
    // return an instant response without waiting 30-90s for Ollama.
    if (classification.intent === 'question') {
      const instant = tryInstantAnswer(message, context)
      if (instant) {
        releaseInteractiveLock()
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(encodeSSE({ type: 'intent', data: 'question' })))
            controller.enqueue(encoder.encode(encodeSSE({ type: 'token', data: instant.text })))
            if (instant.navSuggestions && instant.navSuggestions.length > 0) {
              controller.enqueue(
                encoder.encode(encodeSSE({ type: 'nav', data: instant.navSuggestions }))
              )
            }
            controller.enqueue(encoder.encode(encodeSSE({ type: 'done', data: null })))
            controller.close()
          },
        })
        return new Response(stream, { headers: sseHeaders() })
      }
    }

    //  COMMAND path
    if (classification.intent === 'command') {
      // Multi-step chain detection: split compound commands
      const chainSteps = looksLikeChain(message) ? parseTaskChain(message) : null

      if (chainSteps && chainSteps.length > 1) {
        // Execute each step sequentially, combining results
        const allTasks: RemyTaskResult[] = []
        const stepSummaries: string[] = []

        for (let i = 0; i < chainSteps.length; i++) {
          const stepRun = await runCommand(chainSteps[i])
          if (stepRun.ollamaOffline) {
            releaseInteractiveLock()
            return new Response(
              encodeSSE({
                type: 'error',
                data: "I'm offline right now. The AI runtime isn't reachable - please try again in a moment.",
              }),
              { headers: sseHeaders() }
            )
          }
          const stepTasks: RemyTaskResult[] = stepRun.results.map((r) => ({
            taskId: r.taskId,
            taskType: r.taskType,
            tier: r.tier,
            name: r.name ?? getTaskName(r.taskType),
            status: r.status === 'running' ? 'done' : (r.status as RemyTaskResult['status']),
            data: r.data,
            error: r.error,
            holdReason: r.holdReason,
            preview: r.preview,
          }))
          allTasks.push(...stepTasks)
          stepSummaries.push(`**Step ${i + 1}/${chainSteps.length}:** ${chainSteps[i]}`)
        }

        const chainHeader = `Handled **${chainSteps.length} steps**:\n\n${stepSummaries.join('\n')}\n\n`
        const text = chainHeader + summarizeTaskResults(allTasks)

        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(encodeSSE({ type: 'intent', data: 'command' })))
            controller.enqueue(encoder.encode(encodeSSE({ type: 'token', data: text })))
            controller.enqueue(encoder.encode(encodeSSE({ type: 'tasks', data: allTasks })))
            controller.enqueue(encoder.encode(encodeSSE({ type: 'done', data: null })))
            controller.close()
          },
        })
        releaseInteractiveLock()
        recordRemyMetric({ category: 'general' } as any).catch(() => {})
        return new Response(stream, { headers: sseHeaders() })
      }

      // Single command (no chain)
      const commandRun = await runCommand(message)

      if (commandRun.ollamaOffline) {
        releaseInteractiveLock()
        return new Response(
          encodeSSE({
            type: 'error',
            data: "I'm offline right now. The AI runtime isn't reachable - please try again in a moment.",
          }),
          { headers: sseHeaders() }
        )
      }

      const tasks: RemyTaskResult[] = commandRun.results.map((r) => ({
        taskId: r.taskId,
        taskType: r.taskType,
        tier: r.tier,
        name: r.name ?? getTaskName(r.taskType),
        status: r.status === 'running' ? 'done' : (r.status as RemyTaskResult['status']),
        data: r.data,
        error: r.error,
        holdReason: r.holdReason,
        preview: r.preview,
      }))

      const text = summarizeTaskResults(tasks)

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(encodeSSE({ type: 'intent', data: 'command' })))
          controller.enqueue(encoder.encode(encodeSSE({ type: 'token', data: text })))
          controller.enqueue(encoder.encode(encodeSSE({ type: 'tasks', data: tasks })))
          controller.enqueue(encoder.encode(encodeSSE({ type: 'done', data: null })))
          controller.close()
        },
      })
      releaseInteractiveLock()

      // Record anonymous command metric (non-blocking)
      recordRemyMetric({
        category: 'general',
      } as any).catch(() => {})

      return new Response(stream, { headers: sseHeaders() })
    }

    //  STREAMING path (handles both question and mixed intents)
    // Mixed: execute commands first, then stream conversational response.
    // Question: stream directly.
    const isMixed = classification.intent === 'mixed'
    let mixedTasks: RemyTaskResult[] = []
    let mixedTaskSummary = ''

    if (isMixed) {
      const commandInput = classification.commandPart ?? message
      const commandRun = await runCommand(commandInput)

      mixedTasks = (commandRun.results ?? []).map((r) => ({
        taskId: r.taskId,
        taskType: r.taskType,
        tier: r.tier,
        name: r.name ?? getTaskName(r.taskType),
        status: r.status === 'running' ? 'done' : (r.status as RemyTaskResult['status']),
        data: r.data,
        error: r.error,
        holdReason: r.holdReason,
        preview: r.preview,
      }))
      mixedTaskSummary = summarizeTaskResults(mixedTasks)
    }

    const endpoint = await routeForRemy()
    if (!endpoint) {
      releaseInteractiveLock()
      return new Response(
        encodeSSE({
          type: 'error',
          data: "I'm offline right now. The AI runtime isn't reachable. Please try again in a moment!",
        }),
        { headers: sseHeaders() }
      )
    }

    const contextScope = determineContextScope(message, classification.intent)
    const intentType = isMixed ? 'mixed' : 'question'
    const tokenBudget = getOperatorResponseTokenBudget(
      contextScope,
      intentType as 'question' | 'mixed'
    )
    const useThinking = shouldUseThinking(contextScope, message)
    const dynamicPersonalityBlock = await buildStreamDynamicPersonalityBlock(
      user.tenantId!,
      context
    )

    const systemPrompt = buildRemySystemPrompt(
      context,
      memories,
      culinaryProfile,
      favoriteChefsList,
      archetypeId,
      recentPages,
      recentActions,
      recentErrors,
      sessionMinutes,
      activeForm,
      surveyPromptSection,
      otherChannelDigest,
      previousSessionTopics,
      message,
      contextScope,
      recentConversationSummaries,
      false,
      dynamicPersonalityBlock
    )

    if (systemPrompt.length > 24_000) {
      console.warn(
        `[remy/stream] [ALERT] System prompt is ${systemPrompt.length} chars (~${Math.round(systemPrompt.length / 4)} tokens) - may be truncated by model context window`
      )
    }

    const historyStr = formatConversationHistory(history)
    const questionInput = isMixed ? (classification.questionPart ?? message) : message
    const userMessage = `${historyStr}Chef: ${questionInput}`

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const abortCtrl = new AbortController()
        const timeout = setTimeout(() => abortCtrl.abort(), OLLAMA_STREAM_TIMEOUT_MS)
        const onDisconnect = () => abortCtrl.abort()
        req.signal.addEventListener('abort', onDisconnect)

        try {
          controller.enqueue(encoder.encode(encodeSSE({ type: 'intent', data: intentType })))

          let fullResponse = ''
          const thinkFilter = new ThinkingBlockFilter()

          const ollama = new Ollama({ host: endpoint.host })
          const response: any = await ollama.chat({
            model: endpoint.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
            stream: true,
            options: {
              num_predict: useThinking ? tokenBudget + 200 : tokenBudget,
            },
            keep_alive: '30m',
            think: useThinking,
          } as any)

          for await (const chunk of response) {
            if (abortCtrl.signal.aborted) break
            const token = chunk.message?.content ?? ''
            if (token) {
              const filtered = thinkFilter.process(token)
              if (filtered) {
                fullResponse += filtered
                controller.enqueue(encoder.encode(encodeSSE({ type: 'token', data: filtered })))
              }
            }
          }
          const flushed = thinkFilter.flush()
          if (flushed) {
            fullResponse += flushed
            controller.enqueue(encoder.encode(encodeSSE({ type: 'token', data: flushed })))
          }

          // Append mixed task results after the streamed response
          if (mixedTaskSummary) {
            controller.enqueue(
              encoder.encode(encodeSSE({ type: 'token', data: `\n\n${mixedTaskSummary}` }))
            )
          }
          if (mixedTasks.length > 0) {
            controller.enqueue(encoder.encode(encodeSSE({ type: 'tasks', data: mixedTasks })))
          }

          // Nav suggestions from LLM response
          const navSuggestions = extractNavSuggestions(fullResponse)
          if (navSuggestions.length > 0) {
            controller.enqueue(encoder.encode(encodeSSE({ type: 'nav', data: navSuggestions })))
          }

          // Deterministic action suggestions when LLM didn't provide nav
          if (navSuggestions.length === 0) {
            const actionHints = suggestFollowUpActions(userMessage, fullResponse)
            if (actionHints.length > 0) {
              controller.enqueue(
                encoder.encode(
                  encodeSSE({
                    type: 'nav',
                    data: actionHints.map((a) => ({
                      label: a.label,
                      href: `remy:${a.prompt}`,
                      description: a.description,
                    })),
                  })
                )
              )
            }
          }

          const onboardingCloser = await completeStreamOnboardingTurn(
            user.tenantId!,
            onboardingStage
          )
          if (onboardingCloser) {
            fullResponse += onboardingCloser
            controller.enqueue(encoder.encode(encodeSSE({ type: 'token', data: onboardingCloser })))
          }

          controller.enqueue(encoder.encode(encodeSSE({ type: 'done', data: null })))

          recordRemyMetric({
            category: 'general',
            modelVersion: endpoint.model,
          }).catch((err) => console.error('[non-blocking] Remy metric failed', err))
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err)
          const isOllamaDown =
            errMsg.includes('ECONNREFUSED') ||
            errMsg.includes('unreachable') ||
            errMsg.includes('timeout') ||
            errMsg.includes('timed out') ||
            errMsg.includes('aborted')
          console.error('[remy] Streaming error:', errMsg)
          controller.enqueue(
            encoder.encode(
              encodeSSE({
                type: 'error',
                data: isOllamaDown
                  ? "I'm offline right now. The AI runtime isn't reachable - please try again in a moment."
                  : sanitizeErrorForClient(err),
              })
            )
          )

          recordRemyMetric({
            category: 'general',
            isError: true,
            modelVersion: endpoint.model,
          }).catch(() => {})
        } finally {
          clearTimeout(timeout)
          req.signal.removeEventListener('abort', onDisconnect)
          releaseInteractiveLock()
          controller.close()
        }
      },
    })

    return new Response(stream, { headers: sseHeaders() })
  } catch (err) {
    // Release lock on any error that prevents streaming from starting
    releaseInteractiveLock()
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[remy] Outer route error:', msg)

    if (msg.includes('Unauthorized')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (msg.includes('Account suspended')) {
      return new Response(JSON.stringify({ error: 'Account suspended' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return sseErrorResponse(sanitizeErrorForClient(err), 500)
  }
}
