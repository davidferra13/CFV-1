// Interactive Packing Checklist Page
// Chef uses this on their phone/laptop while physically packing for an event.
// Check-off state is localStorage-only (fast, works offline under time pressure).
// "Mark Car Packed" button writes back to the server when everything is done.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { fetchPackingListData } from '@/lib/documents/generate-packing-list'
import { getPackingStatus } from '@/lib/packing/actions'
import { PackingListClient } from '@/components/events/packing-list-client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format, parseISO } from 'date-fns'

export default async function PackPage({
  params,
}: {
  params: { id: string }
}) {
  await requireChef()

  const [packingData, packingStatus] = await Promise.all([
    fetchPackingListData(params.id),
    getPackingStatus(params.id),
  ])

  if (!packingData) {
    notFound()
  }

  const { event, clientName } = packingData
  const dateStr = format(parseISO(event.event_date), 'EEEE, MMM d, yyyy')

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/events/${params.id}`}
            className="text-sm text-stone-500 hover:text-stone-700 mb-1 block"
          >
            ← Back to event
          </Link>
          <h1 className="text-2xl font-bold text-stone-900">Packing Checklist</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {clientName} · {dateStr}
          </p>
        </div>
        <a
          href={`/api/documents/${params.id}?type=packing`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="secondary" size="sm">
            Print PDF
          </Button>
        </a>
      </div>

      {/* Departure callout — most urgent info, immediately visible */}
      {(event.departure_time_display || event.access_instructions) && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          {event.departure_time_display && (
            <p className="text-lg font-bold text-amber-900">
              Depart by {event.departure_time_display}
            </p>
          )}
          {event.access_instructions && (
            <p className="text-sm text-amber-800 mt-1">
              Access: {event.access_instructions}
            </p>
          )}
          {[event.location_address, event.location_city, event.location_state]
            .filter(Boolean)
            .length > 0 && (
            <p className="text-sm text-amber-700 mt-1">
              {[event.location_address, event.location_city, event.location_state]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
        </Card>
      )}

      {/* Already packed confirmation */}
      {packingStatus.carPacked && (
        <Card className="p-4 bg-green-50 border-green-200">
          <p className="text-green-800 font-medium">
            Car packed {packingStatus.carPackedAt
              ? `at ${format(new Date(packingStatus.carPackedAt), 'h:mm a')}`
              : ''}
          </p>
          <p className="text-emerald-600 text-sm mt-1">
            You marked the car as packed. Have a great dinner!
          </p>
        </Card>
      )}

      {/* Interactive checklist */}
      <PackingListClient
        eventId={params.id}
        packingData={packingData}
        alreadyPacked={packingStatus.carPacked}
      />
    </div>
  )
}
