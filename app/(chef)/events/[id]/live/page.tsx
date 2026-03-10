// Live Event Coordination Page
// Full-screen dashboard for real-time event ops (no sidebar, like DOP mobile).

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getLiveEventStatus } from '@/lib/events/live-coordination-actions'
import { LiveEventDashboard } from '@/components/events/live-event-dashboard'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Live Coordination - ChefFlow',
  other: {
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  },
}

interface Props {
  params: { id: string }
}

export default async function LiveCoordinationPage({ params }: Props) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify event exists and belongs to this chef
  const { data: event } = await supabase
    .from('events')
    .select('id, status')
    .eq('id', params.id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) notFound()

  // Get initial live status
  const status = await getLiveEventStatus(params.id)

  if (!status) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-stone-400 font-medium">Could not load event status.</p>
          <a
            href={`/events/${params.id}`}
            className="text-brand-400 text-sm mt-2 inline-block hover:underline"
          >
            Back to event
          </a>
        </div>
      </div>
    )
  }

  return <LiveEventDashboard eventId={params.id} initialStatus={status} />
}
