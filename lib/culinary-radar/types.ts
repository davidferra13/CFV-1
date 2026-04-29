export type CulinaryRadarSourceKey =
  | 'fda_recalls'
  | 'fsis_recalls'
  | 'cdc_foodborne_outbreaks'
  | 'wck_opportunities'
  | 'worldchefs_sustainability'
  | 'ift_food_science'

export type CulinaryRadarSourceAuthority = 'regulatory' | 'relief' | 'industry' | 'academic'

export type CulinaryRadarCategory =
  | 'safety'
  | 'opportunity'
  | 'sustainability'
  | 'craft'
  | 'business'
  | 'local'
  | 'client_signal'

export type CulinaryRadarSeverity = 'critical' | 'high' | 'medium' | 'low'

export interface CulinaryRadarSourceDefinition {
  key: CulinaryRadarSourceKey
  label: string
  authority: CulinaryRadarSourceAuthority
  category: CulinaryRadarCategory
  credibilityTier:
    | 'official'
    | 'mission_partner'
    | 'academic'
    | 'industry'
    | 'local'
    | 'experimental'
  homepageUrl: string
  feedUrl?: string
  defaultRelevanceScore: number
}

export interface CulinaryRadarRawItem {
  sourceKey: CulinaryRadarSourceKey
  externalId: string
  title: string
  summary: string
  url: string
  publishedAt: string
  updatedAt?: string | null
  status?: string | null
  category?: CulinaryRadarCategory
  tags?: string[]
  locations?: string[]
  affectedEntities?: Record<string, unknown>
  rawPayload?: Record<string, unknown>
}

export interface CulinaryRadarNormalizedItem {
  id: string
  sourceKey: CulinaryRadarSourceKey
  sourceLabel: string
  sourceAuthority: CulinaryRadarSourceAuthority
  category: CulinaryRadarCategory
  credibilityTier: CulinaryRadarSourceDefinition['credibilityTier']
  externalId: string
  title: string
  summary: string
  url: string
  publishedAt: string
  updatedAt: string | null
  status: string | null
  tags: string[]
  locations: string[]
  affectedEntities: Record<string, unknown>
  rawPayload: Record<string, unknown>
  severity: CulinaryRadarSeverity
  relevanceScore: number
  relevanceSignals: string[]
  contentHash: string
}

export interface CulinaryRadarSeverityInput {
  sourceAuthority: CulinaryRadarSourceAuthority
  title: string
  summary: string
  tags?: string[]
  publishedAt?: string | null
}

export interface CulinaryRadarRelevanceInput {
  title: string
  summary: string
  tags?: string[]
}

export interface CulinaryRadarRelevanceResult {
  score: number
  publishable: boolean
  matchedSignals: string[]
}
