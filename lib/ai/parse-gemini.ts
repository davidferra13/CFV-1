// Gemini-backed generic AI Parser - NON-PRIVATE DATA ONLY
// Uses Google GenAI SDK for structured JSON extraction.
// For culinary domain content, technique lists, kitchen specs.
// NEVER use this for client PII, financials, allergies, or messages.

'use server'

import { z } from 'zod'
import { log } from '@/lib/logger'
import { incrementAiMetric, recordAiLatency } from './ai-metrics'
import { reportAppError } from '@/lib/monitoring/sentry-reporter'
import { GeminiParseError } from './provider-errors'
import type { ParseGeminiOptions } from './provider-errors'

function extractJsonPayload(rawText: string): string {
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
  return jsonMatch ? jsonMatch[1].trim() : rawText.trim()
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
}

const DEFAULT_TIMEOUT_MS = 30_000

/**
 * Generic structured JSON parser using Gemini.
 * Wraps Google GenAI SDK for use by the dispatch layer.
 *
 * PRIVACY: This function sends data to Google cloud servers.
 * ONLY use for non-private, generic tasks. NEVER for client data.
 */
export async function parseWithGemini<T>(
  systemPrompt: string,
  userContent: string,
  schema: z.ZodType<T>,
  options?: ParseGeminiOptions
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new GeminiParseError('GEMINI_API_KEY is not set in environment', 'not_configured')
  }

  const model = options?.model || 'gemini-2.0-flash'
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const temperature = options?.temperature ?? 0.0

  const startTime = Date.now()

  let rawText: string
  try {
    // Lazy import to avoid pulling in the SDK when not needed
    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey })

    // Use AbortController for timeout
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const response = await ai.models.generateContent({
      model,
      contents: `${systemPrompt}\n\n${userContent}\n\nRespond with valid JSON only.`,
      config: {
        responseMimeType: 'application/json',
        temperature,
        maxOutputTokens: options?.maxTokens,
      },
    })

    clearTimeout(timer)
    rawText = response.text || ''
  } catch (err) {
    if (err instanceof GeminiParseError) throw err

    const errMsg = err instanceof Error ? err.message : String(err)
    if (errMsg.includes('aborted') || errMsg.includes('AbortError')) {
      const gErr = new GeminiParseError(
        `Gemini timed out after ${Math.round(timeoutMs / 1000)}s`,
        'timeout'
      )
      incrementAiMetric('ai.call.timeout')
      incrementAiMetric('ai.call.failure')
      log.ai.error('Gemini timed out', { context: { model, timeoutMs }, error: err })
      reportAppError(gErr, { category: 'ai', action: 'parseWithGemini' })
      throw gErr
    }

    if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
      const gErr = new GeminiParseError('Gemini rate limited', 'rate_limited')
      incrementAiMetric('ai.call.failure')
      log.ai.error('Gemini rate limited', { context: { model }, error: err })
      reportAppError(gErr, { category: 'ai', action: 'parseWithGemini' })
      throw gErr
    }

    const gErr = new GeminiParseError(`Gemini unreachable: ${errMsg}`, 'unreachable')
    incrementAiMetric('ai.call.failure')
    log.ai.error('Gemini unreachable', { context: { model }, error: err })
    reportAppError(gErr, { category: 'ai', action: 'parseWithGemini' })
    throw gErr
  }

  if (!rawText) {
    const gErr = new GeminiParseError('Gemini returned an empty response', 'empty_response')
    incrementAiMetric('ai.call.failure')
    log.ai.error('Empty response from Gemini', { context: { model } })
    reportAppError(gErr, { category: 'ai', action: 'parseWithGemini' })
    throw gErr
  }

  const jsonStr = extractJsonPayload(rawText)
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    const gErr = new GeminiParseError(
      `Gemini response was not valid JSON. Raw: ${rawText.slice(0, 200)}`,
      'invalid_json'
    )
    incrementAiMetric('ai.call.failure')
    log.ai.error('Invalid JSON from Gemini', {
      context: { model, rawSnippet: rawText.slice(0, 100) },
    })
    reportAppError(gErr, { category: 'ai', action: 'parseWithGemini' })
    throw gErr
  }

  const zodResult = schema.safeParse(parsed)
  if (!zodResult.success) {
    const issues = formatZodIssues(zodResult.error)
    const gErr = new GeminiParseError(
      `Gemini response failed schema validation: ${issues}`,
      'validation_failed'
    )
    incrementAiMetric('ai.call.failure')
    log.ai.error('Gemini validation failed', { context: { model, issues } })
    reportAppError(gErr, { category: 'ai', action: 'parseWithGemini' })
    throw gErr
  }

  const durationMs = Date.now() - startTime
  log.ai.info('Gemini parsed successfully', { context: { model }, durationMs })
  incrementAiMetric('ai.call.success')
  recordAiLatency(durationMs)
  return zodResult.data
}
