// Offline module - public API
// Import from '@/lib/offline' for clean access to all offline utilities.

export { enqueueAction, getPendingActions, getPendingCount, isIDBAvailable } from './idb-queue'
export type { QueuedAction } from './idb-queue'

export { useNetworkStatus } from './use-network-status'
export type { NetworkStatus } from './use-network-status'

export {
  registerOfflineAction,
  replayPendingActions,
  onSyncProgress,
  isSyncInProgress,
} from './sync-engine'
export type { SyncProgress } from './sync-engine'

export { createOfflineAction, OfflineQueuedError } from './offline-action'

export { useOfflineForm } from './use-offline-form'
