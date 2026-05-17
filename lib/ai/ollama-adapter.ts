// Server-side Ollama adapter implementing the AIProvider interface.
// Wraps fetch calls to the Ollama HTTP API with timeouts, retries, and error handling.
// Distinct from lib/ai/browser/ollama-adapter.ts which is the client-side BrowserAiAdapter.

import type {
  AIProvider,
  AIProviderConfig,
  AIResponse,
  AIStreamChunk,
  ModelInfo,
  ProviderHealth,
} from './provider-types'

const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_RETRIES = 2
const HEALTH_CHECK_TIMEOUT_MS = 5_000

/**
 * Ollama adapter for server-side AI inference.
 * Connects to a local or remote Ollama instance via its HTTP API.
 */
export class OllamaAdapter implements AIProvider {
  readonly config: AIProviderConfig

  constructor(config?: Partial<AIProviderConfig>) {
    this.config = {
      name: config?.name ?? 'ollama',
      baseUrl: config?.baseUrl ?? process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
      defaultModel: config?.defaultModel ?? 'gemma4:e4b',
      timeoutMs: config?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxRetries: config?.maxRetries ?? DEFAULT_MAX_RETRIES,
      enabled: config?.enabled ?? true,
    }
  }

  private apiUrl(endpoint: string): string {
    const base = this.config.baseUrl.replace(/\/+$/, '')
    // If baseUrl already ends with /api or /v1, append directly
    if (/\/api$/i.test(base) || /\/v1$/i.test(base)) {
      return `${base}/${endpoint.replace(/^\/+/, '')}`
    }
    return `${base}/api/${endpoint.replace(/^\/+/, '')}`
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs?: number
  ): Promise<Response> {
    const ms = timeoutMs ?? this.config.timeoutMs
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ms)

    // Merge signals if caller provided one
    const existingSignal = init.signal
    if (existingSignal) {
      existingSignal.addEventListener('abort', () => controller.abort())
    }

    try {
      const res = await fetch(url, { ...init, signal: controller.signal })
      return res
    } finally {
      clearTimeout(timer)
    }
  }

  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    timeoutMs?: number
  ): Promise<Response> {
    let lastError: Error | null = null
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const res = await this.fetchWithTimeout(url, init, timeoutMs)
        if (res.ok || res.status < 500) return res
        lastError = new Error(`Ollama returned ${res.status}`)
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        if (lastError.name === 'AbortError') {
          throw new Error(`Ollama request timed out after ${timeoutMs ?? this.config.timeoutMs}ms`)
        }
      }
      // Wait briefly before retry (exponential backoff, capped at 2s)
      if (attempt < this.config.maxRetries) {
        await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 2000)))
      }
    }
    throw lastError ?? new Error('Ollama request failed after retries')
  }

  async generate(
    systemPrompt: string,
    userMessage: string,
    options?: {
      model?: string
      maxTokens?: number
      temperature?: number
      timeoutMs?: number
    }
  ): Promise<AIResponse> {
    const model = options?.model ?? this.config.defaultModel
    const start = Date.now()

    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      stream: false,
      options: {} as Record<string, unknown>,
    }
    if (options?.maxTokens) {
      ;(body.options as Record<string, unknown>).num_predict = options.maxTokens
    }
    if (options?.temperature !== undefined) {
      ;(body.options as Record<string, unknown>).temperature = options.temperature
    }

    const res = await this.fetchWithRetry(
      this.apiUrl('chat'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      options?.timeoutMs
    )

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Ollama generate failed (${res.status}): ${errText.slice(0, 300)}`)
    }

    const data = await res.json()
    const text: string = data.message?.content ?? ''
    const latencyMs = Date.now() - start

    // Ollama reports eval_count (completion tokens) and prompt_eval_count (prompt tokens)
    const promptTokens: number = data.prompt_eval_count ?? 0
    const completionTokens: number = data.eval_count ?? 0

    return {
      text,
      provider: this.config.name,
      model,
      promptTokens,
      completionTokens,
      latencyMs,
      truncated: false,
    }
  }

  async *stream(
    systemPrompt: string,
    userMessage: string,
    options?: {
      model?: string
      maxTokens?: number
      temperature?: number
      timeoutMs?: number
    }
  ): AsyncGenerator<AIStreamChunk, void, unknown> {
    const model = options?.model ?? this.config.defaultModel

    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      stream: true,
      options: {} as Record<string, unknown>,
    }
    if (options?.maxTokens) {
      ;(body.options as Record<string, unknown>).num_predict = options.maxTokens
    }
    if (options?.temperature !== undefined) {
      ;(body.options as Record<string, unknown>).temperature = options.temperature
    }

    const res = await this.fetchWithRetry(
      this.apiUrl('chat'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      options?.timeoutMs
    )

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Ollama stream failed (${res.status}): ${errText.slice(0, 300)}`)
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let tokensSoFar = 0

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const json = JSON.parse(line)
            const content: string | undefined = json.message?.content
            if (content) {
              tokensSoFar++
              yield { token: content, done: false, tokensSoFar }
            }
            if (json.done) {
              yield { token: '', done: true, tokensSoFar }
            }
          } catch {
            // Partial JSON line, skip
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    const res = await this.fetchWithTimeout(
      this.apiUrl('tags'),
      { method: 'GET' },
      HEALTH_CHECK_TIMEOUT_MS
    )

    if (!res.ok) {
      throw new Error(`Failed to list models: ${res.status}`)
    }

    const data = await res.json()
    const models: unknown[] = data?.models ?? []

    return models.map((m: any) => ({
      name: m.name ?? 'unknown',
      displayName: m.name ?? 'unknown',
      sizeBytes: m.size ?? null,
      parameterSize: m.details?.parameter_size ?? null,
      quantization: m.details?.quantization_level ?? null,
      modifiedAt: m.modified_at ?? null,
    }))
  }

  async checkHealth(): Promise<ProviderHealth> {
    const start = Date.now()
    try {
      const res = await this.fetchWithTimeout(
        this.apiUrl('tags'),
        { method: 'GET' },
        HEALTH_CHECK_TIMEOUT_MS
      )

      const latencyMs = Date.now() - start

      if (!res.ok) {
        return {
          provider: this.config.name,
          healthy: false,
          latencyMs,
          error: `HTTP ${res.status}`,
          checkedAt: new Date().toISOString(),
          modelCount: null,
        }
      }

      const data = await res.json()
      const modelCount = (data?.models ?? []).length

      return {
        provider: this.config.name,
        healthy: true,
        latencyMs,
        error: null,
        checkedAt: new Date().toISOString(),
        modelCount,
      }
    } catch (err) {
      return {
        provider: this.config.name,
        healthy: false,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
        checkedAt: new Date().toISOString(),
        modelCount: null,
      }
    }
  }

  async getModelInfo(modelName: string): Promise<ModelInfo | null> {
    try {
      const res = await this.fetchWithTimeout(
        this.apiUrl('show'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: modelName }),
        },
        HEALTH_CHECK_TIMEOUT_MS
      )

      if (!res.ok) return null

      const data = await res.json()
      return {
        name: modelName,
        displayName: modelName,
        sizeBytes: data.size ?? null,
        parameterSize: data.details?.parameter_size ?? null,
        quantization: data.details?.quantization_level ?? null,
        modifiedAt: data.modified_at ?? null,
      }
    } catch {
      return null
    }
  }
}
