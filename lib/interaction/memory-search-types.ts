export type SearchableSource =
  | 'events'
  | 'clients'
  | 'recipes'
  | 'menus'
  | 'notes'
  | 'communication_log'
  | 'invoices'

export interface SearchResult {
  id: string
  source: SearchableSource
  title: string
  snippet: string
  matchField: string
  entityId: string
  relevanceScore: number
  createdAt: string
}

export interface SearchFilters {
  sources?: SearchableSource[]
  dateFrom?: string
  dateTo?: string
  limit?: number
}

export interface SourcePreview {
  source: SearchableSource
  entityId: string
  title: string
  fields: { label: string; value: string }[]
  relatedEntities: { type: string; id: string; label: string }[]
}

export interface SearchStats {
  totalResults: number
  bySource: Record<string, number>
  searchTime: number
}
