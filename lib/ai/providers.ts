// AI Provider Configuration
// No 'use server' - safe to import from any context (client, server, edge)
// Cloud-first runtime. OLLAMA_BASE_URL must point to a remote cloud endpoint in production.
// Local Ollama is only used when OLLAMA_BASE_URL is unset or explicitly localhost (dev/debug only).

export type AIProvider = 'gemini' | 'ollama'

/** Model tier for task-complexity routing. */
export type ModelTier = 'fast' | 'standard' | 'complex'

/**
 * Returns true if an Ollama-compatible endpoint is configured.
 * In production this will be a remote cloud URL set via OLLAMA_BASE_URL.
 * In local dev it defaults to localhost:11434 when OLLAMA_BASE_URL is not set.
 */
export function isOllamaEnabled(): boolean {
  return !!process.env.OLLAMA_BASE_URL
}

/**
 * Returns the primary Ollama-compatible connection config.
 * Production: OLLAMA_BASE_URL must point to the cloud runtime endpoint.
 * Dev: falls back to localhost:11434 only when OLLAMA_BASE_URL is unset.
 */
export function getOllamaConfig(): { baseUrl: string; model: string } {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'qwen3-coder:30b',
  }
}

/**
 * Returns the Ollama model for a given task-complexity tier.
 *
 * Env vars:
 *   OLLAMA_MODEL_FAST    - small, fast model for classification tasks
 *   OLLAMA_MODEL         - default model for structured extraction
 *   OLLAMA_MODEL_COMPLEX - large model for conversational/creative tasks
 *
 * Default models (can be overridden via env vars for the cloud runtime):
 *   fast    → qwen3:4b
 *   standard → qwen3-coder:30b
 *   complex → qwen3:30b
 */
export function getOllamaModel(tier: ModelTier = 'standard'): string {
  const defaultModel = process.env.OLLAMA_MODEL || 'qwen3-coder:30b'
  switch (tier) {
    case 'fast':
      return process.env.OLLAMA_MODEL_FAST || 'qwen3:4b'
    case 'standard':
      return defaultModel
    case 'complex':
      return process.env.OLLAMA_MODEL_COMPLEX || 'qwen3:30b'
  }
}

/**
 * Returns the right model for a given tier.
 * Kept for API compatibility with callers that pass endpoint name.
 */
export function getModelForEndpoint(_endpoint: 'pc', tier: ModelTier = 'standard'): string {
  return getOllamaModel(tier)
}

// NOTE: computeDynamicContext(), getContextSizeForEndpoint(), and getOllamaContextSize()
// were removed as part of the num_ctx purge (2026-03-01). Setting num_ctx on ollama.chat()
// calls caused a 170s KV cache reallocation hang on the RTX 3050 with GPU+RAM split models.
// All Remy routes now omit num_ctx, letting Ollama use the model's native default.
// See docs/remy-num-ctx-fix.md for full details.
