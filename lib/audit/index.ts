/**
 * Operation Audit Log - Public API
 *
 * For server actions that mutate data:
 *   import { logOperation, logOperationDirect, computeDiff, createDiff, transitionDiff } from '@/lib/audit'
 *
 * For client components that display history:
 *   import { fetchEntityTimeline, fetchActivityLog } from '@/lib/audit/actions'
 */

// Core logging
export { logOperation, logOperationDirect, saveSnapshot } from './log-operation'

// Diff utilities
export { computeDiff, createDiff, transitionDiff } from './diff'

// Types
export type {
  EntityType,
  OperationType,
  OperationDiff,
  OperationMetadata,
  OperationLogEntry,
  EntitySnapshot,
  LogOperationInput,
  SnapshotInput,
} from './types'
