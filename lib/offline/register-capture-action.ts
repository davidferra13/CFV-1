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
    if (!payload?.text) return

    // Build todo text with context from the capture
    const prefix =
      payload.type === 'expense'
        ? `[Expense${payload.amount ? ` $${payload.amount}` : ''}] `
        : payload.type === 'recipe-idea'
          ? '[Recipe idea] '
          : payload.type === 'event-note'
            ? '[Event note] '
            : ''

    const todoText = `${prefix}${payload.text}`.slice(0, 500)
    await createTodo(todoText)
  })
}
