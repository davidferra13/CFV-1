'use client'

import { useState, useTransition } from 'react'
import { triggerGmailSync } from '@/lib/gmail/actions'
import { formatDistanceToNow } from 'date-fns'

type Props = {
  connected: boolean
  lastSyncedAt: string | null
  errorCount?: number
}

const STALE_AMBER_MINUTES = 30
const STALE_RED_MINUTES = 60

function getSyncHealth(lastSyncedAt: string | null): {
  color: string
  dotClass: string
  warning: string | null
} {
  if (!lastSyncedAt) {
    return {
      color: 'text-red-400',
      dotClass: 'bg-red-500 animate-pulse',
      warning: 'Never synced. Inquiries are not flowing in.',
    }
  }

  const minutesAgo = (Date.now() - new Date(lastSyncedAt).getTime()) / 60_000

  if (minutesAgo >= STALE_RED_MINUTES) {
    return {
      color: 'text-red-400',
      dotClass: 'bg-red-500 animate-pulse',
      warning: 'Sync may be broken. New inquiries could be missed.',
    }
  }

  if (minutesAgo >= STALE_AMBER_MINUTES) {
    return {
      color: 'text-amber-500',
      dotClass: 'bg-amber-500',
      warning: 'Sync is delayed. Try syncing manually.',
    }
  }

  return { color: 'text-stone-500', dotClass: 'bg-emerald-500', warning: null }
}

export function GmailSyncStrip({ connected, lastSyncedAt, errorCount }: Props) {
  const [isPending, startTransition] = useTransition()
  const [syncedAt, setSyncedAt] = useState<string | null>(lastSyncedAt)
  const [error, setError] = useState<string | null>(null)

  if (!connected) {
    return (
      <div className="flex items-center gap-2 text-xs text-red-400">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        Gmail not connected. Inquiries are not being captured.
        <a href="/settings/account" className="text-brand-400 hover:underline font-medium">
          Connect now
        </a>
      </div>
    )
  }

  const health = getSyncHealth(syncedAt)
  const hasErrors = (errorCount ?? 0) > 0

  function handleSync() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await triggerGmailSync()
        setSyncedAt(new Date().toISOString())
        if (result.errors?.length) {
          setError(`Synced with ${result.errors.length} error(s)`)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sync failed')
      }
    })
  }

  const lastSyncLabel = syncedAt
    ? `synced ${formatDistanceToNow(new Date(syncedAt), { addSuffix: true })}`
    : 'never synced'

  return (
    <div className="flex items-center gap-2 text-xs text-stone-500">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${health.dotClass}`} />
      <span className={health.warning ? health.color : undefined}>Gmail: {lastSyncLabel}</span>
      {health.warning && <span className={`${health.color} font-medium`}>{health.warning}</span>}
      {hasErrors && !health.warning && (
        <span className="text-amber-500">
          ({errorCount} sync error{errorCount === 1 ? '' : 's'})
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={isPending}
        className={`hover:underline disabled:opacity-50 disabled:pointer-events-none ${
          health.warning ? 'text-brand-400 font-medium' : 'text-brand-400 hover:text-brand-300'
        }`}
      >
        {isPending ? 'Syncing...' : 'Sync now'}
      </button>
      {error && <span className="text-red-400">{error}</span>}
    </div>
  )
}
