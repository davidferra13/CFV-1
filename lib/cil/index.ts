// CIL (Continuous Intelligence Layer) - Module entry point
// Initializes per-tenant SQLite observation pipeline
// Phase 1: observe, record, build graph. No predictions, no UI.

let initialized = false

export function initCIL(): void {
  if (initialized) return
  initialized = true
  console.log('[CIL] Continuous Intelligence Layer initialized (Phase 1: observation mode)')
}

// Re-export public API
export { notifyCIL } from './notify'
export { getOrCreateDB, closeDB, closeAllDBs, deleteTenantDB } from './db'
export { runDecay } from './decay'
export { scanGraph } from './scanner'
export { getCILInsights, formatInsightsForRemy, invalidateCILCache } from './api'
export type {
  CILEntity,
  CILRelation,
  CILSignal,
  EntityType,
  RelationType,
  SignalSource,
} from './types'
export type { CILInsight, ScanResult } from './scanner'
