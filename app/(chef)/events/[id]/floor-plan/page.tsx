// Event Floor Plan Page
// Creates default floor plan if none exists, then shows the editor

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEventById } from '@/lib/events/actions'
import { getFloorPlan, createFloorPlan } from '@/lib/events/floor-plan-actions'
import { FloorPlanEditor } from '@/components/events/floor-plan-editor'
import { Button } from '@/components/ui/button'

export default async function FloorPlanPage({ params }: { params: { id: string } }) {
  const user = await requireChef()
  const event = await getEventById(params.id)

  if (!event) notFound()

  // Get or create floor plan
  let floorPlan = await getFloorPlan(params.id)

  if (!floorPlan) {
    floorPlan = await createFloorPlan(params.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Floor Plan</h1>
          <p className="text-sm text-stone-400">
            {event.occasion || 'Event'} - drag elements to position them
          </p>
        </div>
        <Link href={`/events/${params.id}`}>
          <Button variant="ghost">Back to Event</Button>
        </Link>
      </div>

      <FloorPlanEditor floorPlan={floorPlan} eventId={params.id} />
    </div>
  )
}
