// Interactive Packing Checklist Page
// Chef uses this on their phone/laptop while physically packing for an event.
// Check-off state is localStorage-only (fast, works offline under time pressure).
// "Mark Car Packed" button writes back to the server when everything is done.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { fetchPackingListData } from '@/lib/documents/generate-packing-list'
import { getPackingStatus } from '@/lib/packing/actions'
import { getEventWeather, type EventWeather } from '@/lib/weather/open-meteo'
import { PackingListClient } from '@/components/events/packing-list-client'
import { ServiceSimulationReturnBanner } from '@/components/events/service-simulation-return-banner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format, parseISO } from 'date-fns'
import { dateToDateString } from '@/lib/utils/format'
import { sanitizeReturnTo } from '@/lib/navigation/return-to'

/**
 * Fetch weather for the event - non-blocking, returns null on any failure.
 * Coordinates come from the events table (location_lat, location_lng).
 */
async function fetchEventWeather(eventId: string, tenantId: string): Promise<EventWeather | null> {
  try {
    const db: any = createServerClient()
    const { data } = await db
      .from('events')
      .select('location_lat, location_lng, event_date')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single()

    if (!data?.location_lat || !data?.location_lng || !data?.event_date) return null

    const result = await getEventWeather(data.location_lat, data.location_lng, data.event_date)
    return result.data
  } catch {
    return null
  }
}

export async function generateMetadata() {
  return { title: 'Pack List | ChefFlow' }
}

export default async function PackPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { returnTo?: string }
}) {
  const user = await requireChef()
  const returnTo = sanitizeReturnTo(searchParams?.returnTo)
  const backHref = returnTo ?? `/events/${params.id}`

  const [packingData, packingStatus, weather] = await Promise.all([
    fetchPackingListData(params.id),
    getPackingStatus(params.id),
    fetchEventWeather(params.id, user.tenantId!),
  ])

  if (!packingData) {
    notFound()
  }

  const { event, clientName } = packingData
  const dateStr = format(
    parseISO(dateToDateString(event.event_date as Date | string)),
    'EEEE, MMM d, yyyy'
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <ServiceSimulationReturnBanner returnTo={returnTo} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href={backHref} className="text-sm text-stone-500 hover:text-stone-300 mb-1 block">
            &lt;- Back to event
          </Link>
          <h1 className="text-2xl font-bold text-stone-100">Packing Checklist</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {clientName} - {dateStr}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          href={`/api/documents/${params.id}?type=packing`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Print PDF
        </Button>
      </div>

      {/* Departure callout - most urgent info, immediately visible */}
      {(event.departure_time_display || event.access_instructions) && (
        <Card className="p-4 bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/70 dark:text-amber-100 dark:border-amber-800">
          {event.departure_time_display && (
            <p className="text-lg font-bold text-amber-950 dark:text-amber-100">
              Depart by {event.departure_time_display}
            </p>
          )}
          {event.access_instructions && (
            <p className="text-sm text-amber-900 dark:text-amber-200 mt-1">
              Access: {event.access_instructions}
            </p>
          )}
          {[event.location_address, event.location_city, event.location_state].filter(Boolean)
            .length > 0 && (
            <p className="text-sm text-amber-900 dark:text-amber-200 mt-1">
              {[event.location_address, event.location_city, event.location_state]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
        </Card>
      )}

      {/* Already packed confirmation */}
      {packingStatus.carPacked && (
        <Card className="p-4 bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-100 dark:border-emerald-800">
          <p className="text-emerald-950 dark:text-emerald-100 font-medium">
            Car packed{' '}
            {packingStatus.carPackedAt
              ? `at ${format(new Date(packingStatus.carPackedAt), 'h:mm a')}`
              : ''}
          </p>
          <p className="text-emerald-900 dark:text-emerald-200 text-sm mt-1">
            You marked the car as packed. Have a great service!
          </p>
        </Card>
      )}

      {/* Interactive checklist */}
      <PackingListClient
        eventId={params.id}
        packingData={packingData}
        alreadyPacked={packingStatus.carPacked}
        weather={weather}
      />
    </div>
  )
}
