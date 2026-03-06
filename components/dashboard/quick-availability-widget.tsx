'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, CheckCircle, XCircle, CalendarPlus } from '@/components/ui/icons'
import Link from 'next/link'

interface QuickAvailabilityWidgetProps {
  bookedDates: string[] // array of YYYY-MM-DD strings with confirmed events
  tentativeDates: string[] // dates with draft/proposed events
}

type AvailabilityStatus = 'available' | 'booked' | 'tentative' | null

export function QuickAvailabilityWidget({
  bookedDates,
  tentativeDates,
}: QuickAvailabilityWidgetProps) {
  const [selectedDate, setSelectedDate] = useState('')
  const [status, setStatus] = useState<AvailabilityStatus>(null)

  const bookedSet = new Set(bookedDates)
  const tentativeSet = new Set(tentativeDates)

  function checkDate(dateStr: string) {
    setSelectedDate(dateStr)
    if (!dateStr) {
      setStatus(null)
      return
    }
    if (bookedSet.has(dateStr)) {
      setStatus('booked')
    } else if (tentativeSet.has(dateStr)) {
      setStatus('tentative')
    } else {
      setStatus('available')
    }
  }

  function getNextAvailableDates(fromDate: string, count: number): string[] {
    const results: string[] = []
    const d = new Date(fromDate + 'T00:00:00')
    // Start from the day after the selected date
    d.setDate(d.getDate() + 1)

    // Search up to 60 days ahead
    for (let i = 0; i < 60 && results.length < count; i++) {
      const iso = d.toISOString().split('T')[0]
      if (!bookedSet.has(iso) && !tentativeSet.has(iso)) {
        results.push(iso)
      }
      d.setDate(d.getDate() + 1)
    }
    return results
  }

  function formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const today = new Date().toISOString().split('T')[0]
  const nextAvailable =
    status === 'booked' || status === 'tentative' ? getNextAvailableDates(selectedDate, 3) : []

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-4 w-4 text-stone-400" />
        <h3 className="text-sm font-semibold text-stone-100">Availability Check</h3>
      </div>

      <div className="mb-3">
        <input
          type="date"
          value={selectedDate}
          min={today}
          onChange={(e) => checkDate(e.target.value)}
          className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {status === 'available' && (
        <div className="rounded-lg border border-green-800 bg-green-950/50 px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-400" weight="fill" />
            <span className="text-sm font-semibold text-green-300">Available</span>
          </div>
          <p className="text-xs text-green-400/80 mb-2">
            No events scheduled for {formatDateLabel(selectedDate)}
          </p>
          <Link href={`/events/new?date=${selectedDate}`}>
            <Button
              variant="ghost"
              className="h-7 px-2 text-xs text-green-300 hover:bg-green-900/50"
            >
              <CalendarPlus className="h-3.5 w-3.5 mr-1" />
              Create event on this date
            </Button>
          </Link>
        </div>
      )}

      {status === 'booked' && (
        <div className="space-y-3">
          <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="h-4 w-4 text-red-400" weight="fill" />
              <span className="text-sm font-semibold text-red-300">Booked</span>
            </div>
            <p className="text-xs text-red-400/80">
              You have a confirmed event on {formatDateLabel(selectedDate)}
            </p>
          </div>

          {nextAvailable.length > 0 && (
            <div>
              <p className="text-xs text-stone-400 mb-1.5">Next available dates:</p>
              <div className="space-y-1">
                {nextAvailable.map((d) => (
                  <div
                    key={d}
                    className="flex items-center justify-between rounded-md border border-stone-700 bg-stone-800 px-3 py-1.5"
                  >
                    <span className="text-xs text-stone-200">{formatDateLabel(d)}</span>
                    <Link href={`/events/new?date=${d}`}>
                      <Button
                        variant="ghost"
                        className="h-6 px-1.5 text-xs text-brand-400 hover:bg-stone-700"
                      >
                        <CalendarPlus className="h-3 w-3 mr-1" />
                        Book
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {status === 'tentative' && (
        <div className="space-y-3">
          <div className="rounded-lg border border-amber-800 bg-amber-950/50 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-300">Tentative</span>
            </div>
            <p className="text-xs text-amber-400/80">
              You have a draft or proposed event on {formatDateLabel(selectedDate)}. Not yet
              confirmed.
            </p>
          </div>

          {nextAvailable.length > 0 && (
            <div>
              <p className="text-xs text-stone-400 mb-1.5">Next fully open dates:</p>
              <div className="space-y-1">
                {nextAvailable.map((d) => (
                  <div
                    key={d}
                    className="flex items-center justify-between rounded-md border border-stone-700 bg-stone-800 px-3 py-1.5"
                  >
                    <span className="text-xs text-stone-200">{formatDateLabel(d)}</span>
                    <Link href={`/events/new?date=${d}`}>
                      <Button
                        variant="ghost"
                        className="h-6 px-1.5 text-xs text-brand-400 hover:bg-stone-700"
                      >
                        <CalendarPlus className="h-3 w-3 mr-1" />
                        Book
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!status && <p className="text-xs text-stone-500">Pick a date to check your availability</p>}
    </Card>
  )
}
