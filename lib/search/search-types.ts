/** Pagination parameters accepted by search actions */
export interface PaginationParams {
  page?: number
  pageSize?: number
}

/** Pagination metadata returned with search results */
export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasMore: boolean
}

/** Generic paginated response wrapper */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}

/** Full-text search match metadata */
export interface SearchMatch {
  rank: number
  matchedFields: string[]
}

/** Standard search/filter parameters for list views */
export interface ListParams extends PaginationParams {
  search?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}
