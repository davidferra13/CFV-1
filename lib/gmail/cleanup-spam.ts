// Retroactive Spam Cleanup
// One-time action to resolve existing spam/marketing emails that entered
// the triage inbox before the classification-before-ingestion fix.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

/** Known marketing/notification domains - same list as classify.ts heuristic */
const KNOWN_MARKETING_DOMAINS = [
  'turbotax.intuit.com',
  'rocketmoney.com',
  'email.rocketmoney.com',
  'creditkarma.com',
  'airbnb.com',
  'ifttt.com',
  'notify.cloudflare.com',
  'mailchimpapp.com',
  'ssa.gov',
  'ngrok.com',
  'smartarget.online',
  'realnex.com',
  'inform.bill.com',
  'mc.bill.com',
  'messages.wix.com',
  'mail.replit.com',
  'peakeventservices.com',
  'vendors.goodfynd.com',
]

/** Known marketing sender email patterns */
const KNOWN_MARKETING_SENDERS = [
  'apps-scripts-notifications@google.com',
  'forwarding-noreply@google.com',
]

/**
 * Clean up existing spam/marketing emails in the triage inbox.
 * Resolves communication events from known marketing senders and
 * closes their conversation threads.
 *
 * Returns the count of events cleaned up.
 */
export async function cleanupExistingSpam(): Promise<{ cleaned: number; total: number }> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  // Get all unresolved communication events for this tenant
  const { data: events, error } = await db
    .from('communication_events' as any)
    .select('id, sender_identity, thread_id, status')
    .eq('tenant_id', user.tenantId!)
    .neq('status', 'resolved')
    .order('created_at', { ascending: false })

  if (error || !events) {
    console.error('[Cleanup] Failed to fetch events:', error)
    return { cleaned: 0, total: 0 }
  }

  const total = events.length
  const spamEventIds: string[] = []
  const spamThreadIds = new Set<string>()

  for (const event of events as any[]) {
    const identity = (event.sender_identity || '').toLowerCase()

    // Extract email from "Name <email>" format
    const emailMatch = identity.match(/<([^>]+)>/) || identity.match(/([^\s]+@[^\s]+)/)
    if (!emailMatch) continue

    const email = emailMatch[1]
    const isMarketingSender = KNOWN_MARKETING_SENDERS.some((s) => email === s)
    const isMarketingDomain = KNOWN_MARKETING_DOMAINS.some((d) => email.includes(d))
    const isNoreply =
      /^(noreply|no-reply|do-not-reply|notifications?|alerts?|info|hello|team|support|marketing|account-services)@/.test(
        email
      )

    if (isMarketingSender || isMarketingDomain || isNoreply) {
      spamEventIds.push(event.id)
      if (event.thread_id) spamThreadIds.add(event.thread_id)
    }
  }

  if (spamEventIds.length === 0) {
    return { cleaned: 0, total }
  }

  // Batch resolve all spam events
  await db
    .from('communication_events' as any)
    .update({ status: 'resolved' })
    .eq('tenant_id', user.tenantId!)
    .in('id', spamEventIds)

  // Close their threads
  if (spamThreadIds.size > 0) {
    await db
      .from('conversation_threads' as any)
      .update({ state: 'closed', snoozed_until: null })
      .eq('tenant_id', user.tenantId!)
      .in('id', Array.from(spamThreadIds))
  }

  console.log(
    `[Cleanup] Resolved ${spamEventIds.length} spam/marketing events out of ${total} total`
  )

  return { cleaned: spamEventIds.length, total }
}
