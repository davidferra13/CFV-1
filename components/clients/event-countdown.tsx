'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CalendarDays, Clock } from 'lucide-react'

type Props = {
  eventName: string
  eventDate: string
  status: string
  countdownEnabled: boolean
}

function computeCountdown(eventDate: string) {
  const now = new Date()
  const target = new Date(eventDate)
  const diff = target.getTime() - now.getTime()

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, isPast: true }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return { days, hours, minutes, isPast: false }
}

export function EventCountdown({ eventName, eventDate, status, countdownEnabled }: Props) {
  const [countdown, setCountdown] = useState(computeCountdown(eventDate))

  useEffect(() => {
    if (!countdownEnabled) return
    const interval = setInterval(() => {
      setCountdown(computeCountdown(eventDate))
    }, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [eventDate, countdownEnabled])

  if (!countdownEnabled) return null

  const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Card className="bg-gradient-to-br from-brand-50 to-white border-brand-200">
      <CardContent className="py-6 text-center">
        <CalendarDays className="h-8 w-8 text-brand-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-stone-900 mb-1">{eventName}</h3>
        <p className="text-sm text-stone-500 mb-4">{formattedDate}</p>

        {countdown.isPast ? (
          <div className="text-sm text-stone-500">Event has started or passed</div>
        ) : (
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-brand-600">{countdown.days}</p>
              <p className="text-xs text-stone-500 uppercase">Days</p>
            </div>
            <span className="text-2xl text-stone-300">:</span>
            <div className="text-center">
              <p className="text-3xl font-bold text-brand-600">{countdown.hours}</p>
              <p className="text-xs text-stone-500 uppercase">Hours</p>
            </div>
            <span className="text-2xl text-stone-300">:</span>
            <div className="text-center">
              <p className="text-3xl font-bold text-brand-600">{countdown.minutes}</p>
              <p className="text-xs text-stone-500 uppercase">Minutes</p>
            </div>
          </div>
        )}

        <p className="text-xs text-stone-400 mt-3">Status: {status}</p>
      </CardContent>
    </Card>
  )
}
