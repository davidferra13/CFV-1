// CIL API - Public query interface
// Used by Remy context loader and future UI surfaces

import type { ScanResult } from './scanner'

// In-memory cache of last scan result per tenant (refreshed hourly by scheduled job)
const scanCache = new Map<string, { result: ScanResult; expiresAt: number }>()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Get CIL insights for a tenant. Returns cached scan result or runs fresh scan.
 * Non-blocking: returns null if CIL is not initialized for this tenant.
 */
export async function getCILInsights(tenantId: string): Promise<ScanResult | null> {
  try {
    // Check cache first
    const cached = scanCache.get(tenantId)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result
    }

    // Dynamic import to avoid loading SQLite at module parse time
    const { getOrCreateDB } = await import('./db')
    const { scanGraph } = await import('./scanner')

    const db = getOrCreateDB(tenantId)

    // Quick check: if no signals exist yet, skip scan
    const count = (db.prepare('SELECT COUNT(*) as c FROM signals').get() as { c: number }).c
    if (count === 0) return null

    const result = scanGraph(db)

    scanCache.set(tenantId, {
      result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    })

    return result
  } catch (err) {
    console.error(
      '[CIL] getCILInsights failed (non-fatal)',
      err instanceof Error ? err.message : err
    )
    return null
  }
}

/**
 * Format CIL insights as a string for Remy's system prompt context.
 * Compact: only high/medium severity, max 5 insights.
 */
export function formatInsightsForRemy(scan: ScanResult): string {
  const lines: string[] = []

  lines.push(
    `[CIL Graph: ${scan.stats.totalEntities} entities, ${scan.stats.totalRelations} relations, avg strength ${(scan.stats.avgRelationStrength * 100).toFixed(0)}%]`
  )

  const important = scan.insights
    .filter((i) => i.severity === 'high' || i.severity === 'medium')
    .slice(0, 5)

  if (important.length > 0) {
    lines.push('CIL Insights:')
    for (const insight of important) {
      const icon = insight.severity === 'high' ? '!' : '-'
      lines.push(`${icon} ${insight.title}: ${insight.detail}`)
    }
  }

  if (scan.stats.weakRelationCount > 0) {
    lines.push(
      `${scan.stats.weakRelationCount} weak relations (below 30% strength) may need attention.`
    )
  }

  return lines.join('\n')
}

/**
 * Invalidate the scan cache for a tenant. Called after bulk operations.
 */
export function invalidateCILCache(tenantId: string): void {
  scanCache.delete(tenantId)
}
