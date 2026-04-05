'use client'

import { useState, useCallback } from 'react'
import { useSSE } from '@/lib/realtime/sse-client'
import { Badge } from '@/components/ui/badge'

type SyncState = {
  label: string
  variant: 'success' | 'warning' | 'error' | 'default' | 'info'
  dotColor: string
  flash: boolean
}

function getStaleness(lastSyncTime: number | null): SyncState {
  if (!lastSyncTime) {
    return {
      label: 'No sync data',
      variant: 'default',
      dotColor: 'bg-stone-500',
      flash: false,
    }
  }

  const hoursAgo = (Date.now() - lastSyncTime) / (1000 * 60 * 60)

  if (hoursAgo < 12) {
    return {
      label: 'Pipeline current',
      variant: 'success',
      dotColor: 'bg-green-400',
      flash: false,
    }
  }
  if (hoursAgo < 24) {
    return {
      label: 'Sync stale',
      variant: 'warning',
      dotColor: 'bg-yellow-400',
      flash: false,
    }
  }
  return {
    label: 'Sync overdue',
    variant: 'error',
    dotColor: 'bg-red-400',
    flash: false,
  }
}

/**
 * Compact badge that shows OpenClaw pipeline sync status.
 * Subscribes to openclaw:status SSE channel. Admin-only (caller gates).
 * Green = recent sync, yellow = stale (>12h), red = very stale (>24h).
 */
export function PipelineStatusBadge() {
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)
  const [flashMessage, setFlashMessage] = useState<string | null>(null)

  const handleMessage = useCallback((msg: { event: string; data: any; timestamp: number }) => {
    if (msg.event === 'sync_complete') {
      setLastSyncTime(Date.now())
      setFlashMessage(
        `Synced: ${msg.data.updatedPrices ?? 0} prices, ${msg.data.priceChanges ?? 0} changes`
      )
      setTimeout(() => setFlashMessage(null), 6000)
    }

    if (msg.event === 'sync_ready') {
      setFlashMessage(
        `New data available: ${msg.data.newPrices ?? 0} prices, ${msg.data.priceChanges ?? 0} changes`
      )
      setTimeout(() => setFlashMessage(null), 8000)
    }

    if (msg.event === 'docket_complete') {
      // Minor event; just update the sync timestamp
      setLastSyncTime(Date.now())
    }
  }, [])

  useSSE('openclaw:status', { onMessage: handleMessage })

  const state = getStaleness(lastSyncTime)

  return (
    <div className="inline-flex items-center gap-1.5">
      <Badge variant={flashMessage ? 'info' : state.variant}>
        <span className="flex items-center gap-1.5">
          <span
            className={`inline-block h-2 w-2 rounded-full ${flashMessage ? 'bg-blue-400 animate-pulse' : state.dotColor}`}
          />
          <span className="text-xs">{flashMessage || state.label}</span>
        </span>
      </Badge>
    </div>
  )
}
