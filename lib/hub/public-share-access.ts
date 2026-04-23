export type PublicShareAccessRecord = {
  event_id: string
  tenant_id: string
  is_active: boolean
  expires_at: string | null
}

export function resolvePublicShareDinnerCircleAccess(input: {
  share: PublicShareAccessRecord | null | undefined
  eventId: string
  eventTitle: string
  now?: Date
}) {
  const now = input.now ?? new Date()
  const share = input.share

  if (!share) {
    throw new Error('Share link not found')
  }

  if (!share.is_active) {
    throw new Error('Share link is inactive')
  }

  if (share.event_id !== input.eventId) {
    throw new Error('Share link does not match this event')
  }

  if (share.expires_at && new Date(share.expires_at) < now) {
    throw new Error('Share link has expired')
  }

  return {
    eventId: input.eventId,
    tenantId: share.tenant_id,
    eventTitle: input.eventTitle,
  }
}
