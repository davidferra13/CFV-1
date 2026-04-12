'use client'

// QuoteExpiryCountdown
// Shows a live countdown for pending quotes. Updates every minute.
// Color escalates: neutral -> amber (<48h) -> red (<24h) -> expired

import { useState, useEffect } from 'react'
import { differenceInSeconds, formatDuration, intervalToDuration } from 'date-fns'

function getUrgency(secondsLeft: number): 'ok' | 'soon' | 'urgent' | 'expired' {
  if (secondsLeft <= 0) return 'expired'
  if (secondsLeft < 60 * 60 * 24) return 'urgent'
  if (secondsLeft < 60 * 60 * 48) return 'soon'
  return 'ok'
}

function formatTimeLeft(secondsLeft: number): string {
  if (secondsLeft <= 0) return 'Expired'
  const duration = intervalToDuration({ start: 0, end: secondsLeft * 1000 })
  if (secondsLeft < 60 * 60) {
    return `${Math.ceil(secondsLeft / 60)} min`
  }
  if (secondsLeft < 60 * 60 * 24) {
    const h = Math.floor(secondsLeft / 3600)
    const m = Math.floor((secondsLeft % 3600) / 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  const days = duration.days ?? 0
  const hours = duration.hours ?? 0
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`
}

const URGENCY_CLASSES: Record<ReturnType<typeof getUrgency>, string> = {
  ok: 'text-stone-400',
  soon: 'text-amber-400',
  urgent: 'text-red-400 font-semibold',
  expired: 'text-red-500 line-through',
}

export function QuoteExpiryCountdown({ validUntil }: { validUntil: string }) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    differenceInSeconds(new Date(validUntil), new Date())
  )

  useEffect(() => {
    const tick = () => setSecondsLeft(differenceInSeconds(new Date(validUntil), new Date()))
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [validUntil])

  const urgency = getUrgency(secondsLeft)
  const label = secondsLeft <= 0 ? 'Expired' : `Expires in ${formatTimeLeft(secondsLeft)}`

  return (
    <span className={`text-xs ${URGENCY_CLASSES[urgency]}`}>
      {urgency === 'urgent' && secondsLeft > 0 && (
        <span className="mr-1" aria-hidden>
          ⚠
        </span>
      )}
      {label}
    </span>
  )
}
