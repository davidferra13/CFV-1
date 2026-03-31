import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getEventLabels } from '@/lib/event-labels/actions'
import {
  buildLabelMap,
  DEFAULT_OCCASION_TYPES,
  DEFAULT_STATUS_LABELS,
} from '@/lib/event-labels/utils'
import { EventLabelEditor } from '@/components/settings/event-label-editor'

export const metadata: Metadata = { title: 'Event Types & Labels' }

export default async function EventTypesPage() {
  await requireChef()
  const rows = await getEventLabels()

  const occasionMap = buildLabelMap(rows, 'occasion_type', DEFAULT_OCCASION_TYPES)
  const statusMap = buildLabelMap(rows, 'status_label', DEFAULT_STATUS_LABELS)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Event Types &amp; Labels</h1>
        <p className="text-stone-400 mt-1">
          Rename occasion types and status labels to match your preferred terminology. Changes
          appear everywhere in the app.
        </p>
      </div>
      <EventLabelEditor
        occasionMap={occasionMap}
        statusMap={statusMap}
        defaultOccasionTypes={DEFAULT_OCCASION_TYPES as string[]}
        defaultStatusLabels={DEFAULT_STATUS_LABELS as string[]}
      />
    </div>
  )
}
