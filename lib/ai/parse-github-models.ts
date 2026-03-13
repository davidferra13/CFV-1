// GitHub Models parser - NON-PRIVATE DATA ONLY
// Uses GitHub Models chat completions for generic tasks only.
// NEVER use this for client PII, financials, allergies, or messages.

'use server'

import { z } from 'zod'
import { log } from '@/lib/logger'
import { incrementAiMetric, recordAiLatency } from './ai-metrics'
import { reportAppError } from '@/lib/monitoring/sentry-reporter'
import { getGitHubModelsConfig, getGitHubModelsModel, isGitHubModelsEnabled } from './providers'
import type { ModelTier } from './providers'
import { GitHubModelsError } from './provider-errors'
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

export async function parseWithGitHubModels<T>(
  systemPrompt: string,
  userContent: string,
  schema: z.ZodType<T>,
  options?: ParseProviderOptions
): Promise<T> {
  if (!isGitHubModelsEnabled()) {
    throw new GitHubModelsError('GITHUB_MODELS_TOKEN is not set in environment', 'not_configured')
  }

  const config = getGitHubModelsConfig()
  const model = options?.model || getGitHubModelsModel(options?.modelTier || 'fast')
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS
  const temperature = options?.temperature ?? 0.0
  const endpoint = config.org
    ? `${config.baseUrl}/orgs/${config.org}/inference/chat/completions`
    : `${config.baseUrl}/inference/chat/completions`

  const startTime = Date.now()

  let rawText: string
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': config.apiVersion,
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
      throw new GitHubModelsError(
        `GitHub Models rate limited. Retry after ${retryAfter || 'unknown'}s`,
        'rate_limited'
      )
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown')
      throw new GitHubModelsError(
        `GitHub Models API error ${response.status}: ${errorBody.slice(0, 200)}`,
        'unreachable'
      )
    }

    const data = await response.json()
    rawText = data.choices?.[0]?.message?.content || ''
  } catch (err) {
    if (err instanceof GitHubModelsError) throw err

    const errMsg = err instanceof Error ? err.message : String(err)
    if (errMsg.includes('aborted') || errMsg.includes('AbortError')) {
      const ghErr = new GitHubModelsError(
        `GitHub Models timed out after ${Math.round(timeoutMs / 1000)}s`,
        'timeout'
      )
      incrementAiMetric('ai.call.timeout')
      incrementAiMetric('ai.call.failure')
      log.ai.error('GitHub Models timed out', { context: { model, timeoutMs }, error: err })
      reportAppError(ghErr, { category: 'ai', action: 'parseWithGitHubModels' })
      throw ghErr
    }

    const ghErr = new GitHubModelsError(`GitHub Models unreachable: ${errMsg}`, 'unreachable')
    incrementAiMetric('ai.call.failure')
    log.ai.error('GitHub Models unreachable', { context: { model }, error: err })
    reportAppError(ghErr, { category: 'ai', action: 'parseWithGitHubModels' })
    throw ghErr
  }

  if (!rawText) {
    const ghErr = new GitHubModelsError(
      'GitHub Models returned an empty response',
      'empty_response'
    )
    incrementAiMetric('ai.call.failure')
    log.ai.error('Empty response from GitHub Models', { context: { model } })
    reportAppError(ghErr, { category: 'ai', action: 'parseWithGitHubModels' })
    throw ghErr
  }

  const jsonStr = extractJsonPayload(rawText)
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    const ghErr = new GitHubModelsError(
      `GitHub Models response was not valid JSON. Raw: ${rawText.slice(0, 200)}`,
      'invalid_json'
    )
    incrementAiMetric('ai.call.failure')
    log.ai.error('Invalid JSON from GitHub Models', {
      context: { model, rawSnippet: rawText.slice(0, 100) },
    })
    reportAppError(ghErr, { category: 'ai', action: 'parseWithGitHubModels' })
    throw ghErr
  }

  const zodResult = schema.safeParse(parsed)
  if (!zodResult.success) {
    const issues = formatZodIssues(zodResult.error)
    const ghErr = new GitHubModelsError(
      `GitHub Models response failed schema validation: ${issues}`,
      'validation_failed'
    )
    incrementAiMetric('ai.call.failure')
    log.ai.error('GitHub Models validation failed', { context: { model, issues } })
    reportAppError(ghErr, { category: 'ai', action: 'parseWithGitHubModels' })
    throw ghErr
  }

  const durationMs = Date.now() - startTime
  log.ai.info('GitHub Models parsed successfully', { context: { model }, durationMs })
  incrementAiMetric('ai.call.success')
  recordAiLatency(durationMs)
  return zodResult.data
}
