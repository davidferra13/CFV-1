// Post-Event Follow-Up Jobs — Inngest Background Functions
//
// These jobs run on a delayed schedule after an event is marked as completed:
//   - Thank-you email:   3 days after completion
//   - Review request:    7 days after completion
//   - Referral ask:     14 days after completion
//
// Each job:
//   1. Looks up the event and client from the database
//   2. Skips if the event was cancelled or client opted out of marketing
//   3. Sends the email via the existing Resend-based email system
//   4. Logs success/failure
//
// All jobs are non-blocking side effects — failures are logged, never thrown.

import { inngest } from './inngest-client'
import { createAdminClient } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/logger'

const log = createLogger('inngest-jobs')

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

/**
 * Shared helper: fetch event + client + chef data for a post-event job.
 * Returns null if the job should be skipped (cancelled event, no client email,
 * client opted out of marketing, etc).
 */
async function getPostEventContext(eventId: string, tenantId: string, clientId: string) {
  const supabase = createAdminClient()

  // Fetch event — verify it's still completed (not somehow cancelled after trigger)
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id, status, occasion, event_date, tenant_id, client_id')
    .eq('id', eventId)
    .single()

  if (eventErr || !event) {
    log.warn('Post-event job: event not found', { context: { eventId, error: eventErr } })
    return null
  }

  if (event.status === 'cancelled') {
    log.info('Post-event job: skipping — event was cancelled', { context: { eventId } })
    return null
  }

  // Fetch client
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id, email, full_name, marketing_unsubscribed, loyalty_tier, loyalty_points')
    .eq('id', clientId)
    .single()

  if (clientErr || !client) {
    log.warn('Post-event job: client not found', { context: { clientId, error: clientErr } })
    return null
  }

  if (!client.email) {
    log.info('Post-event job: skipping — client has no email', { context: { clientId } })
    return null
  }

  if (client.marketing_unsubscribed) {
    log.info('Post-event job: skipping — client opted out of marketing', {
      context: { clientId },
    })
    return null
  }

  // Fetch chef/business name
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name')
    .eq('id', tenantId)
    .single()

  const { data: loyaltyEarnRows } = await supabase
    .from('loyalty_transactions')
    .select('points')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('event_id', eventId)
    .in('type', ['earned', 'bonus'])

  const loyaltyPointsEarned = (loyaltyEarnRows || []).reduce(
    (sum, row) => sum + (row.points || 0),
    0
  )

  return {
    event,
    client: {
      email: client.email,
      name: client.full_name || 'there',
    },
    chefName: chef?.business_name || 'Your Chef',
    occasion: event.occasion || 'your event',
    eventDate: event.event_date,
    loyalty: {
      tier: (client as any).loyalty_tier ?? null,
      pointsBalance: (client as any).loyalty_points ?? null,
      pointsEarned: loyaltyPointsEarned,
    },
  }
}

// ─── Job 1: Thank-You Email (3 days after completion) ───────────────────────

export const postEventThankYou = inngest.createFunction(
  {
    id: 'post-event-thank-you',
    name: 'Post-Event Thank You Email',
    retries: 2,
  },
  { event: 'chefflow/event.completed' },
  async ({ event, step }) => {
    // Wait 3 days
    await step.sleep('wait-3-days', '3d')

    const result = await step.run('send-thank-you-email', async () => {
      const ctx = await getPostEventContext(
        event.data.eventId,
        event.data.tenantId,
        event.data.clientId
      )
      if (!ctx) return { skipped: true, reason: 'context unavailable or opted out' }

      const { sendPostEventThankYouEmail } = await import('@/lib/email/notifications')

      await sendPostEventThankYouEmail({
        clientEmail: ctx.client.email,
        clientName: ctx.client.name,
        chefName: ctx.chefName,
        occasion: ctx.occasion,
        eventDate: ctx.eventDate,
        bookAgainUrl: `${APP_URL}/book`,
        loyaltyTier: ctx.loyalty.tier,
        loyaltyPointsEarned: ctx.loyalty.pointsEarned,
        loyaltyPointsBalance: ctx.loyalty.pointsBalance,
      })

      log.info('Post-event thank-you email sent', {
        context: { eventId: event.data.eventId, clientEmail: ctx.client.email },
      })

      return { sent: true, to: ctx.client.email }
    })

    return result
  }
)

// ─── Job 2: Review Request (7 days after completion) ────────────────────────

export const postEventReviewRequest = inngest.createFunction(
  {
    id: 'post-event-review-request',
    name: 'Post-Event Review Request Email',
    retries: 2,
  },
  { event: 'chefflow/event.completed' },
  async ({ event, step }) => {
    // Wait 7 days
    await step.sleep('wait-7-days', '7d')

    const result = await step.run('send-review-request-email', async () => {
      const ctx = await getPostEventContext(
        event.data.eventId,
        event.data.tenantId,
        event.data.clientId
      )
      if (!ctx) return { skipped: true, reason: 'context unavailable or opted out' }

      const { sendPostEventReviewRequestEmail } = await import('@/lib/email/notifications')

      await sendPostEventReviewRequestEmail({
        clientEmail: ctx.client.email,
        clientName: ctx.client.name,
        chefName: ctx.chefName,
        occasion: ctx.occasion,
        eventDate: ctx.eventDate,
        reviewUrl: `${APP_URL}/my-events/${event.data.eventId}#review`,
      })

      log.info('Post-event review request email sent', {
        context: { eventId: event.data.eventId, clientEmail: ctx.client.email },
      })

      return { sent: true, to: ctx.client.email }
    })

    return result
  }
)

// ─── Job 3: Referral Ask (14 days after completion) ─────────────────────────

export const postEventReferralAsk = inngest.createFunction(
  {
    id: 'post-event-referral-ask',
    name: 'Post-Event Referral Ask Email',
    retries: 2,
  },
  { event: 'chefflow/event.completed' },
  async ({ event, step }) => {
    // Wait 14 days
    await step.sleep('wait-14-days', '14d')

    const result = await step.run('send-referral-ask-email', async () => {
      const ctx = await getPostEventContext(
        event.data.eventId,
        event.data.tenantId,
        event.data.clientId
      )
      if (!ctx) return { skipped: true, reason: 'context unavailable or opted out' }

      const { sendPostEventReferralAskEmail } = await import('@/lib/email/notifications')

      await sendPostEventReferralAskEmail({
        clientEmail: ctx.client.email,
        clientName: ctx.client.name,
        chefName: ctx.chefName,
        occasion: ctx.occasion,
        bookingUrl: `${APP_URL}/book`,
      })

      log.info('Post-event referral ask email sent', {
        context: { eventId: event.data.eventId, clientEmail: ctx.client.email },
      })

      return { sent: true, to: ctx.client.email }
    })

    return result
  }
)
