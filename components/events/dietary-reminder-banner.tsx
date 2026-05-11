import Link from 'next/link'
import { AlertCircle } from '@/components/ui/icons'
import type { DietaryReminderStatus } from '@/lib/events/client-dietary-reminder-actions'

interface DietaryReminderBannerProps {
  eventId: string
  status: DietaryReminderStatus
  eventDate: string
}

export function DietaryReminderBanner({ eventId, status, eventDate }: DietaryReminderBannerProps) {
  if (!status.needsConfirmation) return null

  const urgency = status.daysUntilEvent <= 2

  return (
    <div
      className={`mb-6 rounded-lg border px-4 py-3 ${
        urgency ? 'border-red-700 bg-red-950/60' : 'border-amber-700 bg-amber-950/60'
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className={`mt-0.5 h-5 w-5 shrink-0 ${urgency ? 'text-red-400' : 'text-amber-400'}`}
        />
        <div className="flex-1">
          <p className={`text-sm font-medium ${urgency ? 'text-red-200' : 'text-amber-200'}`}>
            {status.guestsWithoutDietary > 0
              ? `Confirm dietary needs for ${status.guestsWithoutDietary} guest${status.guestsWithoutDietary > 1 ? 's' : ''}`
              : 'Confirm your pre-event details'}
          </p>
          <p className={`text-xs mt-0.5 ${urgency ? 'text-red-400' : 'text-amber-400'}`}>
            {status.daysUntilEvent === 0
              ? 'Your event is today!'
              : status.daysUntilEvent === 1
                ? 'Your event is tomorrow.'
                : `${status.daysUntilEvent} days until your event.`}{' '}
            Please review and confirm before the big day.
          </p>
        </div>
        <Link
          href={`/my-events/${eventId}/pre-event-checklist`}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-colors ${
            urgency ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'
          }`}
        >
          Review
        </Link>
      </div>
    </div>
  )
}
