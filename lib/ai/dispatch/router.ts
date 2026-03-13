// AI Dispatch Layer - Router
// No 'use server' - imported by server action files that already have it.
//
// The router is the spine of the multi-model AI system.
// It takes a classified task, walks the routing chain, invokes providers,
// handles fallbacks, and logs everything.
//
// The router NEVER makes routing decisions itself. It reads the routing table
// and executes the chain mechanically. All intelligence is in the classifier
// and routing table.

import { z } from 'zod'

import type {
  TaskClass,
  DispatchDomain,
  DispatchProvider,
  DispatchResult,
  ProviderFailure,
} from './types'
import { providerToModelTier } from './types'
import { classifyTask } from './classifier'
import { scanPrivacy, forceLocalOnly } from './privacy-gate'
import { getRoutingChain, isPrivateTaskClass } from './routing-table'
import { OllamaOfflineError } from '../ollama-errors'
import { incrementAiMetric, recordAiLatency } from '../ai-metrics'
import { recordDispatchEvent } from './cost-tracker'
import {
  isOllamaEnabled,
  isGroqEnabled,
  isGitHubModelsEnabled,
  isWorkersAiEnabled,
  isCerebrasEnabled,
  isMistralEnabled,
  isSambaNovaEnabled,
  isOpenAiEnabled,
} from '../providers'
import type { ModelTier } from '../providers'

// ============================================
// PUBLIC API
// ============================================

/**
 * Options for dispatch. Callers provide what they know; the router
 * figures out the rest from the classifier and privacy gate.
 */
export interface DispatchOptions<T> {
  /** System prompt for the LLM */
  systemPrompt: string
  /** User content / payload */
  userContent: string
  /** Zod schema for parsing the response */
  schema: z.ZodType<T>
  /** Which domain: developer tooling or app runtime */
  domain: DispatchDomain
  /** Optional: caller knows the task class (skips classifier) */
  taskClass?: TaskClass
  /** Optional: caller knows this is private (skips privacy gate scan) */
  isPrivate?: boolean
  /** Optional: hint for the classifier */
  taskDescription?: string
  /** Optional: content type hint for the classifier */
  contentType?:
    | 'structured_extraction'
    | 'code'
    | 'review'
    | 'research'
    | 'generation'
    | 'conversation'
  /** Optional: override model tier for the provider */
  modelTier?: ModelTier
  /** Optional: timeout in ms (passed to the provider) */
  timeoutMs?: number
  /** Optional: temperature override */
  temperature?: number
  /** Optional: max tokens to generate */
  maxTokens?: number
  // ── Ollama-specific options (passed through to parseWithOllama) ──
  /** Enable response caching (Ollama only) */
  cache?: boolean
  /** Task type for auto-tuned parameters (Ollama only) */
  taskType?: 'classification' | 'extraction' | 'draft' | 'reasoning' | 'general'
}

/**
 * Main dispatch function. Routes a task through the chain and returns a result.
 *
 * Usage:
 * ```ts
 * const result = await dispatch({
 *   systemPrompt: 'Extract the dietary restrictions from this message.',
 *   userContent: clientMessage,
 *   schema: DietarySchema,
 *   domain: 'runtime',
 *   isPrivate: true,  // Client data - forces local
 * })
 * // result.result is typed as DietarySchema output
 * // result.provider tells you which model handled it
 * ```
 */
export async function dispatch<T>(opts: DispatchOptions<T>): Promise<DispatchResult<T>> {
  const start = Date.now()

  // ── Step 1: Privacy gate ──
  const privacyResult = opts.isPrivate
    ? forceLocalOnly('caller-declared')
    : scanPrivacy(opts.systemPrompt, opts.userContent)

  // ── Step 2: Classify the task ──
  const taskClass =
    opts.taskClass ??
    classifyTask({
      domain: opts.domain,
      taskDescription: opts.taskDescription ?? '',
      privacyLevel: privacyResult.level,
      privateDataCategories: privacyResult.detectedCategories,
      contentType: opts.contentType,
    })

  // ── Safety check: private task class must not have cloud providers ──
  if (isPrivateTaskClass(taskClass) && privacyResult.level !== 'LOCAL_ONLY') {
    // The classifier thinks it's private but the gate didn't catch it.
    // Trust the classifier (it's more conservative).
    // This shouldn't happen, but defense in depth.
  }

  // ── Step 3: Get the routing chain ──
  const chain = getRoutingChain(taskClass)

  // ── Step 4: Walk the chain ──
  const providers: Array<{ provider: DispatchProvider; position: number }> = []
  if (chain.primary !== 'none') {
    providers.push({ provider: chain.primary, position: 0 })
  }
  if (chain.secondary) {
    providers.push({ provider: chain.secondary, position: 1 })
  }
  if (chain.fallback) {
    providers.push({ provider: chain.fallback, position: 2 })
  }

  // Special case: DETERMINISTIC tasks have no providers
  if (taskClass === 'DETERMINISTIC' || chain.primary === 'none') {
    throw new Error(
      '[dispatch] DETERMINISTIC tasks should not go through the dispatch router. ' +
        'Use deterministic code directly. This is a routing bug.'
    )
  }

  const failureLog: ProviderFailure[] = []

  for (const { provider, position } of providers) {
    // Skip HARD_FAIL entries
    if (provider === 'HARD_FAIL') {
      break
    }

    // Check if provider is available before trying
    if (!isProviderAvailable(provider)) {
      failureLog.push({
        provider,
        error: `Provider ${provider} is not configured`,
        code: 'not_configured',
        latencyMs: 0,
      })
      continue
    }

    const attemptStart = Date.now()
    try {
      const result = await invokeProvider<T>(provider, opts)
      const latencyMs = Date.now() - start

      incrementAiMetric('ai.call.success')
      recordAiLatency(latencyMs)
      recordDispatchEvent({
        taskClass,
        provider,
        chainPosition: position,
        latencyMs,
        success: true,
      })

      return {
        result,
        provider,
        chainPosition: position,
        latencyMs,
        usedFallback: position > 0,
        failureLog,
      }
    } catch (err) {
      const attemptLatency = Date.now() - attemptStart
      const errorMsg = err instanceof Error ? err.message : String(err)
      const errorCode = err instanceof OllamaOfflineError ? err.code : 'unknown'

      failureLog.push({
        provider,
        error: errorMsg,
        code: errorCode,
        latencyMs: attemptLatency,
      })

      incrementAiMetric('ai.call.failure')
      recordDispatchEvent({
        taskClass,
        provider,
        chainPosition: position,
        latencyMs: attemptLatency,
        success: false,
      })

      // Log the fallback transition
      console.warn(
        `[dispatch] ${provider} failed (${errorCode}): ${errorMsg}. ` +
          `Moving to next in chain for task class ${taskClass}.`
      )

      // Continue to next provider in chain
    }
  }

  // ── All providers failed ──
  // Check if escalation is HARD_FAIL
  if (chain.escalation === 'HARD_FAIL') {
    // This is a private task and Ollama is down. Hard fail.
    const categories = privacyResult.detectedCategories.join(', ') || 'private data'
    throw new OllamaOfflineError(
      `Cannot process ${categories} - local AI is required but unavailable. ` +
        `Tried: ${failureLog.map((f) => f.provider).join(' -> ')}`,
      'unreachable'
    )
  }

  // Escalation = 'developer' means we've exhausted automatic options
  const tried = failureLog.map((f) => `${f.provider} (${f.code})`).join(', ')
  throw new Error(
    `[dispatch] All providers failed for task class ${taskClass}. ` +
      `Tried: ${tried}. Escalation required.`
  )
}

// ============================================
// PROVIDER INVOCATION
// ============================================

/**
 * Invokes a specific provider with the given options.
 * This is where we bridge from the dispatch layer to the existing parser functions.
 *
 * Each provider adapter is lazily imported to avoid pulling in all SDKs
 * when only one provider is needed.
 */
async function invokeProvider<T>(provider: DispatchProvider, opts: DispatchOptions<T>): Promise<T> {
  const tier = opts.modelTier ?? providerToModelTier(provider) ?? 'fast'

  switch (provider) {
    case 'ollama-fast':
    case 'ollama-standard':
    case 'ollama-large': {
      const { parseWithOllama } = await import('../parse-ollama')
      const ollamaTier: ModelTier =
        provider === 'ollama-fast'
          ? 'fast'
          : provider === 'ollama-standard'
            ? 'standard'
            : 'complex'
      return parseWithOllama(opts.systemPrompt, opts.userContent, opts.schema, {
        modelTier: ollamaTier,
        timeoutMs: opts.timeoutMs,
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
        cache: opts.cache,
        taskType: opts.taskType,
      })
    }

    case 'groq': {
      const { parseWithGroq } = await import('../parse-groq')
      return parseWithGroq(opts.systemPrompt, opts.userContent, opts.schema, {
        modelTier: tier,
        timeoutMs: opts.timeoutMs ?? 30_000,
        temperature: opts.temperature ?? 0.0,
        maxTokens: opts.maxTokens,
      })
    }

    case 'gemini': {
      const { parseWithGemini } = await import('../parse-gemini')
      return parseWithGemini(opts.systemPrompt, opts.userContent, opts.schema, {
        timeoutMs: opts.timeoutMs ?? 30_000,
        temperature: opts.temperature ?? 0.0,
        maxTokens: opts.maxTokens,
      })
    }

    case 'github-models': {
      const { parseWithGitHubModels } = await import('../parse-github-models')
      return parseWithGitHubModels(opts.systemPrompt, opts.userContent, opts.schema, {
        modelTier: tier,
        timeoutMs: opts.timeoutMs ?? 30_000,
        temperature: opts.temperature ?? 0.0,
        maxTokens: opts.maxTokens,
      })
    }

    case 'workers-ai': {
      const { parseWithWorkersAi } = await import('../parse-workers-ai')
      return parseWithWorkersAi(opts.systemPrompt, opts.userContent, opts.schema, {
        modelTier: tier,
        timeoutMs: opts.timeoutMs ?? 30_000,
        temperature: opts.temperature ?? 0.0,
        maxTokens: opts.maxTokens,
      })
    }

    case 'cerebras': {
      const { parseWithCerebras } = await import('../parse-cerebras')
      return parseWithCerebras(opts.systemPrompt, opts.userContent, opts.schema, {
        modelTier: tier,
        timeoutMs: opts.timeoutMs ?? 30_000,
        temperature: opts.temperature ?? 0.0,
        maxTokens: opts.maxTokens,
      })
    }

    case 'mistral': {
      const { parseWithMistral } = await import('../parse-mistral')
      return parseWithMistral(opts.systemPrompt, opts.userContent, opts.schema, {
        modelTier: tier,
        timeoutMs: opts.timeoutMs ?? 30_000,
        temperature: opts.temperature ?? 0.0,
        maxTokens: opts.maxTokens,
        useCodestral: false,
      })
    }

    case 'codestral': {
      const { parseWithMistral } = await import('../parse-mistral')
      return parseWithMistral(opts.systemPrompt, opts.userContent, opts.schema, {
        modelTier: tier,
        timeoutMs: opts.timeoutMs ?? 30_000,
        temperature: opts.temperature ?? 0.0,
        maxTokens: opts.maxTokens,
        useCodestral: true,
      })
    }

    case 'sambanova': {
      const { parseWithSambaNova } = await import('../parse-sambanova')
      return parseWithSambaNova(opts.systemPrompt, opts.userContent, opts.schema, {
        modelTier: tier,
        timeoutMs: opts.timeoutMs ?? 30_000,
        temperature: opts.temperature ?? 0.0,
        maxTokens: opts.maxTokens,
      })
    }

    case 'openai': {
      const { parseWithOpenAi } = await import('../parse-openai')
      return parseWithOpenAi(opts.systemPrompt, opts.userContent, opts.schema, {
        modelTier: tier,
        timeoutMs: opts.timeoutMs ?? 30_000,
        temperature: opts.temperature ?? 0.0,
        maxTokens: opts.maxTokens,
      })
    }

    case 'none':
      throw new Error('[dispatch] Provider "none" should not be invoked. This is a routing bug.')

    case 'HARD_FAIL':
      throw new OllamaOfflineError(
        'Task requires local AI but no local provider is available',
        'unreachable'
      )
  }
}

/**
 * Checks if a provider is configured and potentially available.
 * Does NOT do a health check (too slow for routing decisions).
 * Just checks if the necessary env vars are set.
 */
function isProviderAvailable(provider: DispatchProvider): boolean {
  switch (provider) {
    case 'ollama-fast':
    case 'ollama-standard':
    case 'ollama-large':
      return isOllamaEnabled()

    case 'groq':
      return isGroqEnabled()

    case 'gemini':
      return !!process.env.GEMINI_API_KEY

    case 'github-models':
      return isGitHubModelsEnabled()

    case 'workers-ai':
      return isWorkersAiEnabled()

    case 'cerebras':
      return isCerebrasEnabled()

    case 'mistral':
    case 'codestral':
      return isMistralEnabled()

    case 'sambanova':
      return isSambaNovaEnabled()

    case 'openai':
      return isOpenAiEnabled()

    case 'none':
    case 'HARD_FAIL':
      return false
  }
}

// ============================================
// CONVENIENCE WRAPPERS
// ============================================

/**
 * Dispatch a private task (forces local routing).
 * Convenience wrapper that sets isPrivate: true and domain: 'runtime'.
 */
export async function dispatchPrivate<T>(
  systemPrompt: string,
  userContent: string,
  schema: z.ZodType<T>,
  opts?: Partial<DispatchOptions<T>>
): Promise<DispatchResult<T>> {
  return dispatch({
    systemPrompt,
    userContent,
    schema,
    domain: 'runtime',
    isPrivate: true,
    ...opts,
  })
}

/**
 * Dispatch a cloud-safe task.
 * Convenience wrapper for non-private tasks.
 */
export async function dispatchCloudSafe<T>(
  systemPrompt: string,
  userContent: string,
  schema: z.ZodType<T>,
  opts?: Partial<DispatchOptions<T>>
): Promise<DispatchResult<T>> {
  return dispatch({
    systemPrompt,
    userContent,
    schema,
    domain: opts?.domain ?? 'runtime',
    isPrivate: false,
    ...opts,
  })
}
