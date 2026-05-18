// CIL Scanner - Scheduled job handler
// NOT a 'use server' file (better-sqlite3 uses class exports)
// Runs hourly: scans graph, caches results for Remy context, dispatches notifications.

import { getOrCreateDB } from './db'
import { scanGraph } from './scanner'
import { invalidateCILCache } from './api'
import { dispatchScannerInsights } from './scanner-dispatch'

export async function handleCILScan(
  _payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const db = getOrCreateDB(tenantId)
  const result = scanGraph(db)

  // Invalidate cache so next getCILInsights() returns fresh data
  invalidateCILCache(tenantId)

  // Wire scanner insights into notification pipeline (non-blocking)
  const dispatch = await dispatchScannerInsights(tenantId, result.insights)

  return {
    tenantId,
    entities: result.stats.totalEntities,
    relations: result.stats.totalRelations,
    insights: result.insights.length,
    highSeverity: result.insights.filter((i) => i.severity === 'high').length,
    persisted: dispatch.persisted,
    notified: dispatch.notified,
  }
}
