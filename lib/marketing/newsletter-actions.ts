'use server'

import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/rateLimit'
import { createAdminClient } from '@/lib/db/admin'
import { recordPlatformEvent } from '@/lib/platform-observability/events'
import { extractRequestMetadata } from '@/lib/platform-observability/context'

type NewsletterSubscribeInput = {
  email: string
  website?: string
}

/**
 * Subscribe an email to the ChefFlow newsletter.
 * Stores in a simple `newsletter_subscribers` table.
 * Idempotent - re-subscribing the same email just updates the timestamp.
 */
export async function subscribeToNewsletter(
  input: NewsletterSubscribeInput
): Promise<{ success: boolean; error?: string }> {
  if (input.website?.trim()) {
    // Honeypot filled by bots; return success to avoid retries.
    return { success: true }
  }

  const email = input.email?.toLowerCase().trim()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  try {
    const hdrs = await headers()
    const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

    await checkRateLimit(`newsletter:ip:${ip}`, 12, 5 * 60_000)
    await checkRateLimit(`newsletter:email:${email}`, 4, 60 * 60_000)

    const db: any = createAdminClient()
    const { data: existingSubscriber } = await db
      .from('newsletter_subscribers')
      .select('id, unsubscribed_at')
      .eq('email', email)
      .maybeSingle()

    const { error } = await db.from('newsletter_subscribers').upsert(
      {
        email,
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null,
      },
      { onConflict: 'email' }
    )

    if (error) {
      console.error('[newsletter] Subscribe failed:', error)
      return { success: false, error: 'Something went wrong. Please try again.' }
    }

    if (!existingSubscriber || existingSubscriber.unsubscribed_at) {
      await recordPlatformEvent({
        eventKey: 'subscription.stay_updated_subscribed',
        source: 'public_marketing',
        actorType: 'anonymous',
        subjectType: 'newsletter_subscriber',
        subjectId: email,
        summary: `Stay Updated subscription captured for ${email}`,
        metadata: {
          ...extractRequestMetadata(hdrs),
          email,
          source: 'website_footer',
        },
        alertDedupeKey: `newsletter:${email}`,
      })
    }

    return { success: true }
  } catch (err) {
    console.error('[newsletter] Unexpected error:', err)
    if (err instanceof Error && err.message.includes('Too many attempts')) {
      return { success: false, error: 'Too many requests. Please try again shortly.' }
    }
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}
