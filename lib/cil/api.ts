// CIL API - Public query interface
// Used by Remy context loader and future UI surfaces

import type { ScanResult } from './scanner'
import type { ProactiveSignal, SignalDomain } from './types'
import { scoreSignals } from './scoring'

// In-memory cache of last scan result per tenant (refreshed hourly by scheduled job)
const scanCache = new Map<string, { result: ScanResult; expiresAt: number }>()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

// Proactive signals cache (shorter TTL: 5 min)
const proactiveCache = new Map<string, { signals: ProactiveSignal[]; expiresAt: number }>()
const PROACTIVE_CACHE_TTL_MS = 5 * 60 * 1000

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

// ── Proactive Signals ────────────────────────────────────────────────────────

/**
 * Get all active (non-dismissed) proactive signals for a tenant.
 * Returns from SQLite proactive_signals table, sorted by urgency DESC.
 */
export async function getProactiveSignals(tenantId: string): Promise<ProactiveSignal[]> {
  try {
    const { getOrCreateDB } = await import('./db')
    const db = getOrCreateDB(tenantId)

    // Ensure table exists (idempotent)
    db.exec(`
      CREATE TABLE IF NOT EXISTS proactive_signals (
        id TEXT PRIMARY KEY,
        domain TEXT NOT NULL,
        urgency INTEGER NOT NULL DEFAULT 3,
        confidence REAL NOT NULL DEFAULT 0.5,
        title TEXT NOT NULL,
        detail TEXT NOT NULL DEFAULT '',
        suggested_action TEXT NOT NULL DEFAULT '',
        action_type TEXT NOT NULL DEFAULT 'dismiss',
        action_payload TEXT,
        entity_ids TEXT NOT NULL DEFAULT '[]',
        source TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        dismissed_at INTEGER
      )
    `)

    const rows = db
      .prepare(
        `SELECT * FROM proactive_signals WHERE dismissed_at IS NULL ORDER BY urgency DESC, created_at DESC`
      )
      .all() as Array<{
      id: string
      domain: string
      urgency: number
      confidence: number
      title: string
      detail: string
      suggested_action: string
      action_type: string
      action_payload: string | null
      entity_ids: string
      source: string
      created_at: number
      dismissed_at: number | null
    }>

    return rows.map((row) => ({
      id: row.id,
      domain: row.domain as SignalDomain,
      urgency: row.urgency as 1 | 2 | 3 | 4 | 5,
      confidence: row.confidence,
      title: row.title,
      detail: row.detail,
      suggestedAction: row.suggested_action,
      actionType: row.action_type as 'navigate' | 'confirm' | 'dismiss',
      actionPayload: row.action_payload ? JSON.parse(row.action_payload) : undefined,
      entityIds: JSON.parse(row.entity_ids),
      source: row.source,
      createdAt: row.created_at,
      dismissedAt: row.dismissed_at ?? undefined,
    }))
  } catch (err) {
    console.error(
      '[CIL] getProactiveSignals failed (non-fatal)',
      err instanceof Error ? err.message : err
    )
    return []
  }
}

/**
 * Dismiss a proactive signal by ID. Sets dismissed_at timestamp.
 */
export async function dismissSignal(tenantId: string, signalId: string): Promise<void> {
  try {
    const { getOrCreateDB } = await import('./db')
    const db = getOrCreateDB(tenantId)

    db.prepare(`UPDATE proactive_signals SET dismissed_at = ? WHERE id = ?`).run(
      Date.now(),
      signalId
    )
  } catch (err) {
    console.error(
      '[CIL] dismissSignal failed (non-fatal)',
      err instanceof Error ? err.message : err
    )
  }
}

/**
 * Persist new proactive signals from analyzers. Replaces stale signals (>24h)
 * for the same domain, preserving dismissed state.
 */
export async function persistSignals(tenantId: string, signals: ProactiveSignal[]): Promise<void> {
  try {
    const { getOrCreateDB } = await import('./db')
    const db = getOrCreateDB(tenantId)

    // Ensure table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS proactive_signals (
        id TEXT PRIMARY KEY,
        domain TEXT NOT NULL,
        urgency INTEGER NOT NULL DEFAULT 3,
        confidence REAL NOT NULL DEFAULT 0.5,
        title TEXT NOT NULL,
        detail TEXT NOT NULL DEFAULT '',
        suggested_action TEXT NOT NULL DEFAULT '',
        action_type TEXT NOT NULL DEFAULT 'dismiss',
        action_payload TEXT,
        entity_ids TEXT NOT NULL DEFAULT '[]',
        source TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        dismissed_at INTEGER
      )
    `)

    const scored = scoreSignals(signals)
    const staleThreshold = Date.now() - 86_400_000 // 24h

    const upsert = db.transaction(() => {
      // Remove stale non-dismissed signals
      db.prepare(`DELETE FROM proactive_signals WHERE dismissed_at IS NULL AND created_at < ?`).run(
        staleThreshold
      )

      // Insert new signals (ignore conflicts with existing dismissed ones)
      const insert = db.prepare(`
        INSERT OR IGNORE INTO proactive_signals
        (id, domain, urgency, confidence, title, detail, suggested_action, action_type, action_payload, entity_ids, source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const s of scored) {
        insert.run(
          s.id,
          s.domain,
          s.urgency,
          s.confidence,
          s.title,
          s.detail,
          s.suggestedAction,
          s.actionType,
          s.actionPayload ? JSON.stringify(s.actionPayload) : null,
          JSON.stringify(s.entityIds),
          s.source,
          s.createdAt
        )
      }
    })

    upsert()

    // Invalidate proactive cache
    proactiveCache.delete(tenantId)
  } catch (err) {
    console.error(
      '[CIL] persistSignals failed (non-fatal)',
      err instanceof Error ? err.message : err
    )
  }
}

/**
 * Run all analyzers and persist results. Called by scheduled job or on-demand.
 */
export async function refreshProactiveSignals(tenantId: string): Promise<ProactiveSignal[]> {
  try {
    // Check cache
    const cached = proactiveCache.get(tenantId)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.signals
    }

    const { runAllAnalyzers } = await import('./analyzers')
    const signals = await runAllAnalyzers(tenantId)

    await persistSignals(tenantId, signals)

    const result = scoreSignals(signals)
    proactiveCache.set(tenantId, {
      signals: result,
      expiresAt: Date.now() + PROACTIVE_CACHE_TTL_MS,
    })

    return result
  } catch (err) {
    console.error(
      '[CIL] refreshProactiveSignals failed (non-fatal)',
      err instanceof Error ? err.message : err
    )
    // Fall back to stored signals
    return getProactiveSignals(tenantId)
  }
}

/**
 * Format proactive signals for Remy's system prompt context.
 * Compact: top 5 by urgency with suggested actions.
 */
export function formatSignalsForRemy(signals: ProactiveSignal[]): string {
  if (signals.length === 0) return ''

  const lines: string[] = ['[Active Business Signals]']
  const top = signals.slice(0, 5)

  for (const s of top) {
    const urgencyIcon = s.urgency >= 4 ? '!!' : s.urgency >= 3 ? '!' : '-'
    lines.push(
      `${urgencyIcon} [${s.domain}] ${s.title}: ${s.detail} (Action: ${s.suggestedAction})`
    )
  }

  if (signals.length > 5) {
    lines.push(`... and ${signals.length - 5} more signals`)
  }

  return lines.join('\n')
}
