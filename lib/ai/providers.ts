// AI Provider Configuration
// No 'use server' - safe to import from any context (client, server, edge)
// Single AI runtime: Ollama-compatible endpoint running Gemma 4.
// OLLAMA_BASE_URL points to cloud endpoint in production, localhost in dev.

export type AIProvider = 'ollama'

/**
 * Model tier for task-complexity routing.
 * Kept for API compatibility. All tiers resolve to the same Gemma 4 model.
 * Override with OLLAMA_MODEL env var if a different model is needed.
 */
export type ModelTier = 'fast' | 'standard' | 'complex'

/**
 * Returns true if an Ollama-compatible endpoint is configured.
 */
export function isOllamaEnabled(): boolean {
  return !!process.env.OLLAMA_BASE_URL
}

/**
 * Returns the Ollama connection config: base URL + model name.
 */
export function getOllamaConfig(): { baseUrl: string; model: string } {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'gemma4',
  }
}

/**
 * Returns the Ollama model name. Tier parameter kept for API compatibility
 * but all tiers resolve to the same model (Gemma 4 is fast enough for everything).
 */
export function getOllamaModel(_tier: ModelTier = 'standard'): string {
  return process.env.OLLAMA_MODEL || 'gemma4'
}

/**
 * Returns the model for a given endpoint/tier combo.
 * Kept for API compatibility with Remy streaming route.
 */
export function getModelForEndpoint(_endpoint: 'pc', _tier: ModelTier = 'standard'): string {
  return process.env.OLLAMA_MODEL || 'gemma4'
}
