'use client'

// DashboardHeartbeat - Live activity indicator for the chef dashboard.
// Pulsing dot + "Updated X ago". Subscribes to SSE channels for inquiries,
// events, and messages. Triggers a soft refresh on activity.

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSSE } from '@/lib/realtime/sse-client'
import { useRouter } from 'next/navigation'

type Props = {
  tenantId: string
}

function timeAgo(ms: number): string {
  const secs = Math.floor(ms / 1000)
  if (secs < 5) return 'just now'
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ago`
}

function eventLabel(event: string): string | null {
  if (event.includes('inquiry')) return 'New inquiry'
  if (event.includes('message')) return 'New message'
  if (event.includes('quote')) return 'Quote update'
  if (event.includes('invoice') || event.includes('payment')) return 'Payment received'
  if (event === 'INSERT' || event === 'UPDATE' || event === 'DELETE') return 'Updated'
  return null
}

type ActivityEvent = { label: string; at: number }

function useTableSSE(table: string, tenantId: string, onActivity: (label: string) => void) {
  useSSE(`${table}:${tenantId}`, {
    onMessage: useCallback(
      (msg: { event: string; data: unknown; timestamp: number }) => {
        const label = eventLabel(msg.event) ?? eventLabel(table)
        if (label) onActivity(label)
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [table, tenantId, onActivity]
    ),
  })
}

export function DashboardHeartbeat({ tenantId }: Props) {
  const [lastActivity, setLastActivity] = useState<ActivityEvent | null>(null)
  const [pulse, setPulse] = useState(false)
  const [, setTick] = useState(0)
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  // Tick every 15s to keep "X ago" text fresh
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 15_000)
    return () => clearInterval(id)
  }, [])

  // Auto-refresh every 90s so data never goes stale
  useEffect(() => {
    const id = setInterval(() => {
      router.refresh()
      setLastActivity({ label: 'Refreshed', at: Date.now() })
      setPulse(true)
      setTimeout(() => setPulse(false), 1500)
    }, 90_000)
    return () => clearInterval(id)
  }, [router])

  const triggerPulse = useCallback(
    (label: string) => {
      setLastActivity({ label, at: Date.now() })
      setPulse(true)
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
      pulseTimerRef.current = setTimeout(() => setPulse(false), 2000)
      router.refresh()
    },
    [router]
  )

  // Watch the tables that matter most on the dashboard
  useTableSSE('inquiries', tenantId, triggerPulse)
  useTableSSE('events', tenantId, triggerPulse)
  useTableSSE('conversations', tenantId, triggerPulse)
  useTableSSE('quotes', tenantId, triggerPulse)

  return (
    <div
      className="flex items-center gap-1.5 text-xs text-stone-500 select-none"
      title="Live dashboard"
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full transition-all duration-500 ${
          pulse ? 'bg-emerald-400 scale-150 shadow-[0_0_6px_#34d399]' : 'bg-stone-600'
        }`}
        aria-hidden="true"
      />
      {lastActivity ? (
        <span className="tabular-nums">
          {lastActivity.label} {timeAgo(Date.now() - lastActivity.at)}
        </span>
      ) : (
        <span>Live</span>
      )}
    </div>
  )
}
