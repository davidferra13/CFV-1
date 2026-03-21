'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  getUpcomingTouchpointReminders,
  type TouchpointReminder,
} from '@/lib/dashboard/touchpoint-actions'
import { CollapsibleWidget } from '@/components/dashboard/collapsible-widget'

function typeLabel(type: TouchpointReminder['type']): string {
  switch (type) {
    case 'birthday':
      return 'Birthday'
    case 'anniversary':
      return 'Anniversary'
    default:
      return type
  }
}

function urgencyColor(daysUntil: number): string {
  if (daysUntil <= 2) return 'text-red-400'
  if (daysUntil <= 5) return 'text-amber-400'
  return 'text-stone-400'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function TouchpointRemindersWidget() {
  const [reminders, setReminders] = useState<TouchpointReminder[] | null>(null)
  const [error, setError] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await getUpcomingTouchpointReminders()
        setReminders(result)
      } catch (err) {
        console.error('[TouchpointRemindersWidget] Failed to load reminders', err)
        setError(true)
      }
    })
  }, [])

  if (error) {
    return (
      <CollapsibleWidget widgetId="client_birthdays" title="Touchpoint Reminders">
        <p className="text-sm text-red-400">Could not load reminders.</p>
      </CollapsibleWidget>
    )
  }

  if (isPending || reminders === null) {
    return (
      <CollapsibleWidget widgetId="client_birthdays" title="Touchpoint Reminders">
        <div className="space-y-2 py-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-10 bg-stone-700/30 rounded animate-pulse" />
          ))}
        </div>
      </CollapsibleWidget>
    )
  }

  return (
    <CollapsibleWidget widgetId="client_birthdays" title="Touchpoint Reminders">
      {reminders.length === 0 ? (
        <p className="text-sm text-stone-500 py-2">No upcoming touchpoints in the next 14 days.</p>
      ) : (
        <div className="space-y-1">
          {reminders.map((r) => (
            <Link
              key={`${r.clientId}-${r.type}`}
              href={`/clients/${r.clientId}`}
              className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-stone-700/40 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-stone-200 truncate">{r.clientName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant={r.type === 'birthday' ? 'info' : 'success'}>
                    {typeLabel(r.type)}
                  </Badge>
                  <span className="text-xs text-stone-500">{formatDate(r.date)}</span>
                </div>
              </div>
              <span className={`text-xs font-semibold shrink-0 ml-3 ${urgencyColor(r.daysUntil)}`}>
                {r.daysUntil === 0
                  ? 'Today!'
                  : r.daysUntil === 1
                    ? 'Tomorrow'
                    : `${r.daysUntil} days`}
              </span>
            </Link>
          ))}
        </div>
      )}
    </CollapsibleWidget>
  )
}
