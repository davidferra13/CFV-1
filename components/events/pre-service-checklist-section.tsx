// Pre-Service Checklist Section (Phase 4)
// Server-side wrapper that generates the checklist and renders the client component.
// Shown on event detail page for events happening today or tomorrow.

import { generatePreServiceChecklist } from '@/lib/events/generate-pre-service-checklist'
import { PreServiceChecklist } from './pre-service-checklist'

type Props = {
  eventId: string
  compact?: boolean
}

export async function PreServiceChecklistSection({ eventId, compact }: Props) {
  let checklist
  try {
    checklist = await generatePreServiceChecklist(eventId)
  } catch (err) {
    console.error('[PreServiceChecklistSection] Failed to generate:', err)
    return null
  }

  if (!checklist || checklist.items.length === 0) return null

  return (
    <PreServiceChecklist
      eventId={checklist.event_id}
      eventTitle={checklist.event_title}
      items={checklist.items}
      compact={compact}
    />
  )
}
