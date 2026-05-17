import { createServerClient } from '@/lib/db/server'
import { getCircleForEvent, getChefHubProfileId } from '@/lib/hub/circle-lookup'

export async function postPaymentRequestToCircle(eventId: string): Promise<void> {
  const circle = await getCircleForEvent(eventId)
  if (!circle) return

  const chefProfileId = await getChefHubProfileId(circle.tenantId)
  if (!chefProfileId) return

  const db = createServerClient({ admin: true })
  await db.from('hub_messages').insert({
    group_id: circle.groupId,
    author_profile_id: chefProfileId,
    message_type: 'system',
    body: 'A deposit request has been sent. Please check your email for payment details.',
    metadata: {
      system_event_type: 'payment_requested',
      event_id: eventId,
    },
  })
}

export async function postGenericProgressToCircle(eventId: string, message: string): Promise<void> {
  const circle = await getCircleForEvent(eventId)
  if (!circle) return

  const chefProfileId = await getChefHubProfileId(circle.tenantId)
  if (!chefProfileId) return

  const db = createServerClient({ admin: true })
  await db.from('hub_messages').insert({
    group_id: circle.groupId,
    author_profile_id: chefProfileId,
    message_type: 'system',
    body: message,
    metadata: {
      system_event_type: 'progress_update',
      event_id: eventId,
    },
  })
}
