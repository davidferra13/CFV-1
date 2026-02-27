'use client'

import { useEffect, useRef, useState } from 'react'

interface HeartbeatProviderProps {
  token: string | null
  onDeviceDisabled: () => void
  children: React.ReactNode
}

const MAX_CONSECUTIVE_FAILURES = 5

export function HeartbeatProvider({ token, onDeviceDisabled, children }: HeartbeatProviderProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const failureCountRef = useRef(0)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    if (!token) return

    async function sendHeartbeat() {
      try {
        const res = await fetch('/api/kiosk/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_route: window.location.pathname,
            app_version: '1.0.0',
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          if (data.status === 'revoked' || res.status === 401) {
            onDeviceDisabled()
          }
          return
        }

        // Success — reset failure counter
        failureCountRef.current = 0
        setOffline(false)

        const data = await res.json()
        if (data.status === 'disabled' || data.status === 'revoked') {
          onDeviceDisabled()
        }
      } catch {
        // Network error — track consecutive failures
        failureCountRef.current++
        if (failureCountRef.current >= MAX_CONSECUTIVE_FAILURES) {
          setOffline(true)
        }
      }
    }

    // Send first heartbeat immediately
    sendHeartbeat()

    // Then every 30 seconds
    intervalRef.current = setInterval(sendHeartbeat, 30000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [token, onDeviceDisabled])

  return (
    <>
      {offline && (
        <div className="fixed inset-x-0 top-0 z-50 bg-red-900/90 px-4 py-2 text-center text-sm font-medium text-red-100">
          Connection lost — submissions may fail until reconnected
        </div>
      )}
      {children}
    </>
  )
}
