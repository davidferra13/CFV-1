// Ollama-backed AI Parser — PRIVATE DATA ONLY
// Hard rule: private data (client PII, financials, allergies, messages) stays local.
// No Gemini fallback. If Ollama is offline, OllamaOfflineError is thrown.
// The UI layer catches OllamaOfflineError and shows a clear "start Ollama" message.

'use server'

import { Ollama } from 'ollama'
import { z } from 'zod'
import { isOllamaEnabled, getOllamaConfig, getOllamaModel } from './providers'
import type { ModelTier } from './providers'
import { OllamaOfflineError } from './ollama-errors'
import { getCachedResult, setCachedResult } from './ollama-cache'

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
}

/** Default max tokens for structured JSON responses — keeps Ollama from running away */
const DEFAULT_MAX_TOKENS = 512

/** Default hard timeout for any Ollama call — prevents infinite hangs */
const DEFAULT_OLLAMA_TIMEOUT_MS = 30_000

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
 * Privacy-first parsing using local Ollama model.
 * Mirrors parseWithAI signature — drop-in for sensitive operations.
 *
 * Routing:
 *   OLLAMA_BASE_URL set + reachable → Ollama (data stays local)
 *   OLLAMA_BASE_URL not set         → OllamaOfflineError (never Gemini)
 *   Ollama unreachable at runtime   → OllamaOfflineError (never Gemini)
 *   Ollama returns invalid output   → OllamaOfflineError (never Gemini)
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

  const config = getOllamaConfig()
  const model = options?.modelTier ? getOllamaModel(options.modelTier) : config.model

  // Check cache first
  if (options?.cache) {
    const cached = getCachedResult<T>(systemPrompt, userContent, model)
    if (cached !== undefined) {
      console.log(`[ollama] Cache hit for ${model}`)
      return cached
    }
  }

  const ollama = new Ollama({ host: config.baseUrl })
  const startTime = Date.now()
  const timeoutMs = options?.timeoutMs ?? DEFAULT_OLLAMA_TIMEOUT_MS

  // Retry Ollama call up to 2 times on transient errors, with hard timeout per attempt
  let rawText: string
  const { withRetry } = await import('@/lib/resilience/retry')
  try {
    const response = await withRetry(
      () =>
        withTimeout(
          ollama.chat({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userContent },
            ],
            format: 'json',
            options: { num_predict: options?.maxTokens ?? DEFAULT_MAX_TOKENS },
          }),
          timeoutMs,
          'chat'
        ),
      {
        maxAttempts: 2,
        onRetry: (attempt, err) => {
          console.warn(`[ollama] Retry attempt ${attempt} due to error:`, err)
        },
        retryOn: (err) => {
          if (err instanceof OllamaOfflineError) return true
          const msg = err instanceof Error ? err.message : String(err)
          return (
            msg.includes('timeout') ||
            msg.includes('aborted') ||
            msg.includes('AbortError') ||
            msg.includes('unreachable') ||
            msg.includes('network')
          )
        },
      }
    )
    rawText = response.message.content
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    // Distinguish connection errors from model-not-found
    if (
      errMsg.includes('model') &&
      (errMsg.includes('not found') || errMsg.includes('does not exist'))
    ) {
      throw new OllamaOfflineError(
        `Model "${model}" not found. Run: ollama pull ${model}`,
        'model_missing'
      )
    }
    if (errMsg.includes('timeout') || errMsg.includes('aborted') || errMsg.includes('AbortError')) {
      throw new OllamaOfflineError(`Ollama timed out at ${config.baseUrl}`, 'timeout')
    }
    throw new OllamaOfflineError(
      `Ollama unreachable at ${config.baseUrl}: ${errMsg}`,
      'unreachable'
    )
  }

  if (!rawText) {
    throw new OllamaOfflineError('Ollama returned an empty response', 'empty_response')
  }

  let jsonStr = extractJsonPayload(rawText)
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new OllamaOfflineError(
      `Ollama response was not valid JSON. Raw: ${rawText.slice(0, 200)}`,
      'invalid_json'
    )
  }

  let zodResult = schema.safeParse(parsed)
  if (!zodResult.success) {
    const firstPassIssues = formatZodIssues(zodResult.error)
    console.warn('[ollama] Zod validation failed, attempting repair pass. Issues:', firstPassIssues)

    // Single repair pass via Ollama (still local — no privacy risk)
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
        }),
        timeoutMs,
        'repair'
      )

      const repairedText = repairResponse.message.content
      const repairedJsonStr = extractJsonPayload(repairedText || '')
      const repairedParsed = JSON.parse(repairedJsonStr)
      const repairedResult = schema.safeParse(repairedParsed)

      if (repairedResult.success) {
        const durationMs = Date.now() - startTime
        console.log(`[ollama] Repair pass succeeded with ${model} (${durationMs}ms, repair=true)`)
        if (options?.cache) setCachedResult(systemPrompt, userContent, model, repairedResult.data)
        return repairedResult.data
      }

      const repairIssues = formatZodIssues(repairedResult.error)
      throw new OllamaOfflineError(
        `Ollama repair pass failed schema validation: ${repairIssues}`,
        'validation_failed'
      )
    } catch (err) {
      if (err instanceof OllamaOfflineError) throw err
      throw new OllamaOfflineError(
        `Ollama repair pass error: ${err instanceof Error ? err.message : String(err)}`,
        'validation_failed'
      )
    }
  }

  const durationMs = Date.now() - startTime
  console.log(`[ollama] Parsed successfully with ${model} (${durationMs}ms)`)
  if (options?.cache) setCachedResult(systemPrompt, userContent, model, zodResult.data)
  return zodResult.data
}
