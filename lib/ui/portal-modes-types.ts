export type PortalRole = 'chef' | 'client' | 'crew' | 'vendor' | 'admin'

export type VisualMode = {
  id: string
  tenantId: string
  role: PortalRole
  name: string
  theme: string
  colorOverrides?: Record<string, string> | null
  layoutOverrides?: Record<string, unknown> | null
  logoUrl?: string | null
  createdAt: Date
  updatedAt: Date
}

export type RolePermission = {
  role: PortalRole
  canView: string[]
  canEdit: string[]
  canDelete: string[]
}

export type PortalModeSummary = {
  totalModes: number
  byRole: Record<PortalRole, number>
  activeMode: VisualMode | null
}
