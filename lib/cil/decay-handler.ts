// CIL Decay - Scheduled job handler
// NOT a 'use server' file (better-sqlite3 uses class exports)
// Called by the queue worker via the task registry.

import { getOrCreateDB } from './db'
import { runDecay } from './decay'

export async function handleCILDecay(
  _payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const db = getOrCreateDB(tenantId)
  const result = runDecay(db)
  return {
    decayed: result.decayed,
    archived: result.archived,
    tenantId,
  }
}
