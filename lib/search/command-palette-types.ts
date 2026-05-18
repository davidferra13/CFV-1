/** Entity types searchable via the command palette */
export type EntityType =
  | 'event'
  | 'client'
  | 'menu'
  | 'recipe'
  | 'ingredient'
  | 'inquiry'
  | 'quote'
  | 'expense'
  | 'partner'
  | 'staff'
  | 'dish'
  | 'contract'
  | 'message'
  | 'conversation'

/** A single search result from universal search */
export interface CommandSearchResult {
  id: string
  type: EntityType | 'page'
  label: string
  description?: string
  href: string
  icon?: string
  relevanceScore: number
  metadata?: Record<string, string>
}

/** A quick action available in the command palette */
export interface QuickAction {
  id: string
  label: string
  description: string
  href?: string
  shortcut?: string
  icon: string
  action?: string
}

/** State shape for the command palette UI */
export interface CommandPaletteState {
  open: boolean
  query: string
  results: CommandSearchResult[]
  recentSearches: SearchHistoryRow[]
  quickActions: QuickAction[]
  loading: boolean
  activeIndex: number
  typeFilter: EntityType | null
}

/** A row from the search_history table */
export interface SearchHistoryRow {
  id: string
  chefId: string
  query: string
  selectedResultType: string | null
  selectedResultId: string | null
  selectedResultLabel: string | null
  createdAt: string
}

/** Standard success/error return from server actions */
export interface SearchActionResult {
  success: boolean
  error?: string
}
