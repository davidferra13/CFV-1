// Circle Lifecycle Hooks
// Only postArrivalToCircle is still used (from AI agent actions, server-side).
// All other lifecycle posting uses circleFirstNotify (lib/hub/circle-first-notify.ts).

import { createServerClient } from '@/lib/db/server'
import { getCircleForEvent, getChefHubProfileId } from './circle-lookup'

// ─── Arrival Notification ────────────────────────────────────────────────────

export async function postArrivalToCircle(input: {
  eventId: string
  arrivalTime?: string | null
  message?: string | null
}): Promise<void> {
  const circle = await getCircleForEvent(input.eventId)
  if (!circle) return

  const chefProfileId = await getChefHubProfileId(circle.tenantId)
  if (!chefProfileId) return

  let body = input.message || "I'm on my way!"
  if (input.arrivalTime && !input.message) {
    body = `I'm on my way! Arriving at ${input.arrivalTime}.`
  }

  const db = createServerClient({ admin: true })
  await db.from('hub_messages').insert({
    group_id: circle.groupId,
    author_profile_id: chefProfileId,
    message_type: 'system',
    body,
    metadata: {
      system_event_type: 'chef_arrival',
      event_id: input.eventId,
    },
  })
}
