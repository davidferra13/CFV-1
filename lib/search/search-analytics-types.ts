/** A single logged search query row from the search_queries table */
export interface SearchQuery {
  id: string
  tenantId: string
  queryText: string
  resultCount: number
  entityTypes: string[]
  searchedAt: Date
}

/** Aggregated search analytics for a time period */
export interface SearchAnalytics {
  totalSearches: number
  avgResultCount: number
  topQueries: { queryText: string; count: number }[]
  zeroResultQueries: { queryText: string; count: number }[]
}

/** Search health report with a 0-100 score */
export interface SearchHealthReport {
  /** Overall health score from 0 (broken) to 100 (excellent) */
  healthScore: number
  totalSearches: number
  zeroResultRate: number
  avgResultCount: number
  topZeroResultQueries: { queryText: string; count: number }[]
  evaluatedAt: Date
}
