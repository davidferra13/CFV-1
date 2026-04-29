import { logPublicCloudAiEvent } from './public-cloud-audit'
import {
  PUBLIC_CLOUD_UNAVAILABLE_MESSAGE,
  assertPublicCloudAiAllowed,
  isPublicCloudAiEnabled,
  type PublicCloudPolicyInput,
  type PublicCloudSurface,
  type PublicCloudTaskId,
} from './public-cloud-policy'

export class PublicCloudGatewayError extends Error {
  public readonly publicMessage: string

  constructor(message: string, publicMessage = PUBLIC_CLOUD_UNAVAILABLE_MESSAGE) {
    super(message)
    this.name = 'PublicCloudGatewayError'
    this.publicMessage = publicMessage
  }
}

export interface PublicCloudGatewayRequest extends PublicCloudPolicyInput {
  taskId: PublicCloudTaskId
  surface: PublicCloudSurface
  systemPrompt: string
  userPrompt: string
  maxTokens?: number
}

interface PublicCloudProviderConfig {
  provider: 'groq'
  apiKey: string
  baseUrl: string
  model: string
  timeoutMs: number
}

const DEFAULT_GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_GROQ_MODEL = 'llama-3.1-8b-instant'
const DEFAULT_TIMEOUT_MS = 8000

export function isPublicCloudAiConfigured(): boolean {
  return isPublicCloudAiEnabled() && Boolean(process.env.GROQ_API_KEY)
}

function getProviderConfig(): PublicCloudProviderConfig {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new PublicCloudGatewayError('GROQ_API_KEY is not configured')
  }

  return {
    provider: 'groq',
    apiKey,
    baseUrl: process.env.GROQ_BASE_URL || DEFAULT_GROQ_BASE_URL,
    model: process.env.GROQ_PUBLIC_MODEL || DEFAULT_GROQ_MODEL,
    timeoutMs: Number(process.env.PUBLIC_AI_GATEWAY_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
  }
}

function parseGroqStreamChunk(rawChunk: string): string[] {
  const tokens: string[] = []
  const lines = rawChunk.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) continue

    const payload = trimmed.slice('data:'.length).trim()
    if (!payload || payload === '[DONE]') continue

    try {
      const parsed = JSON.parse(payload)
      const token = parsed?.choices?.[0]?.delta?.content
      if (typeof token === 'string' && token.length > 0) {
        tokens.push(token)
      }
    } catch {
      continue
    }
  }

  return tokens
}

export async function* streamPublicCloudAi(
  request: PublicCloudGatewayRequest
): AsyncGenerator<string> {
  const policy = assertPublicCloudAiAllowed(request)
  if (!policy.allowed) {
    logPublicCloudAiEvent({
      type: 'policy_block',
      taskId: request.taskId,
      surface: request.surface,
      reason: policy.reason,
      signal: policy.signal,
    })
    throw new PublicCloudGatewayError(
      `Public cloud AI blocked: ${policy.reason}`,
      policy.publicMessage
    )
  }

  const config = getProviderConfig()
  const startedAt = Date.now()
  let firstTokenMs: number | null = null
  let outputTokenEvents = 0
  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), config.timeoutMs)

  logPublicCloudAiEvent({
    type: 'provider_start',
    taskId: policy.taskId,
    surface: policy.surface,
    provider: config.provider,
    model: config.model,
  })

  try {
    const response = await fetch(config.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt },
        ],
        stream: true,
        temperature: 0.4,
        max_tokens: request.maxTokens ?? 220,
      }),
      signal: abortController.signal,
    })

    if (!response.ok || !response.body) {
      throw new PublicCloudGatewayError(`Public cloud provider returned ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const chunks = buffer.split('\n\n')
      buffer = chunks.pop() ?? ''

      for (const chunk of chunks) {
        for (const token of parseGroqStreamChunk(chunk)) {
          if (firstTokenMs === null) firstTokenMs = Date.now() - startedAt
          outputTokenEvents++
          yield token
        }
      }
    }

    if (buffer) {
      for (const token of parseGroqStreamChunk(buffer)) {
        if (firstTokenMs === null) firstTokenMs = Date.now() - startedAt
        outputTokenEvents++
        yield token
      }
    }

    logPublicCloudAiEvent({
      type: 'provider_done',
      taskId: policy.taskId,
      surface: policy.surface,
      provider: config.provider,
      model: config.model,
      durationMs: Date.now() - startedAt,
      firstTokenMs,
      outputTokenEvents,
    })
  } catch (err) {
    logPublicCloudAiEvent({
      type: 'provider_error',
      taskId: request.taskId,
      surface: request.surface,
      provider: config.provider,
      model: config.model,
      durationMs: Date.now() - startedAt,
      errorName: err instanceof Error ? err.name : 'UnknownError',
    })

    if (err instanceof PublicCloudGatewayError) throw err
    throw new PublicCloudGatewayError(err instanceof Error ? err.message : String(err))
  } finally {
    clearTimeout(timeout)
  }
}
