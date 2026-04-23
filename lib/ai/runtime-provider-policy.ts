// Runtime Provider Policy - single source of truth for AI runtime mode.
// No 'use server' - safe to import from any context (client, server, edge)

import { getAiRuntimePolicy } from './dispatch/routing-table'
import type { AiRuntimeMode } from './dispatch/types'

export type RuntimeMode = AiRuntimeMode
export type PrimaryProvider = 'ollama'

export interface RuntimeEndpointSummary {
  name: 'local' | 'cloud'
  baseUrl: string
  enabled: boolean
}

export interface RuntimeProviderPolicy {
  mode: RuntimeMode
  primaryProvider: PrimaryProvider
  endpoints: RuntimeEndpointSummary[]
  allowLocalDevOverride: boolean
  isProductionCloudRequired: boolean
  ollamaBaseUrl: string
  onDevicePreferred: boolean
  cloudFallbackAllowed: boolean
  retainDataLocally: boolean
}

export function getRuntimeProviderPolicy(): RuntimeProviderPolicy {
  const policy = getAiRuntimePolicy()
  const primaryEndpoint =
    policy.endpoints.find((endpoint) => endpoint.location === policy.defaultLocation) ??
    policy.endpoints[0]

  return {
    mode: policy.mode,
    primaryProvider: 'ollama',
    endpoints: policy.endpoints.map((endpoint) => ({
      name: endpoint.name,
      baseUrl: endpoint.baseUrl,
      enabled: endpoint.enabled,
    })),
    allowLocalDevOverride: policy.endpoints.some(
      (endpoint) => endpoint.location === 'local' && endpoint.enabled
    ),
    isProductionCloudRequired: policy.mode === 'cloud',
    ollamaBaseUrl: primaryEndpoint?.baseUrl ?? 'http://localhost:11434',
    onDevicePreferred: policy.onDevicePreferred,
    cloudFallbackAllowed: policy.cloudFallbackAllowed,
    retainDataLocally: policy.retainDataLocally,
  }
}

export function isCloudRuntime(): boolean {
  return getRuntimeProviderPolicy().mode === 'cloud'
}

export function getAiUnavailableMessage(): string {
  return 'AI features are temporarily unavailable. Please try again in a few moments.'
}
