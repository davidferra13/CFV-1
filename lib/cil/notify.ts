// CIL - Non-blocking notification entry point
// Same pattern as logChefActivity(): never throws, never blocks the caller

import type { SignalSource } from './types'

// ULID-like ID generator (time-sortable, no external dependency)
function generateId(): string {
  const t = Date.now().toString(36)
  const r = Math.random().toString(36).substring(2, 10)
  return `${t}-${r}`
}

export async function notifyCIL(input: {
  tenantId: string
  source: SignalSource
  entityIds: string[]
  payload: Record<string, unknown>
  timestamp?: number
}): Promise<void> {
  try {
    // Dynamic import to avoid loading SQLite at module parse time
    // (prevents build issues with better-sqlite3 native module)
    const { getOrCreateDB } = await import('./db')
    const { ingestSignal } = await import('./ingest')

    const db = getOrCreateDB(input.tenantId)
    const signal = {
      id: generateId(),
      source: input.source,
      entity_ids: JSON.stringify(input.entityIds),
      payload: JSON.stringify(input.payload),
      timestamp: input.timestamp ?? Date.now(),
      interpretation_status: 'pending' as const,
      created_at: Date.now(),
    }

    db.prepare(
      `
      INSERT INTO signals (id, source, entity_ids, payload, timestamp, interpretation_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      signal.id,
      signal.source,
      signal.entity_ids,
      signal.payload,
      signal.timestamp,
      signal.interpretation_status,
      signal.created_at
    )

    // Synchronous ingestion (SQLite is fast)
    ingestSignal(db, signal)
  } catch (err) {
    // Non-fatal. CIL failure must never block the caller.
    console.error('[CIL] notifyCIL failed (non-fatal)', err instanceof Error ? err.message : err)
  }
}
