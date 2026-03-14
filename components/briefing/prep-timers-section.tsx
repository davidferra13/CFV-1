'use client'

// Prep Timers Section (Phase 5)
// Shows active prep timers with countdowns. Used in Morning Briefing.

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { completePrepTimer } from '@/lib/prep/actions'

type Timer = {
  id: string
  title: string
  end_at: string
  station_name: string | null
  event_title: string | null
  status: string
}

type Props = {
  timers: Timer[]
}

function formatCountdown(endAt: string): string {
  const now = Date.now()
  const end = new Date(endAt).getTime()
  const diff = end - now

  if (diff <= 0) return 'Ready now'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) return `${hours}h ${minutes}m remaining`
  return `${minutes}m remaining`
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function isReady(endAt: string): boolean {
  return new Date(endAt).getTime() <= Date.now()
}

function isApproaching(endAt: string, minutesBefore = 30): boolean {
  const diff = new Date(endAt).getTime() - Date.now()
  return diff > 0 && diff <= minutesBefore * 60 * 1000
}

function TimerCard({ timer }: { timer: Timer }) {
  const router = useRouter()
  const [countdown, setCountdown] = useState(formatCountdown(timer.end_at))
  const [isPending, startTransition] = useTransition()

  // Update countdown every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(formatCountdown(timer.end_at))
    }, 30000)
    return () => clearInterval(interval)
  }, [timer.end_at])

  const ready = isReady(timer.end_at)
  const approaching = isApproaching(timer.end_at)

  function handleComplete() {
    startTransition(async () => {
      try {
        await completePrepTimer(timer.id)
        router.refresh()
      } catch (err) {
        console.error('Failed to complete timer:', err)
      }
    })
  }

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 flex items-center justify-between ${
        ready
          ? 'bg-emerald-950/30 border-emerald-900/40'
          : approaching
            ? 'bg-amber-950/30 border-amber-900/40'
            : 'bg-stone-800/50 border-stone-700'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-stone-100">{timer.title}</span>
          {ready && (
            <Badge variant="success" className="text-[10px]">
              Ready
            </Badge>
          )}
          {approaching && !ready && (
            <Badge variant="warning" className="text-[10px]">
              Soon
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-500">
          <span
            className={ready ? 'text-emerald-400 font-medium' : approaching ? 'text-amber-400' : ''}
          >
            {countdown}
          </span>
          <span>&middot; Done at {formatTime(timer.end_at)}</span>
          {timer.station_name && <span>&middot; {timer.station_name}</span>}
        </div>
      </div>
      {ready && (
        <Button size="sm" variant="ghost" onClick={handleComplete} disabled={isPending}>
          {isPending ? '...' : 'Done'}
        </Button>
      )}
    </div>
  )
}

export function PrepTimersSection({ timers }: Props) {
  if (timers.length === 0) return null

  return (
    <section>
      <h2 className="text-base font-semibold text-stone-200 mb-3">
        Prep Timers
        <Badge variant="info" className="ml-2 text-[10px]">
          {timers.length}
        </Badge>
      </h2>
      <div className="space-y-2">
        {timers.map((timer) => (
          <TimerCard key={timer.id} timer={timer} />
        ))}
      </div>
    </section>
  )
}
