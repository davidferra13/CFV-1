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
 * Returns the Pi Ollama endpoint URL (if configured).
 * Set OLLAMA_PI_URL in .env.local when the Raspberry Pi is online.
 * Returns null if no Pi endpoint is configured.
 */
export function getOllamaPiUrl(): string | null {
  return process.env.OLLAMA_PI_URL || null
}

/**
 * Returns true if a secondary (Pi) Ollama endpoint is configured.
 */
export function isPiEndpointConfigured(): boolean {
  return !!process.env.OLLAMA_PI_URL
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

/** Remy layer identifier for context window sizing. */
export type RemyLayer = 'chef' | 'client' | 'public'

/**
 * Returns the Ollama context window size (num_ctx) for a given Remy layer.
 * Larger windows let the model see more conversation history + system prompt,
 * but use more VRAM. These defaults are safe for a 30B model with ~16-24 GB VRAM.
 *
 * Env vars (override defaults):
 *   OLLAMA_NUM_CTX_CHEF    — chef Remy (default 12288)
 *   OLLAMA_NUM_CTX_CLIENT  — client Remy (default 8192)
 *   OLLAMA_NUM_CTX_PUBLIC  — public Remy (default 4096)
 *
 * Safe limits by model size:
 *   8B model  → up to 8192 comfortably, 16384 max
 *   14B model → up to 12288 comfortably
 *   30B model → up to 12288 comfortably, 16384 if VRAM allows
 */
export function getOllamaContextSize(layer: RemyLayer): number {
  switch (layer) {
    case 'chef': {
      const env = process.env.OLLAMA_NUM_CTX_CHEF
      return env ? parseInt(env, 10) : 12288
    }
    case 'client': {
      const env = process.env.OLLAMA_NUM_CTX_CLIENT
      return env ? parseInt(env, 10) : 8192
    }
    case 'public': {
      const env = process.env.OLLAMA_NUM_CTX_PUBLIC
      return env ? parseInt(env, 10) : 4096
    }
  }
}
