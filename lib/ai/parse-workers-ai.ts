// Cloudflare Workers AI parser - NON-PRIVATE DATA ONLY
// Uses the OpenAI-compatible Workers AI endpoint for generic tasks only.
// NEVER use this for client PII, financials, allergies, or messages.

'use server'

import { z } from 'zod'
import { log } from '@/lib/logger'
import { incrementAiMetric, recordAiLatency } from './ai-metrics'
import { reportAppError } from '@/lib/monitoring/sentry-reporter'
import { getWorkersAiConfig, getWorkersAiModel, isWorkersAiEnabled } from './providers'
import type { ModelTier } from './providers'
import { WorkersAiError } from './provider-errors'
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

export async function parseWithWorkersAi<T>(
  systemPrompt: string,
  userContent: string,
  schema: z.ZodType<T>,
  options?: ParseProviderOptions
): Promise<T> {
  if (!isWorkersAiEnabled()) {
    throw new WorkersAiError(
      'CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set in environment',
      'not_configured'
    )
  }

  const config = getWorkersAiConfig()
  const model = options?.model || getWorkersAiModel(options?.modelTier || 'fast')
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
        Authorization: `Bearer ${config.apiToken}`,
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
      throw new WorkersAiError(
        `Workers AI rate limited. Retry after ${retryAfter || 'unknown'}s`,
        'rate_limited'
      )
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown')
      throw new WorkersAiError(
        `Workers AI API error ${response.status}: ${errorBody.slice(0, 200)}`,
        'unreachable'
      )
    }

    const data = await response.json()
    rawText = data.choices?.[0]?.message?.content || ''
  } catch (err) {
    if (err instanceof WorkersAiError) throw err

    const errMsg = err instanceof Error ? err.message : String(err)
    if (errMsg.includes('aborted') || errMsg.includes('AbortError')) {
      const workersErr = new WorkersAiError(
        `Workers AI timed out after ${Math.round(timeoutMs / 1000)}s`,
        'timeout'
      )
      incrementAiMetric('ai.call.timeout')
      incrementAiMetric('ai.call.failure')
      log.ai.error('Workers AI timed out', { context: { model, timeoutMs }, error: err })
      reportAppError(workersErr, { category: 'ai', action: 'parseWithWorkersAi' })
      throw workersErr
    }

    const workersErr = new WorkersAiError(`Workers AI unreachable: ${errMsg}`, 'unreachable')
    incrementAiMetric('ai.call.failure')
    log.ai.error('Workers AI unreachable', { context: { model }, error: err })
    reportAppError(workersErr, { category: 'ai', action: 'parseWithWorkersAi' })
    throw workersErr
  }

  if (!rawText) {
    const workersErr = new WorkersAiError('Workers AI returned an empty response', 'empty_response')
    incrementAiMetric('ai.call.failure')
    log.ai.error('Empty response from Workers AI', { context: { model } })
    reportAppError(workersErr, { category: 'ai', action: 'parseWithWorkersAi' })
    throw workersErr
  }

  const jsonStr = extractJsonPayload(rawText)
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    const workersErr = new WorkersAiError(
      `Workers AI response was not valid JSON. Raw: ${rawText.slice(0, 200)}`,
      'invalid_json'
    )
    incrementAiMetric('ai.call.failure')
    log.ai.error('Invalid JSON from Workers AI', {
      context: { model, rawSnippet: rawText.slice(0, 100) },
    })
    reportAppError(workersErr, { category: 'ai', action: 'parseWithWorkersAi' })
    throw workersErr
  }

  const zodResult = schema.safeParse(parsed)
  if (!zodResult.success) {
    const issues = formatZodIssues(zodResult.error)
    const workersErr = new WorkersAiError(
      `Workers AI response failed schema validation: ${issues}`,
      'validation_failed'
    )
    incrementAiMetric('ai.call.failure')
    log.ai.error('Workers AI validation failed', { context: { model, issues } })
    reportAppError(workersErr, { category: 'ai', action: 'parseWithWorkersAi' })
    throw workersErr
  }

  const durationMs = Date.now() - startTime
  log.ai.info('Workers AI parsed successfully', { context: { model }, durationMs })
  incrementAiMetric('ai.call.success')
  recordAiLatency(durationMs)
  return zodResult.data
}
