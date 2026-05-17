// Lifecycle Naming & Surface Decision types

export type SurfaceContext = 'dashboard' | 'detail' | 'email' | 'portal' | 'mobile'

export interface LifecycleNameEntry {
  id: string
  tenantId: string
  internalName: string
  chefLabel: string
  clientLabel: string
  surfaceContext: SurfaceContext
  icon: string | null
  color: string | null
  sortOrder: number
  active: boolean
  createdAt: Date
}

export interface NamingDecision {
  id: string
  tenantId: string
  internalName: string
  decision: string
  rationale: string | null
  decidedBy: string
  decidedAt: Date
  createdAt: Date
}

export interface NamingSummary {
  totalEntries: number
  totalDecisions: number
  undecidedStages: string[]
  surfaceCoverage: Record<SurfaceContext, number>
}
