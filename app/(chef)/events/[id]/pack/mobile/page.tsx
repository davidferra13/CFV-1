// Mobile Pack Checklist Page
// Night-before, tap-to-complete checklist with nothing-forgotten guarantee.
// Large checkboxes, progress bar, grouped by category.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getPackChecklist } from '@/lib/mobile/pack-checklist'
import { PackChecklistClient } from '@/components/mobile/pack-checklist-client'
import { ArrowLeft } from '@/components/ui/icons'
import { format, parseISO } from 'date-fns'
import { dateToDateString } from '@/lib/utils/format'

export const metadata: Metadata = {
  title: 'Pack Checklist | ChefFlow',
}

export default async function MobilePackPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event basic info
  const { data: event } = await db
    .from('events')
    .select('id, occasion, event_date, clients(full_name)')
    .eq('id', params.id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    notFound()
  }

  const groups = await getPackChecklist(params.id)

  const dateStr = format(
    parseISO(dateToDateString(event.event_date as any)),
    'EEEE, MMM d'
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
      {/* Header */}
      <div>
        <Link
          href={`/events/${params.id}`}
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300 mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to event
        </Link>
        <h1 className="text-2xl font-bold text-stone-100">Pack Checklist</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          {event.clients?.full_name ?? 'Event'} · {dateStr}
        </p>
      </div>

      {/* Interactive checklist */}
      <PackChecklistClient eventId={params.id} initialGroups={groups} />
    </div>
  )
}
