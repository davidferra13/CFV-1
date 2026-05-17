// Server component: DOP progress, gear check, packing, prep blocks, par alerts, prep schedule
import Link from 'next/link'
import { getEventDOPProgress } from '@/lib/scheduling/actions'
import { getEventPrepBlocks } from '@/lib/scheduling/prep-block-actions'
import { getPackingConfirmationCount } from '@/lib/packing/actions'
import { getEventGearStatus } from '@/lib/gear/actions'
import { getParAlerts } from '@/lib/inventory/count-actions'
import { dateToDateString } from '@/lib/utils/format'
import { DOPProgressBar } from '@/components/scheduling/dop-view'
import { EventPrepSchedule } from '@/components/events/event-prep-schedule'
import { PrepBlockNudgeBanner } from '@/components/events/prep-block-nudge'
import { Card } from '@/components/ui/card'

function isEventWithinDays(eventDate: Date | string, days: number): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() + days)
  const evDate = new Date(dateToDateString(eventDate) + 'T00:00:00')
  return evDate >= today && evDate <= cutoff
}

type Props = {
  eventId: string
  tenantId: string
  event: any
}

export async function EventScheduleSection({ eventId, tenantId, event }: Props) {
  const [dopProgress, prepBlocks, packingConfirmedCount, gearStatus, parAlerts] = await Promise.all(
    [
      getEventDOPProgress(eventId).catch(() => null),
      event.status !== 'cancelled'
        ? getEventPrepBlocks(eventId).catch(() => [])
        : Promise.resolve([]),
      ['confirmed', 'in_progress'].includes(event.status)
        ? getPackingConfirmationCount(eventId).catch(() => 0)
        : Promise.resolve(0),
      ['confirmed', 'in_progress'].includes(event.status)
        ? getEventGearStatus(eventId).catch(() => ({
            gearChecked: false,
            gearCheckedAt: null,
            confirmedCount: 0,
          }))
        : Promise.resolve({ gearChecked: false, gearCheckedAt: null, confirmedCount: 0 }),
      ['confirmed', 'in_progress'].includes(event.status) && isEventWithinDays(event.event_date, 7)
        ? getParAlerts().catch(() => [])
        : Promise.resolve([]),
    ]
  )

  return (
    <>
      {/* Schedule Summary & DOP Progress */}
      {dopProgress && !['cancelled'].includes(event.status) && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-sm font-semibold text-stone-300">Preparation Progress</h3>
                <Link
                  href={`/events/${event.id}/schedule`}
                  className="text-xs text-brand-500 hover:text-brand-400"
                >
                  View full schedule &rarr;
                </Link>
              </div>
              <DOPProgressBar completed={dopProgress.completed} total={dopProgress.total} />
            </div>
          </div>
        </Card>
      )}

      {/* Gear Check */}
      {['confirmed', 'in_progress'].includes(event.status) && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-sm font-semibold text-stone-300">Gear Check</h3>
                <Link
                  href={`/events/${event.id}/gear`}
                  className="text-xs text-brand-500 hover:text-brand-400"
                >
                  Open gear check &rarr;
                </Link>
              </div>
              {(gearStatus as any).gearChecked ? (
                <p className="text-sm text-emerald-700 font-medium">Gear ready</p>
              ) : (gearStatus as any).confirmedCount > 0 ? (
                <p className="text-sm text-stone-300">
                  {(gearStatus as any).confirmedCount} item
                  {(gearStatus as any).confirmedCount !== 1 ? 's' : ''} confirmed
                </p>
              ) : (
                <p className="text-sm text-stone-300">Not started</p>
              )}
            </div>
            {(gearStatus as any).gearChecked && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900 text-emerald-800">
                Ready
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Packing Progress */}
      {['confirmed', 'in_progress'].includes(event.status) && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-sm font-semibold text-stone-300">Packing</h3>
                <Link
                  href={`/events/${event.id}/pack`}
                  className="text-xs text-brand-500 hover:text-brand-400"
                >
                  Open packing view &rarr;
                </Link>
              </div>
              {(event as any).car_packed ? (
                <p className="text-sm text-emerald-700 font-medium">Car packed</p>
              ) : packingConfirmedCount > 0 ? (
                <p className="text-sm text-stone-300">
                  {packingConfirmedCount} item{packingConfirmedCount !== 1 ? 's' : ''} confirmed
                  packed
                </p>
              ) : (
                <p className="text-sm text-stone-300">Not started; open packing view to begin</p>
              )}
            </div>
            {(event as any).car_packed && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900 text-emerald-800">
                Packed
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Prep Block Nudge */}
      {event.status === 'confirmed' && (prepBlocks as any[]).length === 0 && (
        <PrepBlockNudgeBanner eventId={event.id} />
      )}

      {/* Par Level Alert */}
      {(parAlerts as any[]).length > 0 && (
        <Card className="p-4 border-amber-700/50 bg-amber-950/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-amber-400">
                {(parAlerts as any[]).length} item{(parAlerts as any[]).length !== 1 ? 's' : ''}{' '}
                below par level
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                {(parAlerts as any[])
                  .slice(0, 3)
                  .map((a: any) => a.ingredientName)
                  .join(', ')}
                {(parAlerts as any[]).length > 3 ? ` +${(parAlerts as any[]).length - 3} more` : ''}
              </p>
            </div>
            <Link
              href="/inventory"
              className="shrink-0 text-xs text-amber-400 hover:underline font-medium"
            >
              Check inventory
            </Link>
          </div>
        </Card>
      )}

      {/* Prep Schedule */}
      {event.status !== 'cancelled' && (
        <EventPrepSchedule eventId={event.id} initialBlocks={prepBlocks as any} />
      )}
    </>
  )
}
