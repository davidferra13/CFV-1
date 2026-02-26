export type SaveState =
  | { status: 'UNSAVED' }
  | { status: 'SAVING' }
  | { status: 'SAVED'; lastSavedAt: string }
  | { status: 'OFFLINE_QUEUED'; queuedCount: number; lastQueuedAt?: string }
  | { status: 'SAVE_FAILED'; errorMessage: string; traceId?: string }

export const UNSAVED_STATE: SaveState = { status: 'UNSAVED' }
export const SAVING_STATE: SaveState = { status: 'SAVING' }

export function savedState(lastSavedAt = new Date().toISOString()): SaveState {
  return { status: 'SAVED', lastSavedAt }
}

export function offlineQueuedState(
  queuedCount: number,
  lastQueuedAt = new Date().toISOString()
): SaveState {
  return { status: 'OFFLINE_QUEUED', queuedCount, lastQueuedAt }
}

export function saveFailedState(errorMessage: string, traceId?: string): SaveState {
  return { status: 'SAVE_FAILED', errorMessage, traceId }
}
