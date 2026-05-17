export type MetricTier = 'hero' | 'primary' | 'secondary' | 'detail'
export type MetricFormat = 'number' | 'currency' | 'percentage' | 'duration' | 'count'

export interface MetricConfig {
  id: string
  tenantId: string
  key: string
  label: string
  tier: MetricTier
  format: MetricFormat
  icon?: string | null
  route?: string | null
  order: number
  groupName?: string | null
  createdAt: Date
}

export interface MetricGroup {
  name: string
  metrics: MetricConfig[]
  collapsed?: boolean
}

export interface MetricHierarchySummary {
  totalMetrics: number
  byTier: Record<MetricTier, number>
  byFormat: Record<MetricFormat, number>
  totalGroups: number
}
