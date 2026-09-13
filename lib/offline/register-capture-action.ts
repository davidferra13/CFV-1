'use client'

// Registers the offline capture action so the sync engine can replay
// captures made from the static offline.html page.
//
// offline.html writes entries to the same IndexedDB queue with
// actionName: 'offline-capture/create'. When the app loads and the
// sync engine replays pending actions, this registration tells it
// to call createTodo with the captured text.

import { registerOfflineAction } from './sync-engine'
import { createTodo } from '@/lib/todos/actions'

let registered = false

/**
 * Call once at app startup (e.g. in OfflineProvider).
 * Idempotent - safe to call multiple times.
 */
export function registerCaptureAction() {
  if (registered) return
  registered = true

  registerOfflineAction('offline-capture/create', async (...args: unknown[]) => {
    const payload = args[0] as {
      type?: string
      text?: string
      amount?: string
      capturedAt?: string
    }
    if (typeof payload?.text !== 'string' || !payload.text.trim()) {
      throw new Error('Offline capture has no valid text. The original remains on this device.')
    }

    if (payload.amount !== undefined && typeof payload.amount !== 'string') {
      throw new Error('Offline capture has an invalid amount. The original remains on this device.')
    }

    // Build todo text with context from the capture
    const prefix =
      payload.type === 'expense'
        ? `[Expense${payload.amount ? ` $${payload.amount}` : ''}] `
        : payload.type === 'recipe-idea'
          ? '[Recipe idea] '
          : payload.type === 'event-note'
            ? '[Event note] '
            : ''

    const todoText = `${prefix}${payload.text}`.trim()
    if (todoText.length > 2000) {
      throw new Error(
        'Offline capture exceeds 2,000 characters. The original remains on this device.'
      )
    }

    // The title is limited to 500 characters; retain longer captures in notes.
    const input =
      todoText.length > 500 ? { text: `${todoText.slice(0, 497)}...`, notes: todoText } : todoText
    const result = await createTodo(input)

    // A resolved promise can still contain a failed server-action result.
    // Throw so the sync engine keeps the original queue entry for recovery.
    if (result?.success !== true || typeof result.id !== 'string' || !result.id.trim()) {
      throw new Error(
        result?.error || 'The server did not confirm that the offline capture was saved.'
      )
    }

    return result
  })
}
