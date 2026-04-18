// Remy Context API - Returns assembled system prompt for client-side local AI inference.
// Reuses the same context loading + prompt assembly as the stream route,
// but returns JSON instead of streaming from Ollama.

import { NextRequest, NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { loadRemyContext, resolveMessageEntities } from '@/lib/ai/remy-context'
import { classifyIntent } from '@/lib/ai/remy-classifier'
import { runCommand } from '@/lib/ai/command-orchestrator'
import { parseTaskChain, looksLikeChain } from '@/lib/ai/remy-chain-parser'
import { getTaskName } from '@/lib/ai/command-task-descriptions'
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
  checkRecipeGenerationBlock,
  checkOutOfScopeBlock,
  checkDangerousActionBlock,
} from '@/lib/ai/remy-input-validation'
import { isRemyBlocked, isRemyAdmin } from '@/lib/ai/remy-abuse-actions'
import { acquireInteractiveLock, releaseInteractiveLock } from '@/lib/ai/queue'
import { recordRemyMetric } from '@/lib/ai/remy-metrics'
import { checkRateLimit } from '@/lib/rateLimit'
import { loadRelevantMemories } from '@/lib/ai/remy-memory-actions'
import { searchRemyConversationSummaries } from '@/lib/ai/mempalace-bridge'
import type { RemyMessage, RemyTaskResult } from '@/lib/ai/remy-types'
import {
  buildGreetingFastPath,
  detectMemoryIntent,
  summarizeTaskResults,
  shouldUseThinking,
  getOperatorResponseTokenBudget,
} from '../stream/route-runtime-utils'
import {
  buildRemySystemPrompt,
  formatConversationHistory,
  determineContextScope,
  getEarlyScopeHint,
} from '../stream/route-prompt-utils'
import { tryInstantAnswer } from '../stream/route-instant-answers'

export async function POST(req: NextRequest) {
  try {
    const user = await requireChef()

    const [prefs, rawBody, admin] = await Promise.all([
      getAiPreferences(),
      req.json().catch(() => null as unknown),
      isRemyAdmin(),
    ])

    if (prefs && !prefs.remy_enabled) {
      return NextResponse.json({ blocked: true, blockReason: 'Remy is disabled.' }, { status: 403 })
    }

    // Local AI must be enabled for this endpoint
    if (!prefs?.local_ai_enabled) {
      return NextResponse.json(
        { blocked: true, blockReason: 'Local AI is not enabled.' },
        { status: 403 }
      )
    }

    if (!rawBody) {
      return NextResponse.json({ blocked: true, blockReason: 'Invalid request.' }, { status: 400 })
    }

    const validated = validateRemyRequestBody(rawBody)
    if (!validated) {
      return NextResponse.json({ blocked: true, blockReason: 'Invalid request.' }, { status: 400 })
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
    const otherChannelDigest =
      typeof rawRecord.otherChannelDigest === 'string'
        ? rawRecord.otherChannelDigest.slice(0, 600)
        : null
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
    const fallbackRecentConversationSummaries = Array.isArray(rawRecord.recentConversationSummaries)
      ? (
          rawRecord.recentConversationSummaries as Array<{ summary: string; generatedAt: string }>
        ).slice(0, 5)
      : null
    const history = validateHistory(rawRecord.history, 20) as RemyMessage[]

    // Guardrails (non-admin)
    if (!admin) {
      const [blockStatus, rateLimited] = await Promise.all([
        isRemyBlocked(),
        checkRateLimit(`remy-context:${user.tenantId!}`, 30, 60_000)
          .then(() => false)
          .catch(() => true),
      ])
      if (blockStatus.blocked) {
        return NextResponse.json(
          { blocked: true, blockReason: 'Access suspended.' },
          { status: 403 }
        )
      }
      if (rateLimited) {
        return NextResponse.json(
          { blocked: true, blockReason: 'Rate limited. Try again in a moment.' },
          { status: 429 }
        )
      }
      const inputCheck = validateRemyInput(message)
      if (!inputCheck.allowed) {
        return NextResponse.json(
          { blocked: true, blockReason: inputCheck.refusal ?? 'Not allowed.' },
          { status: 400 }
        )
      }
    }

    // Hard blocks (recipe gen, out-of-scope, dangerous)
    const recipeBlock = checkRecipeGenerationBlock(message)
    if (recipeBlock) {
      return NextResponse.json({
        blocked: false,
        intent: 'question',
        systemPrompt: null,
        instantResponse: recipeBlock,
      })
    }
    const outOfScopeBlock = checkOutOfScopeBlock(message)
    if (outOfScopeBlock) {
      return NextResponse.json({
        blocked: false,
        intent: 'question',
        systemPrompt: null,
        instantResponse: outOfScopeBlock,
      })
    }
    const dangerousBlock = checkDangerousActionBlock(message)
    if (dangerousBlock) {
      return NextResponse.json({
        blocked: false,
        intent: 'question',
        systemPrompt: null,
        instantResponse: dangerousBlock,
      })
    }

    // Memory intent handled server-side (needs DB)
    const memoryIntent = detectMemoryIntent(message)
    if (memoryIntent) {
      return NextResponse.json({
        blocked: false,
        intent: 'memory',
        systemPrompt: null,
        serverOnly: true,
        serverOnlyReason: 'Memory operations require server.',
      })
    }

    // Greeting fast-path
    const GREETING_REGEX =
      /^(?:good\s+morning|good\s+afternoon|good\s+evening|morning|afternoon|evening|hey|hi|hello|yo|sup|what'?s?\s+up)\s*[!.?]*$/i
    if (GREETING_REGEX.test(message.trim())) {
      return NextResponse.json({
        blocked: false,
        intent: 'question',
        systemPrompt: null,
        instantResponse: buildGreetingFastPath(),
      })
    }

    // Acquire interactive lock to prevent background worker GPU contention (Q3/Q6 fix)
    acquireInteractiveLock()

    // Load context + classify (same as stream route)
    const earlyScopeHint = getEarlyScopeHint(message)
    let recentConversationSummaries = fallbackRecentConversationSummaries

    const [ctx, cls, mems, profile, favChefs, mentioned, archetype, survey, palaceSummaries] =
      await Promise.all([
        loadRemyContext(currentPage, earlyScopeHint),
        classifyIntent(message),
        earlyScopeHint === 'minimal'
          ? Promise.resolve([])
          : loadRelevantMemories(message, undefined, undefined),
        earlyScopeHint === 'minimal'
          ? Promise.resolve('')
          : getCulinaryProfileForPrompt(user.tenantId!).catch(() => ''),
        earlyScopeHint === 'minimal' ? Promise.resolve([]) : getFavoriteChefs().catch(() => []),
        resolveMessageEntities(message).catch(() => []),
        earlyScopeHint === 'minimal' ? Promise.resolve(null) : getRemyArchetype().catch(() => null),
        activeForm === 'remy-survey' ? getSurveyState().catch(() => null) : Promise.resolve(null),
        history.length === 0 && earlyScopeHint !== 'minimal'
          ? searchRemyConversationSummaries(message, { limit: 3 }).catch(() => [])
          : Promise.resolve([]),
      ])

    const context = ctx
    if (mentioned.length > 0) context.mentionedEntities = mentioned
    let classification = cls
    const memories = mems
    const culinaryProfile = profile || undefined
    const archetypeId = archetype
    const surveyState = survey as SurveyState | null
    if (palaceSummaries.length > 0) {
      recentConversationSummaries = palaceSummaries.map((s) => ({
        summary: s.summary,
        generatedAt: s.generatedAt,
      }))
    }
    let favoriteChefsList: string | undefined
    if (favChefs.length > 0) {
      favoriteChefsList = favChefs
        .map((c) => `- ${c.chefName}${c.reason ? `: ${c.reason}` : ''}`)
        .join('\n')
    }

    // Intent overrides (same rules as stream route)
    if (
      classification.intent === 'question' &&
      /(?:allerg|dietary|restriction|epipen|anaphyla|intoleran)/i.test(message)
    ) {
      classification = { ...classification, intent: 'command' }
    }
    if (classification.intent === 'question') {
      const forceCommandPatterns = [
        /^(?:draft|write|create|make|add|build|generate|prepare|send|email|text)\b/i,
        /^(?:find|search|look up|check|show|pull up|get|grab|fetch)\b.*[A-Z]/i,
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
    if (
      classification.intent === 'command' &&
      /(?:outstanding|payment|invoice|owe|balance|paid|unpaid|overdue|past due)/i.test(message)
    ) {
      classification = { ...classification, intent: 'question' }
    }

    // Instant answers (no LLM needed)
    if (classification.intent === 'question') {
      const instant = tryInstantAnswer(message, context)
      if (instant) {
        return NextResponse.json({
          blocked: false,
          intent: 'question',
          systemPrompt: null,
          instantResponse: instant.text,
          navSuggestions: instant.navSuggestions ?? null,
        })
      }
    }

    // Commands execute server-side, return result directly
    if (classification.intent === 'command' || classification.intent === 'mixed') {
      const commandInput =
        classification.intent === 'mixed' ? (classification.commandPart ?? message) : message

      // Chain parser: detect multi-step commands like "draft email and schedule follow-up" (Q5 fix)
      const chainSteps = looksLikeChain(commandInput) ? parseTaskChain(commandInput) : null

      let allResults: Array<any> = []
      if (chainSteps && chainSteps.length > 1) {
        for (const step of chainSteps) {
          const stepRun = await runCommand(step)
          allResults.push(...stepRun.results)
        }
      } else {
        const commandRun = await runCommand(commandInput)
        allResults = commandRun.results
      }

      const tasks: RemyTaskResult[] = allResults.map((r) => ({
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

      // Record metric for command execution (Q4 fix)
      recordRemyMetric({ category: 'command' } as any).catch(() => {})

      // For pure commands, return result. For mixed, also return system prompt for the question part.
      if (classification.intent === 'command') {
        releaseInteractiveLock()
        return NextResponse.json({
          blocked: false,
          intent: 'command',
          systemPrompt: null,
          commandResult: summarizeTaskResults(tasks),
          tasks,
        })
      }

      // Mixed: build prompt for question part, include command results
      const contextScope = determineContextScope(message, 'mixed')
      const surveyPromptSection =
        activeForm === 'remy-survey' ? buildSurveyPromptSection(surveyState) : null

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
        true
      )

      const historyStr = formatConversationHistory(history)
      const questionInput = classification.questionPart ?? message
      const userMessage = `${historyStr}Chef: ${questionInput}`
      const useThinking = shouldUseThinking(contextScope, message)
      const tokenBudget = getOperatorResponseTokenBudget(contextScope, 'mixed')

      releaseInteractiveLock()
      recordRemyMetric({ category: 'mixed' } as any).catch(() => {})
      return NextResponse.json({
        blocked: false,
        intent: 'mixed',
        systemPrompt,
        userMessage,
        model: prefs.local_ai_model || 'gemma4',
        commandResult: summarizeTaskResults(tasks),
        tasks,
        options: { num_predict: useThinking ? tokenBudget + 200 : tokenBudget, think: useThinking },
      })
    }

    // Question intent: build and return system prompt for local inference
    const contextScope = determineContextScope(message, 'question')
    const surveyPromptSection =
      activeForm === 'remy-survey' ? buildSurveyPromptSection(surveyState) : null

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
      true
    )

    const historyStr = formatConversationHistory(history)
    const userMessage = `${historyStr}Chef: ${message}`
    const useThinking = shouldUseThinking(contextScope, message)
    const tokenBudget = getOperatorResponseTokenBudget(contextScope, 'question')

    releaseInteractiveLock()
    recordRemyMetric({ category: 'general' } as any).catch(() => {})
    return NextResponse.json({
      blocked: false,
      intent: 'question',
      systemPrompt,
      userMessage,
      model: prefs.local_ai_model || 'gemma4',
      options: { num_predict: useThinking ? tokenBudget + 200 : tokenBudget, think: useThinking },
    })
  } catch (err) {
    releaseInteractiveLock()
    console.error('[remy/context] Error:', err)
    return NextResponse.json(
      { blocked: true, blockReason: 'Something went wrong. Try again.' },
      { status: 500 }
    )
  }
}
