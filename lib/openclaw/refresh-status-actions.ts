'use server'

/**
 * OpenClaw Refresh Status Actions
 * Chef-safe read-only action that returns truthful last-known timestamps
 * for both the local PostgreSQL mirror and the Pi live catalog scrape.
 *
 * Design rules (from openclaw-refresh-status-badge spec):
 * - Return raw ISO timestamps only. No guessed countdown, no nextRefreshAt.
 * - Missing data becomes null. Never substitute zeros or fake dates.
 * - Pi failure is degraded state, not a fatal error.
 * - Prefer finished_at over started_at for local pull timing.
 */

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'
import { getOpenClawStatsInternal } from '@/lib/openclaw/sync'

export interface OpenClawRefreshStatus {
  localSyncStartedAt: string | null
  localSyncFinishedAt: string | null
  latestStoreCatalogedAt: string | null
  latestStorePriceSeenAt: string | null
  piLastScrapeAt: string | null
  piReachable: boolean
}

export async function getOpenClawRefreshStatus(): Promise<OpenClawRefreshStatus> {
  await requireChef()

  // Query local PostgreSQL mirror timestamps in parallel with Pi stats
  const [syncRunResult, storeCatalogedResult, storePriceResult, piStats] = await Promise.all([
    pgClient`
      SELECT started_at, finished_at
      FROM openclaw.sync_runs
      ORDER BY started_at DESC
      LIMIT 1
    `.catch(() => [] as { started_at: unknown; finished_at: unknown }[]),

    pgClient`
      SELECT MAX(last_cataloged_at) AS max_cataloged_at
      FROM openclaw.stores
    `.catch(() => [] as { max_cataloged_at: unknown }[]),

    pgClient`
      SELECT MAX(last_seen_at) AS max_seen_at
      FROM openclaw.store_products
    `.catch(() => [] as { max_seen_at: unknown }[]),

    getOpenClawStatsInternal(),
  ])

  const toIso = (val: unknown): string | null => {
    if (!val) return null
    if (val instanceof Date) return val.toISOString()
    const s = String(val)
    return s === 'null' || s === 'undefined' ? null : s
  }

  const syncRow = syncRunResult[0] as { started_at: unknown; finished_at: unknown } | undefined
  const catalogRow = storeCatalogedResult[0] as { max_cataloged_at: unknown } | undefined
  const priceRow = storePriceResult[0] as { max_seen_at: unknown } | undefined

  return {
    localSyncStartedAt: toIso(syncRow?.started_at),
    localSyncFinishedAt: toIso(syncRow?.finished_at),
    latestStoreCatalogedAt: toIso(catalogRow?.max_cataloged_at),
    latestStorePriceSeenAt: toIso(priceRow?.max_seen_at),
    piLastScrapeAt: piStats?.lastScrapeAt ?? null,
    piReachable: piStats !== null,
  }
}
