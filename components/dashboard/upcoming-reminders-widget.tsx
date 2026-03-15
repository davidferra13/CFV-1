// Upcoming Client Reminders Widget
// Shows birthdays, anniversaries, and custom dates in the next 7 days.

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Gift } from '@/components/ui/icons'
import { getReminderSummary } from '@/lib/clients/reminder-actions'
import type { UpcomingReminder } from '@/lib/clients/reminder-actions'

function typeIcon(type: UpcomingReminder['type']): string {
  switch (type) {
    case 'birthday':
      return '🎂'
    case 'anniversary':
    case 'booking_anniversary':
      return '💍'
    case 'custom':
      return '📅'
  }
}

function urgencyClass(daysUntil: number): string {
  if (daysUntil <= 1) return 'text-red-400 font-bold'
  if (daysUntil <= 3) return 'text-amber-400 font-semibold'
  return 'text-stone-400'
}

function daysLabel(daysUntil: number): string {
  if (daysUntil === 0) return 'Today!'
  if (daysUntil === 1) return 'Tomorrow'
  return `${daysUntil} days`
}

export async function UpcomingRemindersWidget() {
  const summary = await getReminderSummary()
  const upcoming = summary.reminders.filter((r) => r.daysUntil <= 7)

  if (upcoming.length === 0) return null

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="h-4 w-4 text-brand-500 shrink-0" />
        <h3 className="text-sm font-semibold text-stone-100">Upcoming Reminders</h3>
        <span className="text-xs text-stone-400 ml-auto">
          {summary.thisWeek} this week, {summary.thisMonth} this month
        </span>
      </div>

      <div className="space-y-2">
        {upcoming.map((r) => (
          <Link
            key={`${r.clientId}-${r.type}-${r.label}`}
            href={`/clients/${r.clientId}?tab=messages`}
            className="flex items-center justify-between hover:bg-stone-800 rounded-md px-2 py-1.5 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm shrink-0">{typeIcon(r.type)}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-100 truncate">{r.clientName}</p>
                <p className="text-xs text-stone-500">{r.label}</p>
              </div>
            </div>
            <span className={`text-xs shrink-0 ml-3 ${urgencyClass(r.daysUntil)}`}>
              {daysLabel(r.daysUntil)}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-3 pt-2 border-t border-stone-800">
        <p className="text-xs text-stone-400">
          Personal outreach on these dates builds loyalty and drives repeat bookings
        </p>
      </div>
    </Card>
  )
}
