import type { ModelTier } from './providers'
import type { AiDispatchRequest } from './dispatch/types'

export interface ParseOllamaOptions {
  /** Task-complexity tier for model routing. Default: 'standard'. */
  modelTier?: ModelTier
  /** Enable in-memory response cache. Default: false. */
  cache?: boolean
  /** Hard timeout in ms for the entire Ollama call. Default: 30000 (30s). */
  timeoutMs?: number
  /** Max tokens Ollama can generate. Default: 512 (JSON responses are short). */
  maxTokens?: number
  /** Override the Ollama endpoint URL. If not set, uses OLLAMA_BASE_URL. */
  endpointUrl?: string
  /** Override the model name. If not set, uses tier-based resolution. */
  model?: string
  /** Base64-encoded images for vision tasks. Gemma 4 has native multimodal support. */
  images?: string[]
  /** Sampling temperature. Lower is more deterministic. Default: Ollama model default. */
  temperature?: number
  /** Optional routing hints for the shared AI dispatch layer. */
  dispatchHint?: Omit<AiDispatchRequest, 'systemPrompt' | 'userContent' | 'modelTier'>
}
