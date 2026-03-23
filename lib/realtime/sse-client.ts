'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

type SSEMessage = {
  event: string
  data: any
  timestamp: number
}

type UseSSEOptions = {
  onMessage?: (msg: SSEMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  enabled?: boolean
}

export function useSSE(channel: string, options: UseSSEOptions) {
  const { onMessage, onConnect, onDisconnect, enabled = true } = options
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onMessageRef = useRef(onMessage)
  const onConnectRef = useRef(onConnect)
  const onDisconnectRef = useRef(onDisconnect)

  // Keep refs current without triggering reconnect
  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])
  useEffect(() => {
    onConnectRef.current = onConnect
  }, [onConnect])
  useEffect(() => {
    onDisconnectRef.current = onDisconnect
  }, [onDisconnect])

  useEffect(() => {
    if (!enabled || !channel) return

    let isCancelled = false

    function connect() {
      if (isCancelled) return

      const es = new EventSource(`/api/realtime/${encodeURIComponent(channel)}`)
      eventSourceRef.current = es

      es.onopen = () => {
        onConnectRef.current?.()
      }

      es.onmessage = (e) => {
        try {
          const msg: SSEMessage = JSON.parse(e.data)
          onMessageRef.current?.(msg)
        } catch {
          // Ignore parse errors (heartbeats, etc.)
        }
      }

      es.onerror = () => {
        es.close()
        eventSourceRef.current = null
        onDisconnectRef.current?.()

        if (!isCancelled) {
          // Reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(connect, 3000)
        }
      }
    }

    connect()

    return () => {
      isCancelled = true
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [channel, enabled])

  const close = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  return { close }
}

// Convenience hook for presence
export function useSSEPresence(channel: string) {
  const [presenceState, setPresenceState] = useState<Record<string, any>>({})

  const { close } = useSSE(`presence:${channel}`, {
    onMessage: (msg) => {
      if (msg.event === 'presence_sync') {
        setPresenceState(msg.data)
      } else if (msg.event === 'presence_join') {
        setPresenceState((prev) => ({ ...prev, [msg.data.sessionId]: msg.data }))
      } else if (msg.event === 'presence_leave') {
        setPresenceState((prev) => {
          const next = { ...prev }
          delete next[msg.data.sessionId]
          return next
        })
      }
    },
  })

  return { presenceState, close }
}
