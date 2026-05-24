// Barrel export for surface ownership system

export type {
  OwnershipHealth,
  OwnershipSummary,
  SurfaceEntry,
  SurfaceOwner,
} from './ownership-types'

export { getOwner, getPatternsForOwner, isOrphan } from './ownership-registry'

export {
  getOrphanRoutes,
  getOwnershipHealth,
  getOwnershipSummary,
  getRoutesByOwner,
} from './ownership-actions'
