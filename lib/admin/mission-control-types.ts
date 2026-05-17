// Mission Control Passive Dashboard Types
// Internal admin dashboard for platform operator visibility.

export type PlatformOverview = {
  totalTenants: number
  activeTenants: number
  totalEvents: number
  activeEvents: number
  eventsThisMonth: number
  totalRevenueCents: number
  revenueThisMonthCents: number
  totalClients: number
  clientsThisMonth: number
  totalRecipes: number
  totalMenus: number
  webhookFailureRate: number
  lastActivityAt: string | null
}

export type TenantHealth = {
  id: string
  businessName: string | null
  email: string | null
  createdAt: string
  accountStatus: string | null
  // Activity signals
  eventCount: number
  clientCount: number
  recipeCount: number
  menuCount: number
  revenueCents: number
  lastEventDate: string | null
  // Computed scores (0-100)
  activityScore: number
  dataQualityScore: number
  engagementScore: number
  overallHealthScore: number
}

export type AlertSeverity = 'critical' | 'warning' | 'info'

export type SystemAlert = {
  id: string
  severity: AlertSeverity
  title: string
  detail: string
  source: string
  detectedAt: string
}

export type ActivityFeedItem = {
  id: string
  timestamp: string
  source: 'event' | 'inquiry' | 'client' | 'recipe' | 'menu' | 'payment' | 'signup' | 'system'
  summary: string
  tenantId: string | null
  tenantName: string | null
}

export type GrowthPeriod = '7d' | '30d' | '90d'

export type GrowthMetrics = {
  period: GrowthPeriod
  newSignups: number
  newClients: number
  newEvents: number
  revenueCents: number
  // Compared to prior period
  signupDelta: number | null
  clientDelta: number | null
  eventDelta: number | null
  revenueDelta: number | null
  // Retention
  activeTenantCount: number
  churned: number
  retentionRate: number | null
}
