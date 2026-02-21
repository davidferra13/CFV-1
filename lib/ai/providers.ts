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
 * Returns the Ollama connection config.
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
 *   OLLAMA_MODEL_FAST    — small, fast model for classification tasks (~7B)
 *   OLLAMA_MODEL         — default model for structured extraction (~30B)
 *   OLLAMA_MODEL_COMPLEX — large model for multi-step reasoning (defaults to OLLAMA_MODEL)
 */
export function getOllamaModel(tier: ModelTier = 'standard'): string {
  const defaultModel = process.env.OLLAMA_MODEL || 'qwen3-coder:30b'
  switch (tier) {
    case 'fast':
      return process.env.OLLAMA_MODEL_FAST || 'qwen3:8b'
    case 'standard':
      return defaultModel
    case 'complex':
      return process.env.OLLAMA_MODEL_COMPLEX || defaultModel
  }
}
