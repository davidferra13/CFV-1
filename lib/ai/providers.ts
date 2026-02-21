// AI Provider Configuration
// No 'use server' — safe to import from any context (client, server, edge)
// Routing decisions and config for the privacy-first hybrid LLM system

export type AIProvider = 'gemini' | 'ollama'

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
