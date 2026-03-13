// Cerebras-backed AI Parser - NON-PRIVATE DATA ONLY
// Free cloud inference via Cerebras (OpenAI-compatible API).
// ~2000 tok/s on Llama models. Free tier available.
// NEVER use this for client PII, financials, allergies, or messages.

'use server'

import { z } from 'zod'
import { log } from '@/lib/logger'
import { incrementAiMetric, recordAiLatency } from './ai-metrics'
import { reportAppError } from '@/lib/monitoring/sentry-reporter'
import { isCerebrasEnabled, getCerebrasConfig, getCerebrasModel } from './providers'
import type { ModelTier } from './providers'

function extractJsonPayload(rawText: string): string {
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
  return jsonMatch ? jsonMatch[1].trim() : rawText.trim()
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
}

export class CerebrasError extends Error {
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
    this.name = 'CerebrasError'
  }
}

export interface ParseCerebrasOptions {
  modelTier?: ModelTier
  timeoutMs?: number
  maxTokens?: number
  model?: string
  temperature?: number
}

const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_TOKENS = 512

/**
 * Parse structured data using Cerebras cloud API.
 * OpenAI-compatible endpoint, ~2000 tok/s on Llama models.
 *
 * PRIVACY: This function sends data to Cerebras cloud servers.
 * ONLY use for non-private, generic tasks. NEVER for client data.
 */
export async function parseWithCerebras<T>(
  systemPrompt: string,
  userContent: string,
  schema: z.ZodType<T>,
  options?: ParseCerebrasOptions
): Promise<T> {
  if (!isCerebrasEnabled()) {
    throw new CerebrasError('CEREBRAS_API_KEY is not set in environment', 'not_configured')
  }

  const config = getCerebrasConfig()
  const model = options?.model || getCerebrasModel(options?.modelTier || 'fast')
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS
  const temperature = options?.temperature ?? 0.0

  const startTime = Date.now()

  let rawText: string
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
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
      throw new CerebrasError(
        `Cerebras rate limited. Retry after ${retryAfter || 'unknown'}s`,
        'rate_limited'
      )
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown')
      throw new CerebrasError(
        `Cerebras API error ${response.status}: ${errorBody.slice(0, 200)}`,
        'unreachable'
      )
    }

    const data = await response.json()
    rawText = data.choices?.[0]?.message?.content || ''
  } catch (err) {
    if (err instanceof CerebrasError) throw err

    const errMsg = err instanceof Error ? err.message : String(err)
    if (errMsg.includes('aborted') || errMsg.includes('AbortError')) {
      const cbErr = new CerebrasError(
        `Cerebras timed out after ${Math.round(timeoutMs / 1000)}s`,
        'timeout'
      )
      incrementAiMetric('ai.call.timeout')
      incrementAiMetric('ai.call.failure')
      log.ai.error('Cerebras timed out', { context: { model, timeoutMs }, error: err })
      reportAppError(cbErr, { category: 'ai', action: 'parseWithCerebras' })
      throw cbErr
    }

    const cbErr = new CerebrasError(`Cerebras unreachable: ${errMsg}`, 'unreachable')
    incrementAiMetric('ai.call.failure')
    log.ai.error('Cerebras unreachable', { context: { model }, error: err })
    reportAppError(cbErr, { category: 'ai', action: 'parseWithCerebras' })
    throw cbErr
  }

  if (!rawText) {
    const cbErr = new CerebrasError('Cerebras returned an empty response', 'empty_response')
    incrementAiMetric('ai.call.failure')
    log.ai.error('Empty response from Cerebras', { context: { model } })
    reportAppError(cbErr, { category: 'ai', action: 'parseWithCerebras' })
    throw cbErr
  }

  const jsonStr = extractJsonPayload(rawText)
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    const cbErr = new CerebrasError(
      `Cerebras response was not valid JSON. Raw: ${rawText.slice(0, 200)}`,
      'invalid_json'
    )
    incrementAiMetric('ai.call.failure')
    log.ai.error('Invalid JSON from Cerebras', {
      context: { model, rawSnippet: rawText.slice(0, 100) },
    })
    reportAppError(cbErr, { category: 'ai', action: 'parseWithCerebras' })
    throw cbErr
  }

  const zodResult = schema.safeParse(parsed)
  if (!zodResult.success) {
    const issues = formatZodIssues(zodResult.error)
    const cbErr = new CerebrasError(
      `Cerebras response failed schema validation: ${issues}`,
      'validation_failed'
    )
    incrementAiMetric('ai.call.failure')
    log.ai.error('Cerebras validation failed', { context: { model, issues } })
    reportAppError(cbErr, { category: 'ai', action: 'parseWithCerebras' })
    throw cbErr
  }

  const durationMs = Date.now() - startTime
  log.ai.info('Cerebras parsed successfully', { context: { model }, durationMs })
  incrementAiMetric('ai.call.success')
  recordAiLatency(durationMs)
  return zodResult.data
}
