// Drive-Time Briefing Page
// Single screen, no scrolling: address, map, guest count, dietary, menu, notes.
// High contrast, large fonts, dark mode. Designed for the car.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { getDriveBriefing } from '@/lib/mobile/drive-briefing'
import { BriefingAddress } from '@/components/mobile/briefing-address'
import { BriefingClientInfo } from '@/components/mobile/briefing-client-info'
import { BriefingDietaryFlags } from '@/components/mobile/briefing-dietary-flags'
import { BriefingMenuSummary } from '@/components/mobile/briefing-menu-summary'
import { format, parseISO } from 'date-fns'
import { dateToDateString } from '@/lib/utils/format'
import { Clock, ArrowLeft, AlertTriangle } from '@/components/ui/icons'

export const metadata: Metadata = {
  title: 'Drive Briefing | ChefFlow',
}

export default async function DriveBriefingPage({
  params,
}: {
  params: { id: string }
}) {
  const briefing = await getDriveBriefing(params.id)

  if (!briefing) {
    notFound()
  }

  const dateStr = format(
    parseISO(dateToDateString(briefing.event.event_date as any)),
    'EEEE, MMM d'
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
      {/* Back link + header */}
      <div>
        <Link
          href={`/events/${params.id}`}
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300 mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to event
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-stone-100">Drive Briefing</h1>
          <div className="flex items-center gap-1.5 text-stone-400">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              {briefing.event.serve_time
                ? `Serve ${briefing.event.serve_time}`
                : dateStr}
            </span>
          </div>
        </div>
        {briefing.event.arrival_time && (
          <p className="text-sm text-amber-400 font-medium mt-1">
            Arrive by {briefing.event.arrival_time}
          </p>
        )}
      </div>

      {/* Address + Navigate button */}
      <BriefingAddress
        address={briefing.location.address}
        city={briefing.location.city}
        state={briefing.location.state}
        zip={briefing.location.zip}
        mapUrl={briefing.location.mapUrl}
      />

      {/* Divider */}
      <div className="border-t border-stone-800" />

      {/* Client info */}
      <BriefingClientInfo
        clientName={briefing.client.name}
        phone={briefing.client.phone}
      />

      {/* Guest count + dietary */}
      <BriefingDietaryFlags
        guestCount={briefing.guests.count}
        dietaryRestrictions={briefing.guests.dietaryRestrictions}
        allergies={briefing.guests.allergies}
      />

      {/* Divider */}
      <div className="border-t border-stone-800" />

      {/* Menu summary */}
      <div>
        <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-2">
          Menu
        </h2>
        <BriefingMenuSummary menus={briefing.menu} />
      </div>

      {/* Special notes */}
      {(briefing.specialNotes || briefing.accessInstructions || briefing.kitchenNotes) && (
        <>
          <div className="border-t border-stone-800" />
          <div className="space-y-3">
            {briefing.accessInstructions && (
              <div className="rounded-xl bg-amber-950/50 border border-amber-900/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400 uppercase">Access</span>
                </div>
                <p className="text-sm text-stone-200">{briefing.accessInstructions}</p>
              </div>
            )}

            {briefing.kitchenNotes && (
              <div className="rounded-xl bg-stone-800/50 p-3">
                <span className="text-xs font-semibold text-stone-500 uppercase">Kitchen Notes</span>
                <p className="text-sm text-stone-300 mt-1">{briefing.kitchenNotes}</p>
              </div>
            )}

            {briefing.specialNotes && (
              <div className="rounded-xl bg-stone-800/50 p-3">
                <span className="text-xs font-semibold text-stone-500 uppercase">Notes</span>
                <p className="text-sm text-stone-300 mt-1">{briefing.specialNotes}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
