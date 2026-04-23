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
import { getOpenClawRuntimeHealth } from '@/lib/openclaw/health-contract'

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
  const health = await getOpenClawRuntimeHealth()

  return {
    localSyncStartedAt: health.mirror.lastRunStartedAt,
    localSyncFinishedAt: health.mirror.lastRunFinishedAt,
    latestStoreCatalogedAt: health.mirror.latestStoreCatalogedAt,
    latestStorePriceSeenAt: health.mirror.latestStorePriceSeenAt,
    piLastScrapeAt: health.pi.lastScrapeAt,
    piReachable: health.pi.reachable,
  }
}
