'use client'

import { useState, useEffect } from 'react'

interface ElapsedTimerProps {
  /** ISO timestamp when the current step became active (previous step's completedAt, or start time) */
  startedAt: string | null
  className?: string
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}:${String(remainingMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function ElapsedTimer({ startedAt, className = '' }: ElapsedTimerProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startedAt) return

    const start = new Date(startedAt).getTime()

    function tick() {
      setElapsed(Date.now() - start)
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  if (!startedAt) return null

  return (
    <div className={`font-mono tabular-nums ${className}`}>
      {formatElapsed(elapsed)}
    </div>
  )
}
