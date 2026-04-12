// OneSignal - push notifications
// https://onesignal.com/
// Unlimited web push free, no credit card
// Event reminders, inquiry alerts, payment notifications

/**
 * OneSignal push notification integration.
 *
 * Client-side setup requires:
 *   npm install @onesignal/onesignal-react
 *
 * Env vars:
 *   NEXT_PUBLIC_ONESIGNAL_APP_ID - your OneSignal app ID
 *   ONESIGNAL_REST_API_KEY - for server-side push (keep secret)
 *
 * This file handles server-side push sending via REST API.
 * Client-side subscription is handled by the OneSignal SDK in the browser.
 */

const ONESIGNAL_API = 'https://onesignal.com/api/v1'

interface PushNotification {
  title: string
  message: string
  url?: string // URL to open when tapped
  data?: Record<string, string> // Custom data payload
}

function getAppId(): string {
  const id = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
  if (!id) throw new Error('NEXT_PUBLIC_ONESIGNAL_APP_ID not set')
  return id
}

function getRestApiKey(): string {
  const key = process.env.ONESIGNAL_REST_API_KEY
  if (!key) throw new Error('ONESIGNAL_REST_API_KEY not set')
  return key
}

/**
 * Send a push notification to a specific user by their external user ID.
 * The external ID should match the Auth.js user ID.
 */
export async function sendPushToUser(
  userId: string,
  notification: PushNotification
): Promise<boolean> {
  try {
    const res = await fetch(`${ONESIGNAL_API}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${getRestApiKey()}`,
      },
      body: JSON.stringify({
        app_id: getAppId(),
        include_external_user_ids: [userId],
        headings: { en: notification.title },
        contents: { en: notification.message },
        url: notification.url,
        data: notification.data,
      }),
    })
    return res.ok
  } catch (err) {
    console.error('[onesignal] sendPushToUser failed:', err)
    return false
  }
}

/**
 * Send a push notification to all subscribed users.
 * Use sparingly - for system-wide announcements only.
 */
export async function sendPushToAll(notification: PushNotification): Promise<boolean> {
  try {
    const res = await fetch(`${ONESIGNAL_API}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${getRestApiKey()}`,
      },
      body: JSON.stringify({
        app_id: getAppId(),
        included_segments: ['All'],
        headings: { en: notification.title },
        contents: { en: notification.message },
        url: notification.url,
        data: notification.data,
      }),
    })
    return res.ok
  } catch (err) {
    console.error('[onesignal] sendPushToAll failed:', err)
    return false
  }
}

// ─── ChefFlow-specific notification helpers ───

/**
 * Notify chef about a new inquiry.
 */
export async function notifyNewInquiry(
  chefUserId: string,
  clientName: string,
  eventDate: string
): Promise<boolean> {
  return sendPushToUser(chefUserId, {
    title: 'New Inquiry',
    message: `${clientName} is interested in booking ${eventDate}`,
    url: '/inquiries',
  })
}

/**
 * Notify chef about a payment received.
 */
export async function notifyPaymentReceived(
  chefUserId: string,
  amount: string,
  clientName: string
): Promise<boolean> {
  return sendPushToUser(chefUserId, {
    title: 'Payment Received',
    message: `${clientName} paid ${amount}`,
    url: '/finances',
  })
}

/**
 * Notify client about an upcoming event (reminder).
 */
export async function notifyEventReminder(
  clientUserId: string,
  eventName: string,
  eventDate: string,
  eventId: string
): Promise<boolean> {
  return sendPushToUser(clientUserId, {
    title: 'Event Reminder',
    message: `Your event "${eventName}" is on ${eventDate}`,
    url: `/events/${eventId}`,
  })
}

/**
 * Notify client that their quote is ready.
 */
export async function notifyQuoteReady(
  clientUserId: string,
  chefName: string,
  eventId: string
): Promise<boolean> {
  return sendPushToUser(clientUserId, {
    title: 'Quote Ready',
    message: `${chefName} sent you a quote - tap to review`,
    url: `/events/${eventId}`,
  })
}

/**
 * Notify chef that a client accepted their proposal.
 */
export async function notifyProposalAccepted(
  chefUserId: string,
  eventName: string,
  eventId: string
): Promise<boolean> {
  return sendPushToUser(chefUserId, {
    title: 'Proposal Accepted',
    message: `${eventName} - client accepted your proposal`,
    url: `/events/${eventId}`,
  })
}

/**
 * Notify chef that an event has been confirmed.
 */
export async function notifyEventConfirmed(
  chefUserId: string,
  eventName: string,
  eventId: string
): Promise<boolean> {
  return sendPushToUser(chefUserId, {
    title: 'Event Confirmed',
    message: `${eventName} is now confirmed!`,
    url: `/events/${eventId}`,
  })
}

/**
 * Notify chef that an event is now in progress.
 */
export async function notifyEventInProgress(
  chefUserId: string,
  eventName: string,
  eventId: string
): Promise<boolean> {
  return sendPushToUser(chefUserId, {
    title: 'Event In Progress',
    message: `${eventName} is now in progress`,
    url: `/events/${eventId}`,
  })
}

/**
 * Notify chef that an event has been marked complete.
 */
export async function notifyEventCompleted(
  chefUserId: string,
  eventName: string,
  eventId: string
): Promise<boolean> {
  return sendPushToUser(chefUserId, {
    title: 'Event Complete',
    message: `${eventName} marked complete`,
    url: `/events/${eventId}`,
  })
}
