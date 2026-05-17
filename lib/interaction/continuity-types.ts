export interface SessionState {
  id: string
  tenantId: string
  lastRoute: string
  lastEntityType: string | null
  lastEntityId: string | null
  scrollPosition: number
  tabIndex: number | null
  filterState: Record<string, unknown> | null
  updatedAt: string
}

export interface ResumePoint {
  route: string
  label: string
  entityType: string | null
  entityId: string | null
  timestamp: string
  context: Record<string, unknown>
}

export interface NavigationBreadcrumb {
  route: string
  label: string
  visitedAt: string
}
