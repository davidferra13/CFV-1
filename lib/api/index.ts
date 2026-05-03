// API module - public API

export { hashApiKey, generateApiKey, validateApiKey } from './auth-api-key'
export type { ApiKeyContext } from './auth-api-key'

export {
  API_AUTH_GUARDS,
  API_AUTH_ALTERNATIVE_PATTERNS,
  API_NO_STANDARD_AUTH_ALLOWLIST_EXTRAS,
  API_NO_STANDARD_AUTH_ALLOWLIST,
  MIN_PROTECTED_API_ROUTE_RATIO,
  discoverApiRouteFiles,
  hasApiAuthGuard,
  hasAlternativeApiAuth,
  isKnownNoStandardAuthRoute,
  buildApiRouteAuthInventory,
} from './auth-inventory'
export type {
  ApiRouteAuthClassification,
  ApiRouteAuthEntry,
  ApiRouteAuthInventory,
} from './auth-inventory'

export { withApiGuard, ISO_DATE_SCHEMA } from './guard'

// key-actions.ts - 'use server'
export { createApiKey, revokeApiKey } from './key-actions'

export { checkRateLimit } from './rate-limit'

export { readJsonBodyWithLimit, PUBLIC_INTAKE_JSON_BODY_MAX_BYTES } from './request-body'
export type { JsonBodyReadResult } from './request-body'
