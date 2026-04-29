export type RadarCategory =
  | 'safety'
  | 'opportunity'
  | 'sustainability'
  | 'craft'
  | 'business'
  | 'local'
  | 'client_signal'

export type RadarSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export type RadarDeliveryState = 'unread' | 'read' | 'dismissed' | 'snoozed' | 'archived'

export type RadarSourceSummary = {
  id: string
  key: string
  name: string
  homepageUrl: string | null
  sourceType: string
  credibilityTier: string
  defaultCategory: RadarCategory
  active: boolean
  lastCheckedAt: string | null
  lastSuccessAt: string | null
  lastError: string | null
}

export type RadarMatchView = {
  id: string
  itemId: string
  relevanceScore: number
  severity: RadarSeverity
  deliveryState: RadarDeliveryState
  matchReasons: string[]
  matchedEntities: Array<{ type: string; id?: string; label: string; href?: string }>
  recommendedActions: string[]
  createdAt: string
  readAt: string | null
  dismissedAt: string | null
  item: {
    title: string
    summary: string | null
    canonicalUrl: string
    sourcePublishedAt: string | null
    category: RadarCategory
    status: string
    sourceName: string
    credibilityTier: string
  }
}

export type RadarLoadResult = {
  success: boolean
  error?: string
  matches: RadarMatchView[]
  sources: RadarSourceSummary[]
}

export type RadarPreferenceView = {
  category: RadarCategory
  enabled: boolean
  emailEnabled: boolean
  minAlertSeverity: RadarSeverity
  digestFrequency: 'immediate' | 'daily' | 'weekly' | 'never'
}

export type RadarPreferenceLoadResult = {
  success: boolean
  error?: string
  preferences: RadarPreferenceView[]
}
