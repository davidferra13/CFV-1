'use client'

import { useState, useEffect } from 'react'

function formatIdleTime(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) {
    const remainHours = hours % 24
    return remainHours > 0 ? `${days}d ${remainHours}h` : `${days}d`
  }
  const weeks = Math.floor(days / 7)
  return `${weeks}w`
}

export function IdleTimeIndicator({ updatedAt, status }: { updatedAt: string; status: string }) {
  // Only show for statuses needing chef action
  if (status !== 'new' && status !== 'awaiting_chef') return null

  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  const idleMs = now - new Date(updatedAt).getTime()
  const hours = idleMs / (1000 * 60 * 60)

  // Color escalation based on urgency
  const color =
    hours >= 168
      ? 'text-red-500 font-bold animate-pulse'
      : hours >= 48
        ? 'text-red-400 font-bold'
        : hours >= 24
          ? 'text-orange-400'
          : hours >= 12
            ? 'text-amber-400'
            : 'text-emerald-400'

  return (
    <span
      className={`text-xs ${color}`}
      title={`Idle since ${new Date(updatedAt).toLocaleString()}`}
    >
      {formatIdleTime(idleMs)} idle
    </span>
  )
}
