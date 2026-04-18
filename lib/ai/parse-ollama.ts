// Ollama-compatible AI Parser - for structured data extraction.
// Routes through the configured Ollama-compatible endpoint (cloud in production, local in dev).
// No Gemini fallback. If the runtime is unavailable, OllamaOfflineError is thrown.
// The UI layer catches OllamaOfflineError and shows a provider-agnostic unavailability message.

'use server'

import { Ollama, type ChatResponse } from 'ollama'
import { z } from 'zod'
import { isOllamaEnabled, getOllamaConfig, getOllamaModel } from './providers'
import type { ModelTier } from './providers'
import { OllamaOfflineError } from './ollama-errors'
import { getCachedResult, setCachedResult } from './ollama-cache'
import { log } from '@/lib/logger'
import { incrementAiMetric, recordAiLatency, recordAiTier } from './ai-metrics'
import { reportAppError } from '@/lib/monitoring/sentry-reporter'

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
  if (!isOllamaEnabled()) {
    throw new OllamaOfflineError('OLLAMA_BASE_URL is not set in environment', 'not_configured')
  }

  // Truncate oversized input to prevent Ollama from hanging or OOM
  if (userContent.length > MAX_INPUT_LENGTH) {
    log.ai.warn('Input truncated for parseWithOllama', {
      context: { originalLength: userContent.length, maxLength: MAX_INPUT_LENGTH },
    })
    userContent = userContent.slice(0, MAX_INPUT_LENGTH)
  }

  const config = getOllamaConfig()
  const baseUrl = options?.endpointUrl || config.baseUrl
  const model =
    options?.model || (options?.modelTier ? getOllamaModel(options.modelTier) : config.model)

  // Check cache first
  if (options?.cache) {
    const cached = getCachedResult<T>(systemPrompt, userContent, model)
    if (cached !== undefined) {
      log.ai.info('Cache hit', { context: { model } })
      incrementAiMetric('ai.call.cache_hit')
      return cached
    }
  }

  const ollama = new Ollama({ host: baseUrl })
  const startTime = Date.now()
  const timeoutMs = options?.timeoutMs ?? DEFAULT_OLLAMA_TIMEOUT_MS

  // Single call with one retry on transient failure. Gemma 4 responds in <2s;
  // if it fails twice, something is genuinely wrong.
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
    think: false,
  } as any
  try {
    let response: ChatResponse
    try {
      response = (await withTimeout(
        ollama.chat(chatPayload) as unknown as Promise<ChatResponse>,
        timeoutMs,
        'chat'
      )) as ChatResponse
    } catch (firstErr) {
      // Single retry on transient errors
      const msg = firstErr instanceof Error ? firstErr.message : String(firstErr)
      const isTransient =
        firstErr instanceof OllamaOfflineError ||
        msg.includes('timeout') ||
        msg.includes('aborted') ||
        msg.includes('unreachable') ||
        msg.includes('network')
      if (!isTransient) throw firstErr
      log.ai.warn('Retrying after transient failure', { error: firstErr })
      response = (await withTimeout(
        ollama.chat(chatPayload) as unknown as Promise<ChatResponse>,
        timeoutMs,
        'chat'
      )) as ChatResponse
    }
    rawText = response.message.content
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    // Distinguish connection errors from model-not-found
    if (
      errMsg.includes('model') &&
      (errMsg.includes('not found') || errMsg.includes('does not exist'))
    ) {
      const ollamaErr = new OllamaOfflineError(
        `Model "${model}" not found. Run: ollama pull ${model}`,
        'model_missing'
      )
      incrementAiMetric('ai.call.failure')
      log.ai.error('Model not found', { context: { model, baseUrl }, error: err })
      reportAppError(ollamaErr, { category: 'ai', action: 'parseWithOllama' })
      throw ollamaErr
    }
    if (errMsg.includes('timeout') || errMsg.includes('aborted') || errMsg.includes('AbortError')) {
      const ollamaErr = new OllamaOfflineError(`Ollama timed out at ${baseUrl}`, 'timeout')
      incrementAiMetric('ai.call.timeout')
      incrementAiMetric('ai.call.failure')
      log.ai.error('Ollama timed out', { context: { model, baseUrl, timeoutMs }, error: err })
      reportAppError(ollamaErr, { category: 'ai', action: 'parseWithOllama' })
      throw ollamaErr
    }
    const ollamaErr = new OllamaOfflineError(
      `Ollama unreachable at ${baseUrl}: ${errMsg}`,
      'unreachable'
    )
    incrementAiMetric('ai.call.offline')
    incrementAiMetric('ai.call.failure')
    log.ai.error('Ollama unreachable', { context: { model, baseUrl }, error: err })
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

  let jsonStr = extractJsonPayload(rawText)
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

  let zodResult = schema.safeParse(parsed)
  if (!zodResult.success) {
    const firstPassIssues = formatZodIssues(zodResult.error)
    log.ai.warn('Zod validation failed, attempting repair pass', {
      context: { model, issues: firstPassIssues },
    })
    incrementAiMetric('ai.call.repair_attempted')

    // Single repair pass via the same runtime endpoint
    try {
      const repairResponse = await withTimeout(
        ollama.chat({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                'Your previous response did not satisfy the required JSON schema.',
                `Validation errors: ${firstPassIssues}`,
                'Return ONLY corrected JSON (no markdown, no prose).',
                'Keep the same structure and preserve as much extracted data as possible.',
                '--- Previous JSON ---',
                jsonStr,
              ].join('\n'),
            },
          ],
          format: 'json',
          options: { num_predict: options?.maxTokens ?? DEFAULT_MAX_TOKENS },
          keep_alive: '30m',
          think: false,
        } as any) as unknown as Promise<ChatResponse>,
        timeoutMs,
        'repair'
      )

      const repairedText = repairResponse.message.content
      const repairedJsonStr = extractJsonPayload(repairedText || '')
      const repairedParsed = JSON.parse(repairedJsonStr)
      const repairedResult = schema.safeParse(repairedParsed)

      if (repairedResult.success) {
        const durationMs = Date.now() - startTime
        log.ai.info('Repair pass succeeded', { context: { model, repair: true }, durationMs })
        incrementAiMetric('ai.call.repair_succeeded')
        incrementAiMetric('ai.call.success')
        recordAiLatency(durationMs)
        if (options?.modelTier) recordAiTier(options.modelTier)
        if (options?.cache) setCachedResult(systemPrompt, userContent, model, repairedResult.data)
        return repairedResult.data
      }

      const repairIssues = formatZodIssues(repairedResult.error)
      const ollamaErr = new OllamaOfflineError(
        `Ollama repair pass failed schema validation: ${repairIssues}`,
        'validation_failed'
      )
      incrementAiMetric('ai.call.failure')
      log.ai.error('Repair pass failed validation', { context: { model, issues: repairIssues } })
      reportAppError(ollamaErr, { category: 'ai', action: 'parseWithOllama' })
      throw ollamaErr
    } catch (err) {
      if (err instanceof OllamaOfflineError) throw err
      const ollamaErr = new OllamaOfflineError(
        `Ollama repair pass error: ${err instanceof Error ? err.message : String(err)}`,
        'validation_failed'
      )
      incrementAiMetric('ai.call.failure')
      log.ai.error('Repair pass crashed', { context: { model }, error: err })
      reportAppError(ollamaErr, { category: 'ai', action: 'parseWithOllama' })
      throw ollamaErr
    }
  }

  const durationMs = Date.now() - startTime
  log.ai.info('Parsed successfully', { context: { model }, durationMs })
  incrementAiMetric('ai.call.success')
  recordAiLatency(durationMs)
  if (options?.modelTier) recordAiTier(options.modelTier)
  if (options?.cache) setCachedResult(systemPrompt, userContent, model, zodResult.data)
  return zodResult.data
}
