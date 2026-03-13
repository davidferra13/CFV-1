// Mistral/Codestral-backed AI Parser - NON-PRIVATE DATA ONLY
// Free cloud inference via Mistral AI (OpenAI-compatible API).
// Codestral is optimized for code tasks. Mistral models for general use.
// NEVER use this for client PII, financials, allergies, or messages.

'use server'

import { z } from 'zod'
import { log } from '@/lib/logger'
import { incrementAiMetric, recordAiLatency } from './ai-metrics'
import { reportAppError } from '@/lib/monitoring/sentry-reporter'
import { isMistralEnabled, getMistralConfig, getMistralModel } from './providers'
import type { ModelTier } from './providers'

function extractJsonPayload(rawText: string): string {
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
  return jsonMatch ? jsonMatch[1].trim() : rawText.trim()
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
}

export class MistralError extends Error {
  constructor(
    message: string,
    public code:
      | 'not_configured'
      | 'unreachable'
      | 'timeout'
      | 'rate_limited'
      | 'invalid_json'
      | 'validation_failed'
      | 'empty_response'
  ) {
    super(message)
    this.name = 'MistralError'
  }
}

export interface ParseMistralOptions {
  modelTier?: ModelTier
  timeoutMs?: number
  maxTokens?: number
  model?: string
  temperature?: number
  /** Use Codestral endpoint instead of standard Mistral. */
  useCodestral?: boolean
}

const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_TOKENS = 512

/**
 * Parse structured data using Mistral AI cloud API.
 * OpenAI-compatible endpoint for both Mistral and Codestral models.
 *
 * PRIVACY: This function sends data to Mistral cloud servers.
 * ONLY use for non-private, generic tasks. NEVER for client data.
 */
export async function parseWithMistral<T>(
  systemPrompt: string,
  userContent: string,
  schema: z.ZodType<T>,
  options?: ParseMistralOptions
): Promise<T> {
  if (!isMistralEnabled()) {
    throw new MistralError('MISTRAL_API_KEY is not set in environment', 'not_configured')
  }

  const config = getMistralConfig()
  const useCodestral = options?.useCodestral ?? false
  const baseUrl = useCodestral ? config.codestralBaseUrl : config.baseUrl
  const model = options?.model || getMistralModel(options?.modelTier || 'fast', useCodestral)
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS
  const temperature = options?.temperature ?? 0.0

  const startTime = Date.now()

  let rawText: string
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    })

    clearTimeout(timer)

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after')
      throw new MistralError(
        `Mistral rate limited. Retry after ${retryAfter || 'unknown'}s`,
        'rate_limited'
      )
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown')
      throw new MistralError(
        `Mistral API error ${response.status}: ${errorBody.slice(0, 200)}`,
        'unreachable'
      )
    }

    const data = await response.json()
    rawText = data.choices?.[0]?.message?.content || ''
  } catch (err) {
    if (err instanceof MistralError) throw err

    const errMsg = err instanceof Error ? err.message : String(err)
    if (errMsg.includes('aborted') || errMsg.includes('AbortError')) {
      const mErr = new MistralError(
        `Mistral timed out after ${Math.round(timeoutMs / 1000)}s`,
        'timeout'
      )
      incrementAiMetric('ai.call.timeout')
      incrementAiMetric('ai.call.failure')
      log.ai.error('Mistral timed out', { context: { model, timeoutMs }, error: err })
      reportAppError(mErr, { category: 'ai', action: 'parseWithMistral' })
      throw mErr
    }

    const mErr = new MistralError(`Mistral unreachable: ${errMsg}`, 'unreachable')
    incrementAiMetric('ai.call.failure')
    log.ai.error('Mistral unreachable', { context: { model }, error: err })
    reportAppError(mErr, { category: 'ai', action: 'parseWithMistral' })
    throw mErr
  }

  if (!rawText) {
    const mErr = new MistralError('Mistral returned an empty response', 'empty_response')
    incrementAiMetric('ai.call.failure')
    log.ai.error('Empty response from Mistral', { context: { model } })
    reportAppError(mErr, { category: 'ai', action: 'parseWithMistral' })
    throw mErr
  }

  const jsonStr = extractJsonPayload(rawText)
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    const mErr = new MistralError(
      `Mistral response was not valid JSON. Raw: ${rawText.slice(0, 200)}`,
      'invalid_json'
    )
    incrementAiMetric('ai.call.failure')
    log.ai.error('Invalid JSON from Mistral', {
      context: { model, rawSnippet: rawText.slice(0, 100) },
    })
    reportAppError(mErr, { category: 'ai', action: 'parseWithMistral' })
    throw mErr
  }

  const zodResult = schema.safeParse(parsed)
  if (!zodResult.success) {
    const issues = formatZodIssues(zodResult.error)
    const mErr = new MistralError(
      `Mistral response failed schema validation: ${issues}`,
      'validation_failed'
    )
    incrementAiMetric('ai.call.failure')
    log.ai.error('Mistral validation failed', { context: { model, issues } })
    reportAppError(mErr, { category: 'ai', action: 'parseWithMistral' })
    throw mErr
  }

  const durationMs = Date.now() - startTime
  log.ai.info('Mistral parsed successfully', { context: { model }, durationMs })
  incrementAiMetric('ai.call.success')
  recordAiLatency(durationMs)
  return zodResult.data
}
