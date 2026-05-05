'use client'

/**
 * Pi Bridge Health Indicator
 * Small status dot showing whether the Pi price bridge is live, degraded, or offline.
 * Polls every 60 seconds.
 */

import { useEffect, useState } from 'react'

type BridgeStatus = 'closed' | 'open' | 'half_open'

interface BridgeHealth {
  status: BridgeStatus
  failures: number
  lastFailure: number | null
  lastSuccess: number | null
}

function statusColor(status: BridgeStatus): string {
  switch (status) {
    case 'closed':
      return 'bg-emerald-500'
    case 'half_open':
      return 'bg-amber-500'
    case 'open':
      return 'bg-red-500'
  }
}

function statusLabel(status: BridgeStatus): string {
  switch (status) {
    case 'closed':
      return 'Market data: live'
    case 'half_open':
      return 'Market data: reconnecting'
    case 'open':
      return 'Market data: offline'
  }
}

function timeAgo(ts: number | null): string {
  if (!ts) return 'never'
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function BridgeHealthDot() {
  const [health, setHealth] = useState<BridgeHealth | null>(null)

  useEffect(() => {
    let mounted = true

    async function poll() {
      try {
        const res = await fetch('/api/pricing/bridge-health')
        if (res.ok && mounted) {
          setHealth(await res.json())
        }
      } catch {
        // Silently degrade
      }
    }

    poll()
    const interval = setInterval(poll, 60_000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  if (!health) return null

  const tooltip = [
    statusLabel(health.status),
    health.failures > 0 ? `${health.failures} failures` : null,
    `Last success: ${timeAgo(health.lastSuccess)}`,
    health.lastFailure ? `Last failure: ${timeAgo(health.lastFailure)}` : null,
  ]
    .filter(Boolean)
    .join(' | ')

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-stone-400" title={tooltip}>
      <span className={`inline-block w-2 h-2 rounded-full ${statusColor(health.status)}`} />
      <span className="hidden sm:inline">{statusLabel(health.status)}</span>
    </span>
  )
}
