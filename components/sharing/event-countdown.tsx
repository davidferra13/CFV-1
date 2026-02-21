'use client'

import { useState, useEffect } from 'react'

type Props = {
  eventDate: string // YYYY-MM-DD
  serveTime?: string | null // HH:MM:SS
}

export function EventCountdown({ eventDate, serveTime }: Props) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  } | null>(null)
  const [isPast, setIsPast] = useState(false)

  useEffect(() => {
    function calculate() {
      const timeStr = serveTime ? serveTime.slice(0, 5) : '18:00'
      const target = new Date(`${eventDate}T${timeStr}:00`)
      const now = new Date()
      const diff = target.getTime() - now.getTime()

      if (diff <= 0) {
        setIsPast(true)
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds })
    }

    calculate()
    const interval = setInterval(calculate, 1000)
    return () => clearInterval(interval)
  }, [eventDate, serveTime])

  if (isPast || !timeLeft) return null

  const units = [
    { value: timeLeft.days, label: 'days' },
    { value: timeLeft.hours, label: 'hrs' },
    { value: timeLeft.minutes, label: 'min' },
    { value: timeLeft.seconds, label: 'sec' },
  ]

  return (
    <div className="text-center py-4">
      <p className="text-sm text-stone-500 mb-3 uppercase tracking-wider font-medium">
        Countdown to dinner
      </p>
      <div className="flex justify-center gap-3">
        {units.map((unit) => (
          <div key={unit.label} className="text-center">
            <div className="w-16 h-16 rounded-xl bg-stone-900 text-white flex items-center justify-center">
              <span className="text-2xl font-bold tabular-nums">{unit.value}</span>
            </div>
            <p className="text-xs text-stone-500 mt-1 uppercase">{unit.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
