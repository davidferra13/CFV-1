// Staff Today Widget - shows staff assigned to today's events

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from '@/components/ui/icons'
import type { StaffTodayData } from '@/lib/staff/dashboard-actions'

const ROLE_LABELS: Record<string, string> = {
  sous_chef: 'Sous Chef',
  kitchen_assistant: 'Kitchen Assistant',
  service_staff: 'Service Staff',
  server: 'Server',
  bartender: 'Bartender',
  dishwasher: 'Dishwasher',
  other: 'Staff',
  staff: 'Staff',
}

interface Props {
  data: StaffTodayData
}

export function StaffTodayWidget({ data }: Props) {
  if (data.assignments.length === 0) return null

  // Group by event
  const byEvent = new Map<string, { occasion: string | null; staff: typeof data.assignments }>()
  for (const a of data.assignments) {
    const existing = byEvent.get(a.eventId)
    if (existing) {
      existing.staff.push(a)
    } else {
      byEvent.set(a.eventId, { occasion: a.eventOccasion, staff: [a] })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Staff Today</CardTitle>
          <Link
            href="/staff"
            className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-400"
          >
            All Staff <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <p className="text-xs text-stone-500 mt-0.5">
          {data.assignments.length} staff member{data.assignments.length !== 1 ? 's' : ''} assigned
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from(byEvent.entries()).map(([eventId, group]) => (
            <div key={eventId}>
              {byEvent.size > 1 && (
                <p className="text-xs font-medium text-stone-400 mb-1.5">
                  {group.occasion || 'Event'}
                </p>
              )}
              <ul className="space-y-1.5">
                {group.staff.map((entry) => (
                  <li
                    key={`${entry.staffMemberId}-${entry.eventId}`}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-stone-800 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-200 truncate">
                        {entry.staffName}
                      </p>
                      <p className="text-xs text-stone-500">
                        {ROLE_LABELS[entry.role] ?? entry.role}
                        {entry.scheduledHours != null ? ` · ${entry.scheduledHours}h` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
