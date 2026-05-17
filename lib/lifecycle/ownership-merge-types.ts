export type OwnerRole = 'lead' | 'support' | 'reviewer'
export type MergeStrategy = 'sequential' | 'parallel' | 'conditional'
export type MergeStatus = 'draft' | 'active' | 'completed' | 'cancelled'

export type OwnershipAssignment = {
  id: string
  tenantId: string
  eventId: string
  lifecycleStage: string
  ownerId: string
  ownerName: string
  role: OwnerRole
  active: boolean
  assignedAt: string
  createdAt: string
}

export type MergePlan = {
  id: string
  tenantId: string
  eventId: string
  title: string
  sourceStages: string[]
  targetStage: string
  strategy: MergeStrategy
  status: MergeStatus
  createdAt: string
  completedAt: string | null
}

export type HandoffRule = {
  id: string
  tenantId: string
  fromStage: string
  toStage: string
  requiresApproval: boolean
  checklist: Record<string, unknown>
  autoAssignTo: string | null
  createdAt: string
}

export type OwnershipSummary = {
  eventId: string
  totalAssignments: number
  activeOwners: number
  pendingHandoffs: number
  mergePlansActive: number
}
