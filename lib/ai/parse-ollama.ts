// Ollama-compatible AI Parser - for structured data extraction.
// Routes through the configured Ollama-compatible endpoint (cloud in production, local in dev).
// Uses Vercel AI SDK generateObject() internally; falls back to manual JSON extraction.
// No Gemini fallback. If the runtime is unavailable, OllamaOfflineError is thrown.
// The UI layer catches OllamaOfflineError and shows a provider-agnostic unavailability message.

'use server'

import { generateObject } from 'ai'
import { z } from 'zod'
import { createOllamaProvider } from './ai-provider'
import { isOllamaEnabled, getOllamaConfig } from './providers'
import type { ModelTier } from './providers'
import { OllamaOfflineError } from './ollama-errors'
import { getCachedResult, setCachedResult } from './ollama-cache'
import { log } from '@/lib/logger'
import { incrementAiMetric, recordAiLatency, recordAiTier } from './ai-metrics'
import { reportAppError } from '@/lib/monitoring/sentry-reporter'
import { resolveAiDispatch } from './dispatch/router'
import type { AiDispatchRequest } from './dispatch/types'
import { isSharedAiRuntimeEnabled } from './server-runtime-guard'

function extractJsonPayload(rawText: string): string {
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
  return jsonMatch ? jsonMatch[1].trim() : rawText.trim()
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
}

export interface ParseOllamaOptions {
  /** Task-complexity tier for model routing. Default: 'standard'. */
  modelTier?: ModelTier
  /** Enable in-memory response cache. Default: false. */
  cache?: boolean
  /** Hard timeout in ms for the entire Ollama call. Default: 30000 (30s). */
  timeoutMs?: number
  /** Max tokens Ollama can generate. Default: 512 (JSON responses are short). */
  maxTokens?: number
  /** Override the Ollama endpoint URL (e.g. Pi URL). If not set, uses OLLAMA_BASE_URL. */
  endpointUrl?: string
  /** Override the model name (e.g. Pi model). If not set, uses tier-based resolution. */
  model?: string
  /** Base64-encoded images for vision tasks. Gemma 4 has native multimodal support. */
  images?: string[]
  /** Sampling temperature. Lower = more deterministic. Default: Ollama model default. */
  temperature?: number
  /** Optional routing hints for the shared AI dispatch layer. */
  dispatchHint?: Omit<AiDispatchRequest, 'systemPrompt' | 'userContent' | 'modelTier'>
}

/** Default max tokens for structured JSON responses - keeps Ollama from running away */
const DEFAULT_MAX_TOKENS = 512

/** Max input length in characters. Inputs beyond this are truncated with a warning.
 *  100K chars is ~25K tokens, well within Ollama context windows. */
const MAX_INPUT_LENGTH = 100_000

/** Default hard timeout for any Ollama call - prevents infinite hangs.
 *  10s is 5x margin for Gemma 4 which responds in <2s. */
const DEFAULT_OLLAMA_TIMEOUT_MS = 10_000

/**
 * Wraps a promise with a hard timeout. If the promise doesn't resolve
 * within timeoutMs, it rejects with an OllamaOfflineError.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new OllamaOfflineError(
          `Ollama ${label} timed out after ${Math.round(timeoutMs / 1000)}s`,
          'timeout'
        )
      )
    }, timeoutMs)
    promise.then(
      (val) => {
        clearTimeout(timer)
        resolve(val)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

/**
 * Structured parsing using an Ollama-compatible runtime endpoint.
 * Mirrors parseWithAI signature - drop-in for structured extraction.
 *
 * Routing:
 *   OLLAMA_BASE_URL set + reachable → cloud or local endpoint depending on config
 *   OLLAMA_BASE_URL not set         → OllamaOfflineError (never Gemini)
 *   Runtime unreachable             → OllamaOfflineError (never Gemini)
 *   Runtime returns invalid output  → OllamaOfflineError (never Gemini)
 */
export async function parseWithOllama<T>(
  systemPrompt: string,
  userContent: string,
  schema: z.ZodType<T>,
  options?: ParseOllamaOptions
): Promise<T> {
  if (options?.endpointUrl && !isSharedAiRuntimeEnabled()) {
    throw new OllamaOfflineError(
      'Shared server AI runtime is disabled in production',
      'not_configured'
    )
  }

  if (!isOllamaEnabled() && !options?.endpointUrl) {
    throw new OllamaOfflineError('OLLAMA_BASE_URL is not set in environment', 'not_configured')
  }

  // Truncate oversized input to prevent Ollama from hanging or OOM
  if (userContent.length > MAX_INPUT_LENGTH) {
    log.ai.warn('Input truncated for parseWithOllama', {
      context: { originalLength: userContent.length, maxLength: MAX_INPUT_LENGTH },
    })
    userContent = userContent.slice(0, MAX_INPUT_LENGTH)
  }

  const dispatch = resolveAiDispatch({
    taskType: options?.dispatchHint?.taskType ?? 'structured.parse',
    systemPrompt,
    userContent,
    metadata: options?.dispatchHint?.metadata,
    source: options?.dispatchHint?.source ?? 'parseWithOllama',
    surface: options?.dispatchHint?.surface ?? 'server.parse',
    modelTier: options?.modelTier ?? 'standard',
    preferredLocation: options?.dispatchHint?.preferredLocation,
    latencySensitive: options?.dispatchHint?.latencySensitive,
    deviceCapability: options?.dispatchHint?.deviceCapability,
    confidence: options?.dispatchHint?.confidence,
    canAutoExecute: options?.dispatchHint?.canAutoExecute,
    canQueueForApproval: options?.dispatchHint?.canQueueForApproval,
    requiresApproval: options?.dispatchHint?.requiresApproval,
    safety: options?.dispatchHint?.safety,
    allowCloudFallback: options?.dispatchHint?.allowCloudFallback,
  })

  const routedConfig = getOllamaConfig({
    taskType: options?.dispatchHint?.taskType ?? 'structured.parse',
    systemPrompt,
    userContent,
    modelTier: options?.modelTier ?? 'standard',
    preferredLocation: options?.dispatchHint?.preferredLocation,
    latencySensitive: options?.dispatchHint?.latencySensitive,
    deviceCapability: options?.dispatchHint?.deviceCapability,
  })

  const baseUrl = options?.endpointUrl || dispatch.endpoint?.baseUrl || routedConfig.baseUrl
  const model = options?.model || dispatch.model || routedConfig.model

  log.ai.info('AI dispatch resolved for parseWithOllama', {
    context: {
      taskType: options?.dispatchHint?.taskType ?? 'structured.parse',
      executionLocation: dispatch.executionLocation,
      privacyLevel: dispatch.privacy.level,
      taskClass: dispatch.classification.taskClass,
      reasons: dispatch.reasons.slice(0, 5),
      confidenceDisposition: dispatch.confidenceDecision?.disposition ?? null,
    },
  })

  // Check cache first
  if (options?.cache) {
    const cached = getCachedResult<T>(systemPrompt, userContent, model)
    if (cached !== undefined) {
      log.ai.info('Cache hit', { context: { model } })
      incrementAiMetric('ai.call.cache_hit')
      return cached
    }
  }

  // Build AI SDK provider for the resolved endpoint
  const provider = createOllamaProvider(baseUrl)
  const aiModel = provider(model)
  const startTime = Date.now()
  const timeoutMs = options?.timeoutMs ?? DEFAULT_OLLAMA_TIMEOUT_MS

  // Primary path: use AI SDK generateObject() for structured output.
  // Falls back to manual JSON extraction if generateObject fails
  // (Gemma sometimes returns markdown-wrapped JSON that AI SDK can't parse).
  try {
    const abortCtrl = new AbortController()
    const timeout = setTimeout(() => abortCtrl.abort(), timeoutMs)

    try {
      const result = await generateObject({
        model: aiModel,
        schema,
        system: systemPrompt,
        prompt: userContent,
        maxOutputTokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
        ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
        abortSignal: abortCtrl.signal,
      })

      clearTimeout(timeout)
      const durationMs = Date.now() - startTime
      log.ai.info('Parsed successfully via generateObject', {
        context: {
          model,
          executionLocation: dispatch.executionLocation,
          privacyLevel: dispatch.privacy.level,
        },
        durationMs,
      })
      incrementAiMetric('ai.call.success')
      recordAiLatency(durationMs)
      if (options?.modelTier) recordAiTier(options.modelTier)
      if (options?.cache) setCachedResult(systemPrompt, userContent, model, result.object)
      return result.object
    } catch (generateErr) {
      clearTimeout(timeout)

      // If the error is an abort/timeout, map to OllamaOfflineError
      const errMsg = generateErr instanceof Error ? generateErr.message : String(generateErr)
      if (errMsg.includes('abort') || errMsg.includes('AbortError') || abortCtrl.signal.aborted) {
        const ollamaErr = new OllamaOfflineError(`Ollama timed out at ${baseUrl}`, 'timeout')
        incrementAiMetric('ai.call.timeout')
        incrementAiMetric('ai.call.failure')
        log.ai.error('Ollama timed out via generateObject', {
          context: { model, baseUrl, timeoutMs },
          error: generateErr,
        })
        reportAppError(ollamaErr, { category: 'ai', action: 'parseWithOllama' })
        throw ollamaErr
      }

      // Model not found
      if (
        errMsg.includes('model') &&
        (errMsg.includes('not found') || errMsg.includes('does not exist'))
      ) {
        const ollamaErr = new OllamaOfflineError(
          `Model "${model}" not found. Run: ollama pull ${model}`,
          'model_missing'
        )
        incrementAiMetric('ai.call.failure')
        log.ai.error('Model not found', { context: { model, baseUrl }, error: generateErr })
        reportAppError(ollamaErr, { category: 'ai', action: 'parseWithOllama' })
        throw ollamaErr
      }

      // Connection refused / unreachable
      if (
        errMsg.includes('ECONNREFUSED') ||
        errMsg.includes('unreachable') ||
        errMsg.includes('network') ||
        errMsg.includes('fetch failed')
      ) {
        const ollamaErr = new OllamaOfflineError(
          `Ollama unreachable at ${baseUrl}: ${errMsg}`,
          'unreachable'
        )
        incrementAiMetric('ai.call.offline')
        incrementAiMetric('ai.call.failure')
        log.ai.error('Ollama unreachable', { context: { model, baseUrl }, error: generateErr })
        reportAppError(ollamaErr, { category: 'ai', action: 'parseWithOllama' })
        throw ollamaErr
      }

      // generateObject failed for schema/parsing reasons; fall through to manual fallback
      log.ai.warn('generateObject failed, falling back to manual JSON extraction', {
        context: { model, error: errMsg.slice(0, 200) },
      })
    }
  } catch (err) {
    // Re-throw OllamaOfflineError (already classified above)
    if (err instanceof OllamaOfflineError) throw err
    // Unexpected errors fall through to manual fallback
    log.ai.warn('AI SDK path failed unexpectedly, falling back to manual extraction', {
      error: err,
    })
  }

  // FALLBACK: manual Ollama chat + JSON extraction (handles Gemma markdown-wrapped JSON)
  const { Ollama } = await import('ollama')
  const ollamaClient = new Ollama({ host: baseUrl })

  let rawText: string
  const chatPayload = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: userContent,
        ...(options?.images?.length ? { images: options.images } : {}),
      },
    ],
    format: 'json',
    options: {
      num_predict: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
    },
    keep_alive: '30m',
  } as any
  try {
    const response = await withTimeout(
      ollamaClient.chat(chatPayload) as any,
      timeoutMs,
      'chat-fallback'
    )
    rawText = (response as any).message.content
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    if (errMsg.includes('timeout') || errMsg.includes('aborted') || errMsg.includes('AbortError')) {
      const ollamaErr = new OllamaOfflineError(`Ollama timed out at ${baseUrl}`, 'timeout')
      incrementAiMetric('ai.call.timeout')
      incrementAiMetric('ai.call.failure')
      log.ai.error('Ollama timed out (fallback)', {
        context: { model, baseUrl, timeoutMs },
        error: err,
      })
      reportAppError(ollamaErr, { category: 'ai', action: 'parseWithOllama' })
      throw ollamaErr
    }
    const ollamaErr = new OllamaOfflineError(
      `Ollama unreachable at ${baseUrl}: ${errMsg}`,
      'unreachable'
    )
    incrementAiMetric('ai.call.offline')
    incrementAiMetric('ai.call.failure')
    log.ai.error('Ollama unreachable (fallback)', { context: { model, baseUrl }, error: err })
    reportAppError(ollamaErr, { category: 'ai', action: 'parseWithOllama' })
    throw ollamaErr
  }

  if (!rawText) {
    const ollamaErr = new OllamaOfflineError('Ollama returned an empty response', 'empty_response')
    incrementAiMetric('ai.call.failure')
    log.ai.error('Empty response from Ollama', { context: { model, baseUrl } })
    reportAppError(ollamaErr, { category: 'ai', action: 'parseWithOllama' })
    throw ollamaErr
  }

  const jsonStr = extractJsonPayload(rawText)
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    const ollamaErr = new OllamaOfflineError(
      `Ollama response was not valid JSON. Raw: ${rawText.slice(0, 200)}`,
      'invalid_json'
    )
    incrementAiMetric('ai.call.failure')
    log.ai.error('Invalid JSON from Ollama', {
      context: { model, rawSnippet: rawText.slice(0, 100) },
    })
    reportAppError(ollamaErr, { category: 'ai', action: 'parseWithOllama' })
    throw ollamaErr
  }

  const zodResult = schema.safeParse(parsed)
  if (!zodResult.success) {
    const issues = formatZodIssues(zodResult.error)
    const ollamaErr = new OllamaOfflineError(
      `Ollama response failed schema validation: ${issues}`,
      'validation_failed'
    )
    incrementAiMetric('ai.call.failure')
    log.ai.error('Fallback validation failed', { context: { model, issues } })
    reportAppError(ollamaErr, { category: 'ai', action: 'parseWithOllama' })
    throw ollamaErr
  }

  const durationMs = Date.now() - startTime
  log.ai.info('Parsed successfully via fallback', {
    context: {
      model,
      executionLocation: dispatch.executionLocation,
      privacyLevel: dispatch.privacy.level,
    },
    durationMs,
  })
  incrementAiMetric('ai.call.success')
  recordAiLatency(durationMs)
  if (options?.modelTier) recordAiTier(options.modelTier)
  if (options?.cache) setCachedResult(systemPrompt, userContent, model, zodResult.data)
  return zodResult.data
}
