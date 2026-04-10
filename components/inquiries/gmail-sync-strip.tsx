'use client'

import { useState, useTransition } from 'react'
import { triggerGmailSync } from '@/lib/gmail/actions'
import { formatDistanceToNow } from 'date-fns'

type Props = {
  connected: boolean
  lastSyncedAt: string | null
}

export function GmailSyncStrip({ connected, lastSyncedAt }: Props) {
  const [isPending, startTransition] = useTransition()
  const [syncedAt, setSyncedAt] = useState<string | null>(lastSyncedAt)
  const [error, setError] = useState<string | null>(null)

  if (!connected) {
    return (
      <div className="flex items-center gap-2 text-xs text-stone-500">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-stone-400" />
        Gmail not connected
        <a href="/settings/account" className="text-brand-400 hover:underline">
          Connect
        </a>
      </div>
    )
  }

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
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
      <span>Gmail: {lastSyncLabel}</span>
      <button
        onClick={handleSync}
        disabled={isPending}
        className="text-brand-400 hover:text-brand-300 hover:underline disabled:opacity-50 disabled:pointer-events-none"
      >
        {isPending ? 'Syncing...' : 'Sync now'}
      </button>
      {error && <span className="text-red-400">{error}</span>}
    </div>
  )
}
