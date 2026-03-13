// Groq-backed AI Parser — NON-PRIVATE DATA ONLY
// Free cloud inference via Groq (OpenAI-compatible API).
// For generic tasks: technique lists, campaign concepts, code generation.
// NEVER use this for client PII, financials, allergies, or messages.
// Those MUST use parseWithOllama (local only).

'use server'

import { z } from 'zod'
import { log } from '@/lib/logger'
import { incrementAiMetric, recordAiLatency } from './ai-metrics'
import { reportAppError } from '@/lib/monitoring/sentry-reporter'
import { isGroqEnabled, getGroqConfig, getGroqModel } from './providers'
import type { ModelTier } from './providers'
import { GroqError } from './provider-errors'
import type { ParseProviderOptions } from './provider-errors'

function extractJsonPayload(rawText: string): string {
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
  return jsonMatch ? jsonMatch[1].trim() : rawText.trim()
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
}

const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_TOKENS = 512

/**
 * Parse structured data using Groq's free cloud API.
 * OpenAI-compatible endpoint, no SDK needed.
 *
 * PRIVACY: This function sends data to Groq's cloud servers.
 * ONLY use for non-private, generic tasks. NEVER for client data.
 */
export async function parseWithGroq<T>(
  systemPrompt: string,
  userContent: string,
  schema: z.ZodType<T>,
  options?: ParseProviderOptions
): Promise<T> {
  if (!isGroqEnabled()) {
    throw new GroqError('GROQ_API_KEY is not set in environment', 'not_configured')
  }

  const config = getGroqConfig()
  const model = options?.model || getGroqModel(options?.modelTier || 'fast')
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
      throw new GroqError(
        `Groq rate limited. Retry after ${retryAfter || 'unknown'}s`,
        'rate_limited'
      )
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown')
      throw new GroqError(
        `Groq API error ${response.status}: ${errorBody.slice(0, 200)}`,
        'unreachable'
      )
    }

    const data = await response.json()
    rawText = data.choices?.[0]?.message?.content || ''
  } catch (err) {
    if (err instanceof GroqError) throw err

    const errMsg = err instanceof Error ? err.message : String(err)
    if (errMsg.includes('aborted') || errMsg.includes('AbortError')) {
      const groqErr = new GroqError(
        `Groq timed out after ${Math.round(timeoutMs / 1000)}s`,
        'timeout'
      )
      incrementAiMetric('ai.call.timeout')
      incrementAiMetric('ai.call.failure')
      log.ai.error('Groq timed out', { context: { model, timeoutMs }, error: err })
      reportAppError(groqErr, { category: 'ai', action: 'parseWithGroq' })
      throw groqErr
    }

    const groqErr = new GroqError(`Groq unreachable: ${errMsg}`, 'unreachable')
    incrementAiMetric('ai.call.failure')
    log.ai.error('Groq unreachable', { context: { model }, error: err })
    reportAppError(groqErr, { category: 'ai', action: 'parseWithGroq' })
    throw groqErr
  }

  if (!rawText) {
    const groqErr = new GroqError('Groq returned an empty response', 'empty_response')
    incrementAiMetric('ai.call.failure')
    log.ai.error('Empty response from Groq', { context: { model } })
    reportAppError(groqErr, { category: 'ai', action: 'parseWithGroq' })
    throw groqErr
  }

  const jsonStr = extractJsonPayload(rawText)
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    const groqErr = new GroqError(
      `Groq response was not valid JSON. Raw: ${rawText.slice(0, 200)}`,
      'invalid_json'
    )
    incrementAiMetric('ai.call.failure')
    log.ai.error('Invalid JSON from Groq', {
      context: { model, rawSnippet: rawText.slice(0, 100) },
    })
    reportAppError(groqErr, { category: 'ai', action: 'parseWithGroq' })
    throw groqErr
  }

  const zodResult = schema.safeParse(parsed)
  if (!zodResult.success) {
    const issues = formatZodIssues(zodResult.error)
    const groqErr = new GroqError(
      `Groq response failed schema validation: ${issues}`,
      'validation_failed'
    )
    incrementAiMetric('ai.call.failure')
    log.ai.error('Groq validation failed', { context: { model, issues } })
    reportAppError(groqErr, { category: 'ai', action: 'parseWithGroq' })
    throw groqErr
  }

  const durationMs = Date.now() - startTime
  log.ai.info('Groq parsed successfully', { context: { model }, durationMs })
  incrementAiMetric('ai.call.success')
  recordAiLatency(durationMs)
  return zodResult.data
}
