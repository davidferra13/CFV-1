// lib/qa/flow-types.ts
// Types for Cross-Boundary Flow Interrogation (DEV #2)

export interface FlowChainStep {
  entity: string
  entityId: string | null
  status: string | null
  linkedTo: string | null
}

export interface FlowChainResult {
  chain: string
  steps: FlowChainStep[]
  broken: boolean
  orphanedAt?: string
  error?: string
}

export interface OrphanedEntity {
  table: string
  id: string
  reason: string
}

export interface DeadEndFlow {
  chain: string
  entityId: string
  lastResolvedStep: string
  expectedNextStep: string
}

export interface FlowInterrogationReport {
  chains: FlowChainResult[]
  orphanedEntities: OrphanedEntity[]
  deadEndFlows: DeadEndFlow[]
  totalChainsChecked: number
  brokenChains: number
  runAt: string
}
