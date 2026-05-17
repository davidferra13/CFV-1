// AI Provider abstraction types.
// Defines the interface contract for any AI provider (Ollama, future Chrome AI, mobile models).
// No 'use server' or 'use client' - pure types, importable anywhere.

/**
 * Configuration for an AI provider instance.
 */
export interface AIProviderConfig {
  /** Unique provider name (e.g. 'ollama', 'chrome-ai') */
  name: string
  /** Base URL for the provider API */
  baseUrl: string
  /** Default model to use when none specified */
  defaultModel: string
  /** Request timeout in milliseconds */
  timeoutMs: number
  /** Max retry attempts on transient failures */
  maxRetries: number
  /** Whether this provider is currently enabled */
  enabled: boolean
}

/**
 * Structured response from an AI provider.
 */
export interface AIResponse {
  /** Generated text content */
  text: string
  /** Provider that generated this response */
  provider: string
  /** Model used for generation */
  model: string
  /** Prompt tokens consumed (estimated if not reported) */
  promptTokens: number
  /** Completion tokens generated */
  completionTokens: number
  /** Total latency in milliseconds */
  latencyMs: number
  /** Whether the response was truncated by max tokens */
  truncated: boolean
}

/**
 * A single chunk from a streaming AI response.
 */
export interface AIStreamChunk {
  /** Token text in this chunk */
  token: string
  /** Whether this is the final chunk */
  done: boolean
  /** Cumulative tokens generated so far */
  tokensSoFar: number
}

/**
 * Information about an available model.
 */
export interface ModelInfo {
  /** Model identifier (e.g. 'gemma4:e4b') */
  name: string
  /** Human-readable display name */
  displayName: string
  /** Model size in bytes (if known) */
  sizeBytes: number | null
  /** Parameter count description (e.g. '4B', '27B') */
  parameterSize: string | null
  /** Quantization level (e.g. 'Q4_K_M') */
  quantization: string | null
  /** When the model was last modified/pulled */
  modifiedAt: string | null
}

/**
 * Health status of an AI provider.
 */
export interface ProviderHealth {
  /** Provider name */
  provider: string
  /** Whether the provider is reachable and responding */
  healthy: boolean
  /** Response time of health check in ms */
  latencyMs: number
  /** Error message if unhealthy */
  error: string | null
  /** Timestamp of this health check */
  checkedAt: string
  /** Number of available models (if applicable) */
  modelCount: number | null
}

/**
 * Record of a single AI usage event for tracking and analytics.
 */
export interface UsageRecord {
  id: string
  tenantId: string
  provider: string
  model: string
  promptTokens: number
  completionTokens: number
  latencyMs: number
  createdAt: string
}

/**
 * Summary of AI usage over a date range.
 */
export interface UsageSummary {
  totalRequests: number
  totalPromptTokens: number
  totalCompletionTokens: number
  avgLatencyMs: number
  byProvider: Array<{
    provider: string
    requests: number
    promptTokens: number
    completionTokens: number
  }>
  byModel: Array<{
    model: string
    requests: number
    promptTokens: number
    completionTokens: number
  }>
}

/**
 * Core interface that all AI providers must implement.
 * Provides a unified API for text generation, streaming, model discovery, and health checking.
 */
export interface AIProvider {
  /** Provider configuration */
  readonly config: AIProviderConfig

  /**
   * Generate a complete text response (non-streaming).
   */
  generate(
    systemPrompt: string,
    userMessage: string,
    options?: {
      model?: string
      maxTokens?: number
      temperature?: number
      timeoutMs?: number
    }
  ): Promise<AIResponse>

  /**
   * Stream a response token by token via async generator.
   */
  stream(
    systemPrompt: string,
    userMessage: string,
    options?: {
      model?: string
      maxTokens?: number
      temperature?: number
      timeoutMs?: number
    }
  ): AsyncGenerator<AIStreamChunk, void, unknown>

  /**
   * List all models available on this provider.
   */
  listModels(): Promise<ModelInfo[]>

  /**
   * Check the health/reachability of this provider.
   */
  checkHealth(): Promise<ProviderHealth>

  /**
   * Get detailed info about a specific model.
   * Returns null if the model is not found.
   */
  getModelInfo(modelName: string): Promise<ModelInfo | null>
}
