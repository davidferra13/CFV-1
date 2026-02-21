'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const DAYS_OF_WEEK = [
  { value: 'sunday', label: 'Sun' },
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
]

type OffHoursConfig = {
  off_hours_start: string | null
  off_hours_end: string | null
  off_days: string[]
}

export function OffHoursForm({
  initial,
  onSave,
}: {
  initial: OffHoursConfig
  onSave: (config: OffHoursConfig) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()
  const [start, setStart] = useState(initial.off_hours_start ?? '21:00')
  const [end, setEnd] = useState(initial.off_hours_end ?? '08:00')
  const [offDays, setOffDays] = useState<string[]>(initial.off_days ?? [])

  function toggleDay(day: string) {
    setOffDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  function handleSave() {
    startTransition(async () => {
      await onSave({
        off_hours_start: start,
        off_hours_end: end,
        off_days: offDays,
      })
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Off-Hours Notification Protection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-stone-500">
          Non-urgent notifications will be held during your off-hours. Emergency alerts (overdue
          payments, tomorrow&apos;s events) always come through.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Quiet starts at</label>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full border border-stone-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Quiet ends at</label>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full border border-stone-300 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Days off (no non-urgent alerts)
          </label>
          <div className="flex gap-2">
            {DAYS_OF_WEEK.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={`px-3 py-1.5 rounded text-sm border transition-colors ${
                  offDays.includes(d.value)
                    ? 'bg-stone-800 text-white border-stone-800'
                    : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Off-Hours Settings'}
        </Button>
      </CardContent>
    </Card>
  )
}
