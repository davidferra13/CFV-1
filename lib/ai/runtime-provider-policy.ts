// Runtime Provider Policy - Single source of truth for AI runtime mode.
// No 'use server' - safe to import from any context (client, server, edge)
//
// Cloud-first in production. Local dev override only via explicit env config.
// Production has NO silent fallback to local hardware.

export type RuntimeMode = 'cloud' | 'local-dev'
export type PrimaryProvider = 'ollama-compatible-cloud' | 'gemini'

export interface RuntimeProviderPolicy {
  mode: RuntimeMode
  primaryProvider: PrimaryProvider
  allowLocalDevOverride: boolean
  isProductionCloudRequired: boolean
  /** The resolved base URL for Ollama-compatible requests. */
  ollamaBaseUrl: string
}

/**
 * Returns the active runtime provider policy.
 *
 * Cloud mode: OLLAMA_BASE_URL is set and points to a non-localhost host.
 * Local-dev mode: OLLAMA_BASE_URL is not set, or explicitly points to localhost.
 *
 * Production deployments must set OLLAMA_BASE_URL to a remote cloud endpoint.
 * Leaving it unset or pointing to localhost in production is a misconfiguration.
 */
export function getRuntimeProviderPolicy(): RuntimeProviderPolicy {
  const baseUrl = process.env.OLLAMA_BASE_URL || ''
  const isLocalhost =
    !baseUrl ||
    baseUrl.includes('localhost') ||
    baseUrl.includes('127.0.0.1') ||
    baseUrl.includes('0.0.0.0')

  const mode: RuntimeMode = isLocalhost ? 'local-dev' : 'cloud'

  return {
    mode,
    primaryProvider: 'ollama-compatible-cloud',
    allowLocalDevOverride: mode === 'local-dev',
    isProductionCloudRequired: mode === 'cloud',
    ollamaBaseUrl: baseUrl || 'http://localhost:11434',
  }
}

/**
 * Returns true when the runtime is pointing at a remote cloud endpoint.
 * Use this to gate cloud-only behaviors or produce accurate status messaging.
 */
export function isCloudRuntime(): boolean {
  return getRuntimeProviderPolicy().mode === 'cloud'
}

/**
 * Provider-agnostic error message for AI unavailability.
 * Never tells the user to start a local daemon.
 */
export function getAiUnavailableMessage(): string {
  return 'AI features are temporarily unavailable. Please try again in a few moments.'
}
