// Dashboard Command Center - Type Definitions

/** Widget type for dashboard layout */
export type WidgetType = 'metric' | 'chart' | 'list' | 'calendar' | 'action' | 'feed'

/** Position and size of a widget in the grid */
export type WidgetPosition = {
  row: number
  col: number
  width: number
  height: number
}

/** A single command center widget */
export type CommandWidget = {
  id: string
  type: WidgetType
  title: string
  position: WidgetPosition
  config: Record<string, unknown>
}

/** A saved dashboard layout */
export type DashboardLayout = {
  id: string
  tenantId: string
  chefId: string
  name: string
  widgets: CommandWidget[]
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

/** A tracked dashboard metric */
export type DashboardMetric = {
  id: string
  tenantId: string
  key: string
  label: string
  value: string
  previousValue?: string
  trend?: 'up' | 'down' | 'flat'
  unit?: string
  updatedAt: string
}

/** Aggregate summary of command center state */
export type CommandCenterSummary = {
  totalLayouts: number
  totalMetrics: number
  activeWidgets: number
  lastUpdated: string | null
}
