// Event Travel Plan Page
// Full-page travel planner for a single event.
// Shows all legs (specialty sourcing → grocery → service → return) in order.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getTravelPlan } from '@/lib/travel/actions'
import { TravelPlanClient } from '@/components/events/travel-plan-client'
import { ServiceSimulationReturnBanner } from '@/components/events/service-simulation-return-banner'
import { Button } from '@/components/ui/button'
import { sanitizeReturnTo } from '@/lib/navigation/return-to'

async function getEventForTravel(eventId: string, tenantId: string) {
  const db: any = createServerClient()
  const { data } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, status,
      location_address, location_city, location_state,
      clients (full_name)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()
  return data
}

async function getChefHomeAddress(chefId: string) {
  const db: any = createServerClient()
  const { data } = await db
    .from('chef_preferences')
    .select('home_address, home_city, home_state')
    .eq('chef_id', chefId)
    .single()
  if (!data) return null
  return [data.home_address, data.home_city, data.home_state].filter(Boolean).join(', ')
}

export default async function EventTravelPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { returnTo?: string }
}) {
  const user = await requireChef()
  const returnTo = sanitizeReturnTo(searchParams?.returnTo)

  const [event, plan, homeAddress] = await Promise.all([
    getEventForTravel(params.id, user.tenantId!),
    getTravelPlan(params.id),
    getChefHomeAddress(user.entityId!),
  ])

  if (!event) notFound()

  const venueAddress = [event.location_address, event.location_city, event.location_state]
    .filter(Boolean)
    .join(', ')

  const clientName = (event.clients as { full_name: string } | null)?.full_name

  return (
    <div className="space-y-6">
      <ServiceSimulationReturnBanner returnTo={returnTo} />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href={returnTo ?? `/events/${event.id}`}>
          <Button variant="ghost" size="sm">
            ← {event.occasion || 'Event'}
          </Button>
        </Link>
        <span className="text-stone-400">/</span>
        <span className="text-sm text-stone-400">Travel Plan</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Travel Plan</h1>
        <div className="flex flex-wrap gap-3 mt-1 text-sm text-stone-500">
          <span>
            {new Date(event.event_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          {clientName && <span>· {clientName}</span>}
          {venueAddress && <span>· {venueAddress}</span>}
        </div>
      </div>

      {/* Download PDF */}
      {plan.legs.length > 0 && (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            href={`/api/documents/${event.id}?type=travel`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Print Travel Route
          </Button>
        </div>
      )}

      {/* Travel plan */}
      <TravelPlanClient
        plan={plan}
        eventDate={event.event_date}
        prefillVenueAddress={venueAddress || undefined}
        prefillHomeAddress={homeAddress || undefined}
      />
    </div>
  )
}
