// OllamaOfflineError — shared error type for privacy-sensitive AI operations
// No 'use server' — safe to import from any context (server actions, API routes, tests)
// This lives in its own file because 'use server' modules can only export async functions.

const OLLAMA_OFFLINE_MESSAGE =
  'This feature is temporarily unavailable. Please try again in a moment.'

/**
 * Thrown when a privacy-sensitive operation cannot be completed because
 * Ollama is not configured or not reachable. Never caught silently — always
 * surfaced to the UI so the user knows data was not sent externally.
 */
export class OllamaOfflineError extends Error {
  constructor(reason?: string) {
    super(reason ? `${OLLAMA_OFFLINE_MESSAGE} (${reason})` : OLLAMA_OFFLINE_MESSAGE)
    this.name = 'OllamaOfflineError'
  }
}
