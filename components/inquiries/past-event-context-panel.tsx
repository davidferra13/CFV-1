import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'

type PastEventSummary = {
  id: string
  occasion: string | null
  eventDate: string
  guestCount: number | null
  menuName: string | null
  totalCents: number
}

type PastEventContextPanelProps = {
  events: PastEventSummary[]
  totalSpendCents: number
}

/**
 * Past Event Context Panel (Chef Side).
 * Shows on repeat-client inquiry detail: past events with menus, spend, guest counts.
 * Suggests reusing a past menu or starting fresh.
 */
export function PastEventContextPanel({ events, totalSpendCents }: PastEventContextPanelProps) {
  if (events.length === 0) return null

  const latestEvent = events[0]
  const latestMenuName = latestEvent?.menuName

  return (
    <Card className="border-amber-800/40 bg-amber-950/10">
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-400">
          Repeat Client History
        </p>
        <p className="mt-2 text-sm text-stone-300">
          Total lifetime spend:{' '}
          <span className="font-semibold text-stone-100">{formatCurrency(totalSpendCents)}</span>
        </p>

        {latestMenuName && (
          <p className="mt-3 text-sm text-stone-400">
            Last time you served{' '}
            <span className="font-medium text-stone-200">{latestMenuName}</span>. Reuse or start
            fresh?
          </p>
        )}

        <div className="mt-4 space-y-2">
          {events.slice(0, 5).map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-900/60 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-stone-200">
                  {event.occasion || 'Private event'}
                </p>
                <p className="text-xs text-stone-500">
                  {format(new Date(event.eventDate), 'MMM d, yyyy')}
                  {event.guestCount ? ` · ${event.guestCount} guests` : ''}
                  {event.menuName ? ` · ${event.menuName}` : ''}
                </p>
              </div>
              <p className="ml-3 text-sm font-medium text-emerald-400">
                {formatCurrency(event.totalCents)}
              </p>
            </div>
          ))}
        </div>

        {events.length > 5 && (
          <p className="mt-3 text-xs text-stone-500">+{events.length - 5} more events</p>
        )}
      </CardContent>
    </Card>
  )
}
