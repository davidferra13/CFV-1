'use client'

// Client wrapper that renders Reschedule + Cancel buttons with their modals.
// Imported by the server-rendered EventHeaderSection.

import { RescheduleEventModal } from '@/components/events/reschedule-event-modal'
import { CancelEventModal } from '@/components/events/cancel-event-modal'
import { getAllowedTransitions, type EventStatus } from '@/lib/events/fsm'
import type { RescheduleHistoryEntry } from '@/lib/events/reschedule-history-actions'

const RESCHEDULABLE_STATUSES = new Set(['draft', 'proposed', 'accepted', 'paid', 'confirmed'])

type Props = {
  eventId: string
  eventStatus: string
  currentDate: string
  rescheduleHistory?: RescheduleHistoryEntry[]
}

function isKnownEventStatus(status: string): status is EventStatus {
  return [
    'draft',
    'proposed',
    'accepted',
    'paid',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
  ].includes(status)
}

export function EventHeaderActions({
  eventId,
  eventStatus,
  currentDate,
  rescheduleHistory = [],
}: Props) {
  const canReschedule = RESCHEDULABLE_STATUSES.has(eventStatus)
  const canCancel =
    isKnownEventStatus(eventStatus) && getAllowedTransitions(eventStatus).includes('cancelled')

  if (!canReschedule && !canCancel) return null

  return (
    <>
      {canReschedule && (
        <RescheduleEventModal
          eventId={eventId}
          eventStatus={eventStatus}
          currentDate={currentDate}
          history={rescheduleHistory}
        />
      )}
      {canCancel && <CancelEventModal eventId={eventId} eventStatus={eventStatus} />}
    </>
  )
}
