import type { SaveState } from '@/lib/save-state/model'
import {
  SAVING_STATE,
  UNSAVED_STATE,
  offlineQueuedState,
  saveFailedState,
  savedState,
} from '@/lib/save-state/model'

export const SAVED_STATE = (lastSavedAt?: string): SaveState => savedState(lastSavedAt)
export const OFFLINE_QUEUED_STATE = (queuedCount: number, lastQueuedAt?: string): SaveState =>
  offlineQueuedState(queuedCount, lastQueuedAt)
export const SAVE_FAILED_STATE = (errorMessage: string, traceId?: string): SaveState =>
  saveFailedState(errorMessage, traceId)

export { SAVING_STATE, UNSAVED_STATE }
