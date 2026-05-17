export type SurfaceLevel = 'primary' | 'secondary' | 'tertiary' | 'ambient'

export type VisualPriority = 'critical' | 'high' | 'medium' | 'low' | 'decorative'

export interface SurfaceConfig {
  id: string
  tenantId: string
  route: string
  component: string | null
  surfaceLevel: SurfaceLevel
  visualPriority: VisualPriority
  zIndex: number | null
  elevation: number | null
  createdAt: Date
}

export interface PriorityAudit {
  id: string
  tenantId: string
  route: string
  totalElements: number
  byPriority: Record<string, number>
  bySurface: Record<string, number>
  score: number
  auditedAt: Date
}

export interface VisualPrioritySummary {
  totalConfigs: number
  byLevel: Record<string, number>
  byPriority: Record<string, number>
  avgScore: number
  worstRoutes: Array<{ route: string; score: number }>
}
