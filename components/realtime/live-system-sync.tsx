'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useSSE } from '@/lib/realtime/sse-client'

type LiveSystemSyncProps = {
  tenantId: string | null
  userId: string
  role: 'chef' | 'client'
}

type LiveMessage = {
  event: string
  data?: {
    entity?: string
    action?: string
    reason?: string
    source?: string
    title?: string
  }
}

type SyncState = {
  phase: 'idle' | 'syncing' | 'updated' | 'reconnecting'
  label: string
}

const IGNORED_EVENTS = new Set(['connected', 'presence_sync', 'presence_join', 'presence_leave'])

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function labelFromMessage(message: LiveMessage) {
  if (message.data?.reason) return message.data.reason
  if (message.data?.title) return message.data.title

  const entity = message.data?.entity ? titleCase(message.data.entity) : 'Live data'
  const action = message.data?.action ? titleCase(message.data.action) : titleCase(message.event)

  return `${entity} ${action.toLowerCase()}`
}

export function LiveSystemSync({ tenantId, userId, role }: LiveSystemSyncProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [syncState, setSyncState] = useState<SyncState>({
    phase: 'idle',
    label: 'Live sync active',
  })
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const channels = useMemo(
    () => ({
      tenant: tenantId ? `tenant:${tenantId}` : '',
      user: `user:${userId}`,
      chefLegacy: role === 'chef' && tenantId ? `chef-${tenantId}` : '',
    }),
    [role, tenantId, userId]
  )

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }, [])

  const settleToIdle = useCallback(() => {
    clearIdleTimer()
    idleTimerRef.current = setTimeout(() => {
      setSyncState({ phase: 'idle', label: 'Live sync active' })
    }, 3500)
  }, [clearIdleTimer])

  const reconcile = useCallback(
    (message: LiveMessage) => {
      if (IGNORED_EVENTS.has(message.event)) return

      setSyncState({ phase: 'syncing', label: labelFromMessage(message) })

      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }

      refreshTimerRef.current = setTimeout(() => {
        startTransition(() => {
          router.refresh()
          setSyncState({ phase: 'updated', label: 'Updated just now' })
          settleToIdle()
        })
      }, 150)
    },
    [router, settleToIdle]
  )

  const handleDisconnect = useCallback(() => {
    setSyncState({ phase: 'reconnecting', label: 'Live sync reconnecting' })
  }, [])

  const handleConnect = useCallback(() => {
    setSyncState((current) =>
      current.phase === 'reconnecting'
        ? { phase: 'updated', label: 'Live sync reconnected' }
        : current
    )
    settleToIdle()
  }, [settleToIdle])

  useSSE(channels.tenant, {
    enabled: Boolean(channels.tenant),
    onMessage: reconcile,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
  })

  useSSE(channels.user, {
    enabled: Boolean(channels.user),
    onMessage: reconcile,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
  })

  useSSE(channels.chefLegacy, {
    enabled: Boolean(channels.chefLegacy),
    onMessage: reconcile,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
  })

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      clearIdleTimer()
    }
  }, [clearIdleTimer])

  if (syncState.phase === 'idle' && !isPending) return null

  const dotClass =
    syncState.phase === 'reconnecting'
      ? 'bg-amber-400'
      : syncState.phase === 'updated'
        ? 'bg-emerald-400'
        : 'bg-brand-400'

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-3 left-3 z-50 flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-md border border-stone-700 bg-stone-950/95 px-3 py-2 text-xs text-stone-100 shadow-xl backdrop-blur"
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${dotClass} ${isPending ? 'animate-pulse' : ''}`}
      />
      <span className="min-w-0 truncate">
        {isPending ? 'Applying live update' : syncState.label}
      </span>
    </div>
  )
}
