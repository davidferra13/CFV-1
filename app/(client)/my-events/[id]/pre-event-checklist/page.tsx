// Pre-Event Checklist Page — client confirms dietary prefs and kitchen details

import { requireClient } from '@/lib/auth/get-user'
import { getPreEventChecklistData } from '@/lib/events/pre-event-checklist-actions'
import { PreEventChecklistClient } from '@/components/events/pre-event-checklist-client'
import { notFound, redirect } from 'next/navigation'

export default async function PreEventChecklistPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireClient()
  const { id } = await params

  const data = await getPreEventChecklistData(id).catch(() => null)
  if (!data) notFound()

  const { event, client } = data

  // Only available when event is confirmed, paid, or in-progress
  if (!['confirmed', 'paid', 'in_progress'].includes(event.status)) {
    redirect(`/my-events/${id}`)
  }

  return (
    <div className="py-2">
      <PreEventChecklistClient event={event} client={client} />
    </div>
  )
}
