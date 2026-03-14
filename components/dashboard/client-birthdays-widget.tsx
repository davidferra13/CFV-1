// Client Birthdays/Anniversaries Widget
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Gift } from '@/components/ui/icons'
import type { UpcomingBirthday } from '@/lib/dashboard/widget-actions'

interface Props {
  birthdays: UpcomingBirthday[]
}

export function ClientBirthdaysWidget({ birthdays }: Props) {
  if (birthdays.length === 0) return null

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="h-4 w-4 text-brand-500 shrink-0" />
        <h3 className="text-sm font-semibold text-stone-100">Upcoming Milestones</h3>
        <span className="text-xs text-stone-400 ml-auto">{birthdays.length} coming up</span>
      </div>
      <div className="space-y-2">
        {birthdays.map((b) => {
          const urgency =
            b.daysUntil <= 2
              ? 'text-red-400'
              : b.daysUntil <= 5
                ? 'text-amber-400'
                : 'text-stone-400'
          return (
            <Link
              key={`${b.clientId}-${b.milestone}`}
              href={`/clients/${b.clientId}?tab=messages`}
              className="flex items-center justify-between hover:bg-stone-800 rounded-md px-1 py-1.5 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-100 truncate">{b.clientName}</p>
                <p className="text-xs text-stone-500">{b.milestone}</p>
              </div>
              <span className={`text-xs font-semibold shrink-0 ml-3 ${urgency}`}>
                {b.daysUntil === 0
                  ? 'Today!'
                  : b.daysUntil === 1
                    ? 'Tomorrow'
                    : `${b.daysUntil} days`}
              </span>
            </Link>
          )
        })}
      </div>
      <p className="text-xs text-stone-400 mt-3">
        Send a personal note to strengthen the relationship
      </p>
    </Card>
  )
}
