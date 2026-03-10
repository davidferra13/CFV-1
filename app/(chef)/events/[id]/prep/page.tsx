// Prep Day Checklist Page
// Full-screen mobile prep checklist for make-ahead components.
// No app shell - renders PrepChecklistMobile directly for maximum viewport usage.
// Follows the same pattern as the DOP mobile page.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getPrepChecklist, getPrepCompletionKeys } from '@/lib/scheduling/prep-checklist-actions'
import { PrepChecklistMobile } from '@/components/scheduling/prep-checklist-mobile'
import { format, parseISO } from 'date-fns'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Prep Day Checklist - ChefFlow',
  other: {
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  },
}

interface Props {
  params: { id: string }
}

export default async function PrepChecklistPage({ params }: Props) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch event basics for the header
  const { data: event } = await supabase
    .from('events')
    .select('id, occasion, event_date')
    .eq('id', params.id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) notFound()

  // Fetch prep items and completion state in parallel
  const [items, completedIds] = await Promise.all([
    getPrepChecklist(params.id),
    getPrepCompletionKeys(params.id).catch(() => new Set<string>()),
  ])

  const dateStr = event.event_date ? format(parseISO(event.event_date), 'MMM d, yyyy') : 'No date'

  return (
    <PrepChecklistMobile
      eventId={params.id}
      items={items}
      completedIds={completedIds}
      eventTitle={event.occasion || 'Event'}
      eventDate={dateStr}
    />
  )
}
