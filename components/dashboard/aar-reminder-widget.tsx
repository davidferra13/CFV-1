'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { scanPendingAARs } from '@/lib/automations/aar-scan'
import { triggerAARReminders } from '@/lib/automations/aar-trigger'
import { toast } from 'sonner'
import { ClipboardCheck, ArrowRight } from '@/components/ui/icons'

type PendingEvent = {
  id: string
  occasion: string | null
  event_date: string
}

export function AARReminderWidget() {
  const [events, setEvents] = useState<PendingEvent[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const result = await scanPendingAARs()
        if (!cancelled) {
          setEvents(result.events)
          setLoaded(true)
        }
      } catch (err) {
        console.error('[AARReminderWidget] scan failed:', err)
        if (!cancelled) {
          setError(true)
          setLoaded(true)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  function handleCreateReminders() {
    startTransition(async () => {
      try {
        const result = await triggerAARReminders()
        toast.success(`Created ${result.created} AAR reminder(s)`)
        // Re-scan to update the list
        const updated = await scanPendingAARs()
        setEvents(updated.events)
      } catch (err) {
        console.error('[AARReminderWidget] trigger failed:', err)
        toast.error('Failed to create AAR reminders')
      }
    })
  }

  // Don't render anything until loaded
  if (!loaded) return null

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <p className="text-sm text-red-300">Could not load AAR reminders</p>
      </div>
    )
  }

  // Nothing pending
  if (events.length === 0) return null

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardCheck className="h-5 w-5 text-amber-400" />
        <h3 className="text-sm font-medium text-amber-300">
          {events.length} event{events.length !== 1 ? 's' : ''} need After-Action Reviews
        </h3>
      </div>

      <ul className="space-y-2 mb-3">
        {events.map((event) => {
          const dateStr = event.event_date
            ? new Date(event.event_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            : 'Unknown date'

          return (
            <li key={event.id}>
              <Link
                href={`/events/${event.id}/aar`}
                className="flex items-center justify-between rounded-md bg-amber-500/5 px-3 py-2 text-sm text-amber-200 hover:bg-amber-500/15 transition-colors"
              >
                <span>
                  {event.occasion || 'Untitled event'} - {dateStr}
                </span>
                <ArrowRight className="h-4 w-4 text-amber-400" />
              </Link>
            </li>
          )
        })}
      </ul>

      <button
        onClick={handleCreateReminders}
        disabled={isPending}
        className="w-full rounded-md bg-amber-500/20 px-3 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
      >
        {isPending ? 'Creating reminders...' : 'Create Reminders'}
      </button>
    </div>
  )
}
