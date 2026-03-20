// API v2 - Public exports
// Import from '@/lib/api/v2' in route handlers.

export { withApiAuth, type ApiContext, type ApiHandler, type ApiAuthOptions } from './middleware'
export {
  apiSuccess,
  apiCreated,
  apiNoContent,
  apiError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiValidationError,
  apiRateLimited,
  apiServerError,
} from './response'
export { parsePagination, applyPagination, paginationMeta } from './pagination'
export { API_SCOPES, hasScope, hasAllScopes, getScopesByCategory, type ApiScope } from './scopes'
