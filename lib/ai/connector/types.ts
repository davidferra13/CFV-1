// lib/ai/connector/types.ts
// Types for the Local AI Connector (BYOA - Bring Your Own Ollama) system.
// The connector is a small local app users run on their own machine.
// It authenticates outbound to ChefFlow, polls for AI jobs, sends them to
// local Ollama (http://localhost:11434 by default), and returns results.

export interface LocalAiConnector {
  id: string
  userId: string
  deviceName: string
  keyPrefix: string
  defaultModel: string
  ollamaBaseUrl: string
  lastSeenAt: string | null
  revokedAt: string | null
  status: 'active' | 'revoked'
  createdAt: string
  updatedAt: string
}

/** What the connector sends in a heartbeat (POST /api/connector/v1/heartbeat) */
export interface ConnectorHeartbeat {
  version: string
  ollamaReachable: boolean
  availableModels?: string[]
}

/** A job returned from the poll endpoint */
export interface ConnectorJob {
  taskId: string
  taskType: string
  modelTier: string
  model: string
  prompt: string
  systemPrompt?: string
  responseSchema?: unknown
  timeoutMs: number
}

/** What the connector sends to the result endpoint */
export interface ConnectorResult {
  taskId: string
  success: boolean
  result?: unknown
  error?: string
  durationMs: number
  model: string
}

/** Context returned from connector key validation */
export interface ConnectorContext {
  connectorId: string
  userId: string
  defaultModel: string
  ollamaBaseUrl: string
  ollamaAuthToken: string | null
}

export const CONNECTOR_POLL_TIMEOUT_MS = 30_000
export const CONNECTOR_KEY_PREFIX = 'cf_connector_'
