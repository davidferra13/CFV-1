// AiRuntimeError (OllamaOfflineError) - shared error type for AI runtime operations
// No 'use server' - safe to import from any context (server actions, API routes, tests)
// This lives in its own file because 'use server' modules can only export async functions.

export type OllamaErrorCode =
  | 'not_configured' // OLLAMA_BASE_URL not set
  | 'unreachable' // Connection refused / network error
  | 'timeout' // Request timed out
  | 'model_missing' // Model not found on the Ollama server
  | 'empty_response' // Ollama returned no content
  | 'invalid_json' // Response was not parseable JSON
  | 'validation_failed' // Zod validation failed after repair attempt
  | 'unknown' // Catch-all

const OLLAMA_OFFLINE_MESSAGE =
  'AI processing is temporarily unavailable. Please try again in a few moments.'

/**
 * Thrown when an AI operation cannot be completed because the runtime
 * endpoint is not configured or not reachable.
 * Never caught silently - always surfaced to the UI.
 */
export class OllamaOfflineError extends Error {
  readonly code: OllamaErrorCode

  constructor(reason?: string, code?: OllamaErrorCode) {
    super(reason ? `${OLLAMA_OFFLINE_MESSAGE} (${reason})` : OLLAMA_OFFLINE_MESSAGE)
    this.name = 'OllamaOfflineError'
    this.code = code ?? inferErrorCode(reason)
  }
}

/** Infer error code from the reason string if not explicitly provided. */
function inferErrorCode(reason?: string): OllamaErrorCode {
  if (!reason) return 'unknown'
  const lower = reason.toLowerCase()
  if (lower.includes('not set') || lower.includes('not configured')) return 'not_configured'
  if (
    lower.includes('unreachable') ||
    lower.includes('econnrefused') ||
    lower.includes('connection')
  )
    return 'unreachable'
  if (lower.includes('timeout') || lower.includes('aborted')) return 'timeout'
  if (lower.includes('model') && lower.includes('not found')) return 'model_missing'
  if (lower.includes('empty response')) return 'empty_response'
  if (lower.includes('not valid json') || lower.includes('json')) return 'invalid_json'
  if (lower.includes('validation') || lower.includes('schema')) return 'validation_failed'
  return 'unknown'
}

/** User-friendly help text for each error code. */
export function getOllamaErrorHelp(code: OllamaErrorCode): string {
  switch (code) {
    case 'not_configured':
      return 'AI runtime is not configured. Set OLLAMA_BASE_URL to enable AI features.'
    case 'unreachable':
      return 'AI runtime is not responding. Please try again in a moment.'
    case 'timeout':
      return 'AI request timed out. Please try again.'
    case 'model_missing':
      return 'The configured AI model is not available on the runtime endpoint.'
    case 'empty_response':
      return 'AI returned an empty response. Please try again.'
    case 'invalid_json':
      return 'AI returned an unexpected format. This may be a transient issue.'
    case 'validation_failed':
      return 'AI output did not match the expected format after a repair attempt.'
    case 'unknown':
      return 'An unexpected error occurred with AI processing.'
  }
}
