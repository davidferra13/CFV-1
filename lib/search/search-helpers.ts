import type { PaginationParams, PaginationMeta, PaginatedResponse } from './search-types'

/**
 * Normalize pagination params with sensible defaults.
 * Clamps page to >= 1 and pageSize to 1-100.
 */
export function normalizePagination(params?: PaginationParams): {
  page: number
  pageSize: number
  offset: number
} {
  const page = Math.max(1, params?.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, params?.pageSize ?? 25))
  const offset = (page - 1) * pageSize
  return { page, pageSize, offset }
}

/**
 * Build pagination metadata from total count and params.
 */
export function buildPaginationMeta(total: number, page: number, pageSize: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasMore: page < totalPages,
  }
}

/**
 * Wrap data + count into a PaginatedResponse.
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: buildPaginationMeta(total, page, pageSize),
  }
}

/**
 * Convert a user search query into a tsquery string for PostgreSQL FTS.
 * Handles multiple words by joining with & (AND).
 * Strips special characters that could break tsquery parsing.
 */
export function toTsQuery(query: string): string {
  return query
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w + ':*')
    .join(' & ')
}

/**
 * Build a raw SQL fragment for full-text search against a search_vector column.
 * Returns null if query is empty/invalid.
 * Usage: WHERE search_vector @@ to_tsquery('english', ${tsq})
 */
export function buildFtsQuery(query: string): string | null {
  const tsq = toTsQuery(query)
  if (!tsq) return null
  return tsq
}

/**
 * Sanitize a search query string: trim, lowercase, remove dangerous chars.
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/[%_\\'";\-\-]/g, '')
    .slice(0, 200)
}
