export type DispatchModelTier = 'fast' | 'standard' | 'complex'

export type AiTaskClass =
  | 'deterministic'
  | 'read'
  | 'write'
  | 'parse'
  | 'generation'
  | 'automation'
  | 'orchestration'

export type AiPrivacyLevel = 'public' | 'internal' | 'restricted'
export type AiRuntimeMode = 'local' | 'cloud' | 'hybrid'
export type AiExecutionLocation = 'local' | 'cloud'
export type AiDispatchProvider = 'deterministic' | 'ollama'
export type AiActionDisposition = 'execute' | 'queue_for_approval' | 'request_input' | 'block'
export type AiActionSafety = 'reversible' | 'significant' | 'restricted'

export interface AiConfidenceThresholds {
  high: number
  medium: number
}

export interface AiDispatchRequest {
  taskType?: string
  systemPrompt?: string
  userContent?: string
  metadata?: unknown
  source?: string
  surface?: string
  modelTier?: DispatchModelTier
  preferredLocation?: AiExecutionLocation
  latencySensitive?: boolean
  deviceCapability?: 'low' | 'balanced' | 'high'
  confidence?: number | null
  canAutoExecute?: boolean
  canQueueForApproval?: boolean
  requiresApproval?: boolean
  safety?: AiActionSafety
  allowCloudFallback?: boolean
}

export interface AiPrivacyScan {
  level: AiPrivacyLevel
  containsSensitiveData: boolean
  reasons: string[]
  matchedSignals: string[]
}

export interface AiTaskClassification {
  taskClass: AiTaskClass
  requiresLlm: boolean
  mutatesState: boolean
  needsApproval: boolean
  reasons: string[]
}

export interface AiRuntimeEndpoint {
  name: 'local' | 'cloud'
  location: AiExecutionLocation
  baseUrl: string
  model: string
  enabled: boolean
  priority: number
}

export interface AiRuntimePolicy {
  mode: AiRuntimeMode
  endpoints: AiRuntimeEndpoint[]
  defaultLocation: AiExecutionLocation
  onDevicePreferred: boolean
  cloudFallbackAllowed: boolean
  retainDataLocally: boolean
}

export interface AiActionDecision {
  disposition: AiActionDisposition
  confidence: number
  thresholds: AiConfidenceThresholds
  requiresApproval: boolean
  canAutoExecute: boolean
  canQueueForApproval: boolean
  reasoning: string
}

export interface AiDispatchDecision {
  provider: AiDispatchProvider
  privacy: AiPrivacyScan
  classification: AiTaskClassification
  runtimePolicy: AiRuntimePolicy
  endpoint: AiRuntimeEndpoint | null
  executionLocation: AiExecutionLocation | null
  model: string | null
  reasons: string[]
  confidenceDecision: AiActionDecision | null
}
