/**
 * Security module barrel export
 *
 * Re-exports route protection types, matrix, and server actions.
 */

// Types
export type {
  ProtectionLevel,
  RouteProtectionEntry,
  ProtectionMatrixSummary,
  RouteProtectionResult,
} from './route-protection-types'

// Matrix data
export { routeProtectionMatrix } from './route-protection-matrix'

// Existing route policy (granular per-route)
export { routePolicy, pageFileToRoute, getRoutePolicy } from './route-policy'
export type { RoutePolicyTier } from './route-policy'

// Server actions
export {
  getProtectionMatrix,
  validateRouteProtection,
  getProtectionSummary,
  findUnprotectedRoutes,
} from './protection-actions'
