// AI Provider Configuration
// No 'use server' - safe to import from any context (client, server, edge)
// Single AI runtime: Ollama-compatible endpoints with local-first routing.

import { getAiRuntimePolicy, resolveOllamaModel } from './dispatch/routing-table'
import { resolveAiDispatch } from './dispatch/router'
import type { AiDispatchRequest, AiRuntimeMode, DispatchModelTier } from './dispatch/types'

export type AIProvider = 'ollama'
export type ModelTier = DispatchModelTier

export interface OllamaConfig {
  baseUrl: string
  model: string
  endpointName: 'local' | 'cloud'
  executionLocation: 'local' | 'cloud'
  mode: AiRuntimeMode
}

type OllamaConfigInput = Pick<
  AiDispatchRequest,
  | 'taskType'
  | 'systemPrompt'
  | 'userContent'
  | 'preferredLocation'
  | 'latencySensitive'
  | 'deviceCapability'
> & {
  modelTier?: ModelTier
}

/**
 * Returns true if at least one explicit Ollama-compatible endpoint is configured.
 */
export function isOllamaEnabled(): boolean {
  return getAiRuntimePolicy().endpoints.some((endpoint) => endpoint.enabled)
}

/**
 * Returns the resolved Ollama connection config after dispatch routing.
 * Falls back to the local default URL so legacy health checks still have a target.
 */
export function getOllamaConfig(input?: OllamaConfigInput): OllamaConfig {
  const decision = resolveAiDispatch({
    taskType: input?.taskType,
    systemPrompt: input?.systemPrompt,
    userContent: input?.userContent,
    modelTier: input?.modelTier ?? 'standard',
    preferredLocation: input?.preferredLocation,
    latencySensitive: input?.latencySensitive,
    deviceCapability: input?.deviceCapability,
  })

  if (decision.endpoint && decision.model) {
    return {
      baseUrl: decision.endpoint.baseUrl,
      model: decision.model,
      endpointName: decision.endpoint.name,
      executionLocation: decision.endpoint.location,
      mode: decision.runtimePolicy.mode,
    }
  }

  const policy = getAiRuntimePolicy()
  const fallbackLocation = policy.defaultLocation
  const fallbackEndpoint =
    policy.endpoints.find((endpoint) => endpoint.location === fallbackLocation) ??
    policy.endpoints[0]

  return {
    baseUrl: fallbackEndpoint.baseUrl,
    model: resolveOllamaModel(input?.modelTier ?? 'standard', fallbackLocation),
    endpointName: fallbackEndpoint.location,
    executionLocation: fallbackEndpoint.location,
    mode: policy.mode,
  }
}

/**
 * Returns the Ollama model name for the default routed endpoint.
 */
export function getOllamaModel(tier: ModelTier = 'standard'): string {
  return getOllamaConfig({ modelTier: tier }).model
}

/**
 * Returns the model for a given endpoint and tier combo.
 * Endpoint parameter is kept for API compatibility with queue and Remy routes.
 */
export function getModelForEndpoint(_endpoint: 'pc', tier: ModelTier = 'standard'): string {
  return getOllamaModel(tier)
}
