/**
 * OpenClaw Refresh Status Component
 * Shared informational surface for chef-facing pricing pages.
 * Shows last-known timestamps for local mirror and Pi live catalog.
 *
 * Rules (from openclaw-refresh-status-badge spec):
 * - Badge represents truth availability: Verified / Degraded / Unknown
 * - Badge does NOT imply freshness health based on elapsed time alone
 * - All copy is neutral and must not name OpenClaw
 * - Show exact local timestamp + relative helper (relative alone is not enough)
 * - No user interaction in v1 (read-only, server-rendered)
 */

import type { OpenClawRefreshStatus } from '@/lib/openclaw/refresh-status-actions'

type BadgeState = 'verified' | 'degraded' | 'unknown'

function badge(state: BadgeState) {
  const map = {
    verified: { label: 'Verified', className: 'bg-stone-800 text-stone-300 border-stone-700' },
    degraded: { label: 'Degraded', className: 'bg-amber-950 text-amber-400 border-amber-800' },
    unknown: { label: 'Unknown', className: 'bg-stone-900 text-stone-500 border-stone-800' },
  }
  return map[state]
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatExact(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

interface Props {
  status: OpenClawRefreshStatus
  /** 'local-mirror' shows local PostgreSQL pull timing. 'live-catalog' shows Pi scrape timing. */
  variant: 'local-mirror' | 'live-catalog'
}

export function OpenClawRefreshStatus({ status, variant }: Props) {
  if (variant === 'local-mirror') {
    const primaryTs = status.localSyncFinishedAt ?? status.localSyncStartedAt
    const badgeState: BadgeState = primaryTs ? 'verified' : 'unknown'
    const b = badge(badgeState)

    return (
      <div className="rounded-lg border border-stone-800 bg-stone-900/60 px-4 py-3 text-xs space-y-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border ${b.className}`}
          >
            {b.label}
          </span>
          <span className="font-medium text-stone-300">Local mirror status</span>
          <span className="text-stone-600">Source: local price mirror</span>
        </div>

        {primaryTs ? (
          <div className="text-stone-400">
            Last local pull:{' '}
            <span className="text-stone-300 font-medium">{formatExact(primaryTs)}</span>
            <span className="text-stone-500 ml-1">({timeAgo(primaryTs)})</span>
            {status.localSyncFinishedAt === null && status.localSyncStartedAt && (
              <span className="text-amber-500 ml-1">(pull started, finish time unavailable)</span>
            )}
          </div>
        ) : (
          <p className="text-stone-500">No refresh data yet.</p>
        )}

        {status.latestStoreCatalogedAt && (
          <div className="text-stone-500">
            Latest store catalog seen:{' '}
            <span className="text-stone-400">{formatExact(status.latestStoreCatalogedAt)}</span>
            <span className="ml-1">({timeAgo(status.latestStoreCatalogedAt)})</span>
          </div>
        )}

        {status.latestStorePriceSeenAt && (
          <div className="text-stone-500">
            Latest store price seen:{' '}
            <span className="text-stone-400">{formatExact(status.latestStorePriceSeenAt)}</span>
            <span className="ml-1">({timeAgo(status.latestStorePriceSeenAt)})</span>
          </div>
        )}

        <p className="text-stone-600">
          Updates on page load or when you run a new search. This page does not live-auto-refresh.
        </p>
      </div>
    )
  }

  // live-catalog variant: show Pi scrape timing
  const primaryTs = status.piLastScrapeAt
  let badgeState: BadgeState = 'unknown'
  if (!status.piReachable) {
    badgeState = 'degraded'
  } else if (primaryTs) {
    badgeState = 'verified'
  }
  const b = badge(badgeState)

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900/60 px-4 py-3 text-xs space-y-2">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border ${b.className}`}
        >
          {b.label}
        </span>
        <span className="font-medium text-stone-300">Live catalog status</span>
        <span className="text-stone-600">Source: live catalog scrape</span>
      </div>

      {!status.piReachable && <p className="text-amber-500">Live catalog status unavailable.</p>}

      {primaryTs ? (
        <div className="text-stone-400">
          Last catalog scrape:{' '}
          <span className="text-stone-300 font-medium">{formatExact(primaryTs)}</span>
          <span className="text-stone-500 ml-1">({timeAgo(primaryTs)})</span>
        </div>
      ) : !status.piReachable ? null : (
        <p className="text-stone-500">No scrape data yet.</p>
      )}

      {/* Show local mirror as secondary cross-reference, clearly labeled */}
      {status.localSyncFinishedAt && (
        <div className="text-stone-600 border-t border-stone-800 pt-1.5 mt-1">
          Local mirror reference:{' '}
          <span className="text-stone-500">{formatExact(status.localSyncFinishedAt)}</span>
          <span className="ml-1">({timeAgo(status.localSyncFinishedAt)})</span>
          <span className="ml-1 text-stone-700">(local mirror, separate pipeline)</span>
        </div>
      )}

      <p className="text-stone-600">
        Catalog results load on search and reload. This page does not live-auto-refresh.
      </p>
    </div>
  )
}
