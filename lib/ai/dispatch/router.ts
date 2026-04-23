import { classifyAiTask } from './classifier'
import { scanAiPrivacyRisk } from './privacy-gate'
import { getAiRuntimePolicy, resolveOllamaModel } from './routing-table'
import type {
  AiActionDecision,
  AiActionSafety,
  AiDispatchDecision,
  AiDispatchRequest,
  AiExecutionLocation,
  AiRuntimeEndpoint,
} from './types'

const DEFAULT_THRESHOLDS = {
  high: 0.85,
  medium: 0.6,
} as const

function clampConfidence(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return Math.min(1, Math.max(0, value))
}

function selectRuntimeEndpoint(
  input: AiDispatchRequest,
  endpoints: AiRuntimeEndpoint[],
  privacyLevel: 'public' | 'internal' | 'restricted'
): { endpoint: AiRuntimeEndpoint | null; reasons: string[] } {
  const enabled = endpoints.filter((endpoint) => endpoint.enabled)
  const reasons: string[] = []

  if (enabled.length === 0) {
    reasons.push('No configured runtime endpoint is enabled.')
    return { endpoint: null, reasons }
  }

  const local = enabled.find((endpoint) => endpoint.location === 'local') ?? null
  const cloud = enabled.find((endpoint) => endpoint.location === 'cloud') ?? null

  if (privacyLevel === 'restricted' && local) {
    reasons.push('Restricted data stays on-device when a local runtime is available.')
    return { endpoint: local, reasons }
  }

  if (input.preferredLocation === 'local' && local) {
    reasons.push('Local runtime selected by caller preference.')
    return { endpoint: local, reasons }
  }

  if (input.preferredLocation === 'cloud' && cloud) {
    reasons.push('Cloud runtime selected by caller preference.')
    return { endpoint: cloud, reasons }
  }

  if (input.deviceCapability === 'low' && cloud && privacyLevel === 'public') {
    reasons.push('Cloud runtime selected because device capability is marked low.')
    return { endpoint: cloud, reasons }
  }

  if (input.latencySensitive && local) {
    reasons.push('Latency-sensitive request routed to the local runtime.')
    return { endpoint: local, reasons }
  }

  if (local) {
    reasons.push('Local runtime selected by default local-first policy.')
    return { endpoint: local, reasons }
  }

  if (cloud) {
    reasons.push('Cloud runtime selected because no local runtime is available.')
    return { endpoint: cloud, reasons }
  }

  return { endpoint: null, reasons }
}

export function resolveAiActionDecision(input: {
  confidence?: number | null
  requiresApproval?: boolean
  canAutoExecute?: boolean
  canQueueForApproval?: boolean
  safety?: AiActionSafety
}): AiActionDecision | null {
  const confidence = clampConfidence(input.confidence)
  if (confidence == null) return null

  const safety = input.safety ?? 'reversible'
  const requiresApproval = Boolean(input.requiresApproval || safety === 'significant' || safety === 'restricted')
  const canAutoExecute = input.canAutoExecute ?? !requiresApproval
  const canQueueForApproval = input.canQueueForApproval ?? true

  if (safety === 'restricted') {
    return {
      disposition: 'block',
      confidence,
      thresholds: DEFAULT_THRESHOLDS,
      requiresApproval: true,
      canAutoExecute: false,
      canQueueForApproval,
      reasoning: 'Restricted actions cannot be executed by the AI runtime.',
    }
  }

  if (confidence < DEFAULT_THRESHOLDS.medium) {
    return {
      disposition: 'request_input',
      confidence,
      thresholds: DEFAULT_THRESHOLDS,
      requiresApproval,
      canAutoExecute,
      canQueueForApproval,
      reasoning: 'Low confidence requires more user input before proceeding.',
    }
  }

  if (confidence < DEFAULT_THRESHOLDS.high) {
    return {
      disposition: canQueueForApproval ? 'queue_for_approval' : 'request_input',
      confidence,
      thresholds: DEFAULT_THRESHOLDS,
      requiresApproval,
      canAutoExecute,
      canQueueForApproval,
      reasoning: canQueueForApproval
        ? 'Medium confidence work is queued for approval.'
        : 'Medium confidence work requires clarification in this surface.',
    }
  }

  if (requiresApproval || !canAutoExecute) {
    return {
      disposition: canQueueForApproval ? 'queue_for_approval' : 'request_input',
      confidence,
      thresholds: DEFAULT_THRESHOLDS,
      requiresApproval,
      canAutoExecute,
      canQueueForApproval,
      reasoning: canQueueForApproval
        ? 'High confidence reached, but policy still requires approval before commit.'
        : 'High confidence reached, but this surface cannot auto-execute.',
    }
  }

  return {
    disposition: 'execute',
    confidence,
    thresholds: DEFAULT_THRESHOLDS,
    requiresApproval,
    canAutoExecute,
    canQueueForApproval,
    reasoning: 'High confidence and safe to execute automatically.',
  }
}

export function resolveAiDispatch(input: AiDispatchRequest): AiDispatchDecision {
  const runtimePolicy = getAiRuntimePolicy()
  const privacy = scanAiPrivacyRisk(input)
  const classification = classifyAiTask(input)
  const reasons = [...privacy.reasons, ...classification.reasons]

  const safety =
    input.safety ??
    (classification.mutatesState ? 'significant' : 'reversible')

  const confidenceDecision = resolveAiActionDecision({
    confidence: input.confidence,
    requiresApproval: input.requiresApproval ?? classification.needsApproval,
    canAutoExecute: input.canAutoExecute ?? !classification.needsApproval,
    canQueueForApproval: input.canQueueForApproval ?? true,
    safety,
  })

  if (!classification.requiresLlm) {
    reasons.push('Task resolved to deterministic execution, no LLM dispatch required.')
    return {
      provider: 'deterministic',
      privacy,
      classification,
      runtimePolicy,
      endpoint: null,
      executionLocation: null,
      model: null,
      reasons,
      confidenceDecision,
    }
  }

  const { endpoint, reasons: routeReasons } = selectRuntimeEndpoint(
    input,
    runtimePolicy.endpoints,
    privacy.level
  )
  reasons.push(...routeReasons)

  const location: AiExecutionLocation =
    endpoint?.location ?? runtimePolicy.defaultLocation

  return {
    provider: 'ollama',
    privacy,
    classification,
    runtimePolicy,
    endpoint,
    executionLocation: endpoint?.location ?? null,
    model: resolveOllamaModel(input.modelTier ?? 'standard', location),
    reasons,
    confidenceDecision,
  }
}
