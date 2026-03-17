// AI Provider Configuration
// No 'use server' — safe to import from any context (client, server, edge)
// Routing decisions and config for the privacy-first hybrid LLM system

export type AIProvider = 'gemini' | 'ollama'

/** Model tier for task-complexity routing. */
export type ModelTier = 'fast' | 'standard' | 'complex'

/**
 * Returns true if a local Ollama endpoint is configured.
 * Set OLLAMA_BASE_URL in .env.local to enable (e.g. http://localhost:11434).
 */
export function isOllamaEnabled(): boolean {
  return !!process.env.OLLAMA_BASE_URL
}

/**
 * Returns the primary Ollama connection config (PC).
 * Defaults to localhost:11434 / qwen3-coder:30b if env vars not set.
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
 *   OLLAMA_MODEL_FAST    — small, fast model for classification tasks (~4B, fits in 6GB VRAM)
 *   OLLAMA_MODEL         — default model for structured extraction (~30B MoE)
 *   OLLAMA_MODEL_COMPLEX — large model for conversational/creative tasks (defaults to qwen3:30b)
 *
 * Architecture rationale (RTX 3050, 6GB VRAM, 128GB RAM):
 *   fast    → qwen3:4b     — fits entirely in VRAM, 40-60 tok/s, for classification/intent parsing
 *   standard → qwen3-coder:30b — MoE (3.3B active), GPU+RAM split, 12-15 tok/s, structured JSON
 *   complex → qwen3:30b    — MoE (3.3B active), same speed, trained for prose/conversation
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
 * Only PC exists now (Pi is permanently retired).
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
