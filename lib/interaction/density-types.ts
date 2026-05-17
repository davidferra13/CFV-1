export type DensityMode = 'compact' | 'comfortable' | 'spacious'
export type WorkspaceMode = 'focus' | 'overview' | 'planning'
export interface WorkspacePreferences {
  id: string
  tenantId: string
  densityMode: DensityMode
  workspaceMode: WorkspaceMode
  sidebarCollapsed: boolean
  compactTables: boolean
  showQuickActions: boolean
  createdAt: string
  updatedAt: string
}
