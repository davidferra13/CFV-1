// Dietary & Allergy Alert Summary Widget
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import type { DietaryAlertItem } from '@/lib/dashboard/widget-actions'

interface Props {
  alerts: DietaryAlertItem[]
}

export function DietaryAlertsWidget({ alerts }: Props) {
  if (alerts.length === 0) return null

  const totalAllergies = alerts.reduce((sum, a) => sum + a.allergies.length, 0)
  const totalRestrictions = alerts.reduce((sum, a) => sum + a.restrictions.length, 0)

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-red-500 text-lg" aria-hidden="true">
          !
        </span>
        <div>
          <h3 className="text-sm font-semibold text-stone-100">Dietary & Allergy Alerts</h3>
          <p className="text-xs text-stone-500">
            {alerts.length} upcoming event{alerts.length !== 1 ? 's' : ''} with dietary needs
          </p>
        </div>
      </div>

      {(totalAllergies > 0 || totalRestrictions > 0) && (
        <div className="flex gap-2 mb-3">
          {totalAllergies > 0 && (
            <span className="rounded-full border border-red-700 bg-red-950 px-2 py-0.5 text-xs text-red-300">
              {totalAllergies} allerg{totalAllergies === 1 ? 'y' : 'ies'}
            </span>
          )}
          {totalRestrictions > 0 && (
            <span className="rounded-full border border-amber-700 bg-amber-950 px-2 py-0.5 text-xs text-amber-300">
              {totalRestrictions} restriction{totalRestrictions === 1 ? '' : 's'}
            </span>
          )}
        </div>
      )}

      <div className="space-y-2">
        {alerts.map((a) => (
          <Link
            key={a.eventId}
            href={`/events/${a.eventId}`}
            className="block rounded-md px-2 py-2 hover:bg-stone-800 transition-colors"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-stone-100 truncate">{a.occasion}</p>
              <span className="text-xs text-stone-500 shrink-0 ml-2">
                {format(new Date(a.eventDate + 'T00:00:00'), 'MMM d')}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {a.clientName}
              {a.guestCount > 0 ? ` · ${a.guestCount} guests` : ''}
            </p>
            {a.allergies.length > 0 && (
              <p className="text-xs text-red-400 mt-1">Allergies: {a.allergies.join(', ')}</p>
            )}
            {a.restrictions.length > 0 && (
              <p className="text-xs text-amber-400 mt-0.5">
                Restrictions: {a.restrictions.join(', ')}
              </p>
            )}
            {a.dietaryNotes && (
              <p className="text-xs text-stone-400 mt-0.5 truncate">Notes: {a.dietaryNotes}</p>
            )}
          </Link>
        ))}
      </div>
    </Card>
  )
}
