// lib/feature-gates/index.ts
// Barrel export for the feature gate contract.

export type { GateTier, GateDefinition, GateCheckResult, GateRegistry } from './gate-types'
export { GATE_REGISTRY, type GateKey } from './gate-registry'
export { checkGate, requireGate, isGateEnabled, getChefGates } from './gate-check'
export { getMyGates, getGateRegistry, checkMyGate } from './gate-actions'
