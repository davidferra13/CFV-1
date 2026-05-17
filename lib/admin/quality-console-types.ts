export interface TenantHealthScore {
  tenantId: string
  chefName: string
  overallScore: number
  metrics: {
    profileCompleteness: number
    activeEvents: number
    clientCount: number
    lastLoginDaysAgo: number
    responseRate: number
    menuCount: number
    recipeCount: number
  }
  status: 'thriving' | 'active' | 'stale' | 'at_risk' | 'dormant'
}

export interface WorkflowHealth {
  workflow: string
  completionRate: number
  avgDuration: number
  dropOffStep: string | null
  totalStarted: number
  totalCompleted: number
}

export interface QualityAlert {
  id: string
  tenantId: string
  alertType: 'stale_tenant' | 'broken_workflow' | 'data_quality' | 'security_concern'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  resolved: boolean
  createdAt: string
}

export interface PlatformOverview {
  totalTenants: number
  activeTenants: number
  totalEvents: number
  avgHealthScore: number
  alerts: QualityAlert[]
}
