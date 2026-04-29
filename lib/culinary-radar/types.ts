export type CulinaryRadarSourceKey = 'fda' | 'fsis' | 'wck' | 'worldchefs'

export type CulinaryRadarSourceAuthority = 'regulatory' | 'relief' | 'industry'

export type CulinaryRadarSeverity = 'critical' | 'high' | 'medium' | 'low'

export interface CulinaryRadarSourceDefinition {
  key: CulinaryRadarSourceKey
  label: string
  authority: CulinaryRadarSourceAuthority
  homepageUrl: string
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
  tags?: string[]
  locations?: string[]
}

export interface CulinaryRadarNormalizedItem {
  id: string
  sourceKey: CulinaryRadarSourceKey
  sourceLabel: string
  sourceAuthority: CulinaryRadarSourceAuthority
  externalId: string
  title: string
  summary: string
  url: string
  publishedAt: string
  updatedAt: string | null
  status: string | null
  tags: string[]
  locations: string[]
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
