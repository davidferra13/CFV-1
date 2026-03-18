'use client'

// Prep Timer Creation Form (Phase 5)
// Quick form to start a timed prep item. Can be embedded anywhere.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createPrepTimer } from '@/lib/prep/actions'

type Props = {
  stationId?: string
  eventId?: string
  onDone?: () => void
}

const QUICK_DURATIONS = [
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: '4 hours', minutes: 240 },
  { label: '8 hours', minutes: 480 },
  { label: '12 hours', minutes: 720 },
  { label: '24 hours', minutes: 1440 },
  { label: '48 hours', minutes: 2880 },
]

export function PrepTimerForm({ stationId, eventId, onDone }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null)
  const [customEnd, setCustomEnd] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [alertMinutes, setAlertMinutes] = useState(30)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!title.trim()) return

    let endAt: string
    if (useCustom && customEnd) {
      endAt = new Date(customEnd).toISOString()
    } else if (durationMinutes) {
      endAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
    } else {
      return
    }

    startTransition(async () => {
      try {
        await createPrepTimer({
          title: title.trim(),
          description: description.trim() || undefined,
          end_at: endAt,
          station_id: stationId,
          event_id: eventId,
          alert_before_minutes: alertMinutes,
        })
        setTitle('')
        setDescription('')
        setDurationMinutes(null)
        setCustomEnd('')
        setIsOpen(false)
        router.refresh()
        onDone?.()
      } catch (err) {
        console.error('Failed to create prep timer:', err)
      }
    })
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-xs text-brand-400 hover:text-brand-300"
      >
        + Start Timed Prep
      </button>
    )
  }

  const hasValidEnd = useCustom ? !!customEnd : !!durationMinutes

  return (
    <Card>
      <CardHeader className="py-2.5">
        <CardTitle className="text-sm">Start Timed Prep</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0 pb-3">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's being prepped? (e.g., Brine, Dough proof, Stock)"
          className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />

        {/* Description (optional) */}
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Notes (optional)"
          className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-1.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />

        {/* Duration selector */}
        {!useCustom && (
          <div>
            <p className="text-xs text-stone-400 mb-2">Duration from now:</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_DURATIONS.map((d) => (
                <button
                  key={d.minutes}
                  type="button"
                  onClick={() => setDurationMinutes(d.minutes)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    durationMinutes === d.minutes
                      ? 'bg-brand-600 text-white'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom end time */}
        {useCustom && (
          <div>
            <p className="text-xs text-stone-400 mb-1">End date/time:</p>
            <input
              type="datetime-local"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-1.5 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => setUseCustom(!useCustom)}
          className="text-xs-tight text-stone-500 hover:text-stone-300"
        >
          {useCustom ? 'Use quick duration' : 'Set specific end time'}
        </button>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isPending || !title.trim() || !hasValidEnd}
          >
            {isPending ? 'Starting...' : 'Start Timer'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsOpen(false)
              setTitle('')
              setDescription('')
              setDurationMinutes(null)
            }}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
