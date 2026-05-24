// Barrel re-exports for lib/search

// Search types
export type {
  PaginationParams,
  PaginationMeta,
  PaginatedResponse,
  SearchMatch,
  ListParams,
} from './search-types'

// Search analytics types
export type { SearchQuery, SearchAnalytics, SearchHealthReport } from './search-analytics-types'

// Command palette types
export type {
  EntityType,
  CommandSearchResult,
  QuickAction,
  CommandPaletteState,
  SearchHistoryRow,
  SearchActionResult,
} from './command-palette-types'

// Universal search
export type { SearchResult, SearchResponse } from './universal-search'
export { universalSearch } from './universal-search'

// Search helpers
export {
  normalizePagination,
  buildPaginationMeta,
  paginatedResponse,
  toTsQuery,
  buildFtsQuery,
  sanitizeSearchQuery,
  ftsMatchIds,
} from './search-helpers'

// Search analytics actions
export {
  logSearchQuery,
  getSearchAnalytics,
  getZeroResultQueries,
  getSearchHealth,
} from './search-analytics-actions'

// Command palette actions
export {
  paletteSearch,
  getRecentSearches as getRecentPaletteSearches,
  logSearch,
  getQuickActions,
  clearRecentSearches as clearPaletteSearches,
} from './command-palette-actions'

// Search recents (file-based)
export type { SearchHistoryEntry } from './search-recents'
export { readSearchHistory, writeRecentSearch, togglePinnedSearch } from './search-recents'
