'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type HeartbeatState = 'alive' | 'slow' | 'dead' | 'loading'

const POLL_INTERVAL_MS = 30_000
const SLOW_THRESHOLD_MS = 2_000

function isDocumentHidden() {
  return document.visibilityState === 'hidden'
}

export function SystemHeartbeat({ collapsed }: { collapsed?: boolean }) {
  const [state, setState] = useState<HeartbeatState>('loading')
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const check = useCallback(async () => {
    if (isDocumentHidden()) return

    const t0 = performance.now()
    try {
      const res = await fetch('/api/health', { cache: 'no-store' })
      const elapsed = Math.round(performance.now() - t0)
      if (isDocumentHidden()) return

      setLatencyMs(elapsed)
      setLastCheck(new Date())
      if (res.ok) {
        setState(elapsed > SLOW_THRESHOLD_MS ? 'slow' : 'alive')
      } else {
        setState('slow')
      }
    } catch {
      if (isDocumentHidden()) return

      setState('dead')
      setLastCheck(new Date())
      setLatencyMs(null)
    }
  }, [])

  useEffect(() => {
    const clearTimers = () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (tickRef.current) clearInterval(tickRef.current)
      timerRef.current = null
      tickRef.current = null
    }

    const startTimers = () => {
      if (isDocumentHidden() || timerRef.current || tickRef.current) return

      void check()
      timerRef.current = setInterval(() => void check(), POLL_INTERVAL_MS)
      // Tick the "ago" display every 10s
      tickRef.current = setInterval(() => setNow(Date.now()), 10_000)
    }

    const handleVisibilityChange = () => {
      if (isDocumentHidden()) {
        clearTimers()
      } else {
        setNow(Date.now())
        startTimers()
      }
    }

    startTimers()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearTimers()
    }
  }, [check])

  const ago = lastCheck ? formatAgo(now - lastCheck.getTime()) : null

  const dotColor =
    state === 'alive'
      ? 'bg-emerald-400'
      : state === 'slow'
        ? 'bg-amber-400'
        : state === 'dead'
          ? 'bg-red-400'
          : 'bg-stone-500'

  const pulseColor =
    state === 'alive'
      ? 'bg-emerald-400/40'
      : state === 'slow'
        ? 'bg-amber-400/40'
        : 'bg-transparent'

  const label =
    state === 'alive'
      ? 'System active'
      : state === 'slow'
        ? 'System slow'
        : state === 'dead'
          ? 'System unreachable'
          : 'Checking...'

  const tooltip = [
    label,
    ago ? `Last check: ${ago}` : null,
    latencyMs != null ? `Response: ${latencyMs}ms` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <div
      className={`flex items-center justify-center flex-shrink-0 ${
        collapsed ? 'w-10 h-10' : 'w-8 h-8'
      }`}
      title={tooltip}
      aria-label={label}
    >
      <span className="relative flex items-center justify-center w-4 h-4">
        {/* Pulse ring - only when alive or slow */}
        {(state === 'alive' || state === 'slow') && (
          <span
            className={`absolute inset-0 rounded-full animate-ping ${pulseColor}`}
            style={{ animationDuration: '3s' }}
          />
        )}
        {/* Core dot */}
        <span
          className={`relative block w-1.5 h-1.5 rounded-full ${dotColor} transition-colors duration-500`}
        />
      </span>
    </div>
  )
}

function formatAgo(ms: number): string {
  const sec = Math.floor(ms / 1000)
  if (sec < 5) return 'just now'
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  return `${Math.floor(min / 60)}h ago`
}
