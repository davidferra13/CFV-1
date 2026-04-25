// Chef Gear Check Page
// Personal readiness checklist: uniform, tools, grooming, safety.
// Mirrors the pack page pattern: localStorage primary, server sync in background.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getGearDefaults, getEventGearStatus } from '@/lib/gear/actions'
import { GearCheckClient } from '@/components/events/gear-check-client'
import { ServiceSimulationReturnBanner } from '@/components/events/service-simulation-return-banner'
import { format, parseISO } from 'date-fns'
import { dateToDateString } from '@/lib/utils/format'
import { sanitizeReturnTo } from '@/lib/navigation/return-to'

export default async function GearPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { returnTo?: string }
}) {
  const user = await requireChef()
  const returnTo = sanitizeReturnTo(searchParams?.returnTo)
  const backHref = returnTo ?? `/events/${params.id}`

  const db: any = createServerClient()

  // Fetch event basic info
  const { data: event } = await db
    .from('events')
    .select('id, status, event_date, occasion, client_id')
    .eq('id', params.id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) notFound()

  // Fetch client name
  let clientName = 'Client'
  if (event.client_id) {
    const { data: client } = await db
      .from('clients')
      .select('full_name')
      .eq('id', event.client_id)
      .single()
    if (client?.full_name) clientName = client.full_name
  }

  // Parallel fetches: gear defaults, gear status, existing confirmations
  const [gearDefaults, gearStatus, confirmationsResult] = await Promise.all([
    getGearDefaults(user.entityId!),
    getEventGearStatus(params.id),
    db
      .from('packing_confirmations')
      .select('item_key')
      .eq('event_id', params.id)
      .eq('tenant_id', user.tenantId!)
      .like('item_key', 'gear:%')
      .then((r: any) => r.data ?? []),
  ])

  const confirmedKeys = new Set(
    (confirmationsResult as { item_key: string }[]).map((r) => r.item_key)
  )

  const dateStr = event.event_date
    ? format(parseISO(dateToDateString(event.event_date as Date | string)), 'EEEE, MMM d, yyyy')
    : ''

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <ServiceSimulationReturnBanner returnTo={returnTo} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href={backHref} className="text-sm text-stone-500 hover:text-stone-300 mb-1 block">
            &larr; Back to event
          </Link>
          <h1 className="text-xl font-bold text-stone-100">Gear Check</h1>
          <p className="text-sm text-stone-400">
            {clientName} {event.occasion ? `\u00B7 ${event.occasion}` : ''}{' '}
            {dateStr ? `\u00B7 ${dateStr}` : ''}
          </p>
        </div>
      </div>

      <GearCheckClient
        eventId={params.id}
        chefId={user.entityId!}
        gearDefaults={gearDefaults}
        confirmedKeys={Array.from(confirmedKeys)}
        gearChecked={gearStatus.gearChecked}
      />
    </div>
  )
}
