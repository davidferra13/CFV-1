import type { ActionResult } from './types'

/**
 * After an action executes, auto-post progress to the associated Dinner Circle.
 * Non-blocking: failures silently swallowed (progress signaling is best-effort).
 */
export async function postActionResultToCircle(result: ActionResult): Promise<void> {
  if (!result.success || !result.circleNotification) return

  const { type, data } = result.circleNotification
  const eventId = (data.eventId as string) ?? ''
  if (!eventId) return

  try {
    switch (type) {
      case 'payment_requested': {
        const { postPaymentRequestToCircle } = await import('./circle-signals')
        await postPaymentRequestToCircle(eventId)
        break
      }
      case 'payment_received': {
        const { postPaymentReceivedToCircle } = await import('@/lib/hub/circle-lifecycle-hooks')
        await postPaymentReceivedToCircle({
          eventId,
          amountCents: (data.amountCents as number) ?? 0,
          paymentType: (data.paymentType as string) ?? 'payment',
        })
        break
      }
      case 'quote_sent': {
        const { postGenericProgressToCircle } = await import('./circle-signals')
        await postGenericProgressToCircle(
          eventId,
          'A quote has been sent for your review. Check your email for details.'
        )
        break
      }
      case 'event_confirmed': {
        const { postEventConfirmedToCircle } = await import('@/lib/hub/circle-lifecycle-hooks')
        await postEventConfirmedToCircle({
          eventId,
          eventDate: (data.eventDate as string) ?? null,
        })
        break
      }
      case 'event_cancelled': {
        // No existing lifecycle hook for cancellation - post generic system message
        const { postGenericProgressToCircle } = await import('./circle-signals')
        await postGenericProgressToCircle(eventId, 'Event has been cancelled.')
        break
      }
      case 'contract_ready': {
        const { postGenericProgressToCircle } = await import('./circle-signals')
        await postGenericProgressToCircle(eventId, 'Contract sent for review and signing.')
        break
      }
      default:
        break
    }
  } catch {
    // Progress signaling is best-effort
  }
}
