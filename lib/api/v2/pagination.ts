// API v2 Pagination Helpers
// Offset-based pagination for list endpoints.

export interface PaginationParams {
  page: number // 1-indexed
  per_page: number
}

const DEFAULT_PAGE = 1
const DEFAULT_PER_PAGE = 50
const MAX_PER_PAGE = 200

/**
 * Parse pagination params from URL search params.
 * Clamps per_page to MAX_PER_PAGE and page to minimum 1.
 */
export function parsePagination(url: URL): PaginationParams {
  const rawPage = Number(url.searchParams.get('page') ?? DEFAULT_PAGE)
  const rawPerPage = Number(url.searchParams.get('per_page') ?? DEFAULT_PER_PAGE)

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : DEFAULT_PAGE
  const per_page =
    Number.isFinite(rawPerPage) && rawPerPage >= 1
      ? Math.min(Math.floor(rawPerPage), MAX_PER_PAGE)
      : DEFAULT_PER_PAGE

  return { page, per_page }
}

/**
 * Apply pagination to a database query using .range().
 * Returns the query with range applied.
 */
export function applyPagination<T extends { range: (from: number, to: number) => T }>(
  query: T,
  params: PaginationParams
): T {
  const from = (params.page - 1) * params.per_page
  const to = from + params.per_page - 1
  return query.range(from, to)
}

/**
 * Build the meta object for paginated responses.
 */
export function paginationMeta(
  params: PaginationParams,
  count: number
): { page: number; per_page: number; total: number; count: number } {
  return {
    page: params.page,
    per_page: params.per_page,
    total: count,
    count: Math.min(params.per_page, count - (params.page - 1) * params.per_page),
  }
}
