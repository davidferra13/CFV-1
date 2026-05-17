'use server'

import { createNotification } from '@/lib/notifications/actions'

export async function notifyCannabisAccessGranted(input: {
  recipientId: string
  tenantId: string
}) {
  await createNotification({
    tenantId: input.tenantId,
    recipientId: input.recipientId,
    category: 'system',
    action: 'cannabis_access_granted',
    title: 'Cannabis Dining Access Granted',
    body: 'You now have access to the cannabis dining portal.',
    actionUrl: '/my-cannabis',
    metadata: {},
  })
}

export async function notifyCannabisAccessRevoked(input: {
  recipientId: string
  tenantId: string
  reason?: string
}) {
  await createNotification({
    tenantId: input.tenantId,
    recipientId: input.recipientId,
    category: 'system',
    action: 'cannabis_access_revoked',
    title: 'Cannabis Dining Access Revoked',
    body: input.reason || 'Your cannabis dining access has been revoked.',
    actionUrl: '/my-events',
    metadata: { reason: input.reason },
  })
}

export async function notifyCannabisAgeRequired(input: { recipientId: string; tenantId: string }) {
  await createNotification({
    tenantId: input.tenantId,
    recipientId: input.recipientId,
    category: 'system',
    action: 'cannabis_age_required',
    title: 'Age Verification Required',
    body: 'Please complete age verification to access cannabis dining.',
    actionUrl: '/my-cannabis/age-required',
    metadata: {},
  })
}

export async function notifyCannabisAgeApproved(input: { recipientId: string; tenantId: string }) {
  await createNotification({
    tenantId: input.tenantId,
    recipientId: input.recipientId,
    category: 'system',
    action: 'cannabis_age_approved',
    title: 'Age Verification Approved',
    body: 'Your age verification is complete. Cannabis dining portal is now accessible.',
    actionUrl: '/my-cannabis',
    metadata: {},
  })
}

export async function notifyCannabisRequestSubmitted(input: {
  recipientId: string
  tenantId: string
  requestId: string
}) {
  await createNotification({
    tenantId: input.tenantId,
    recipientId: input.recipientId,
    category: 'event',
    action: 'cannabis_request_submitted',
    title: 'Cannabis Dinner Request Received',
    body: 'A new cannabis dinner request has been submitted for review.',
    actionUrl: '/admin/cannabis',
    metadata: { requestId: input.requestId },
  })
}

export async function notifyCannabisCloseoutPending(input: {
  recipientId: string
  tenantId: string
  eventId: string
}) {
  await createNotification({
    tenantId: input.tenantId,
    recipientId: input.recipientId,
    category: 'event',
    action: 'cannabis_closeout_pending',
    title: 'Cannabis Event Closeout Needed',
    body: 'A completed cannabis event is missing post-event documentation.',
    actionUrl: `/cannabis/events/${input.eventId}/control-packet`,
    metadata: { eventId: input.eventId },
  })
}
