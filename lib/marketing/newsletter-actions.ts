'use server'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Subscribe an email to the ChefFlow newsletter.
 * Stores in a simple `newsletter_subscribers` table.
 * Idempotent — re-subscribing the same email just updates the timestamp.
 */
export async function subscribeToNewsletter(
  email: string
): Promise<{ success: boolean; error?: string }> {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  try {
    const supabase: any = createAdminClient()

    const { error } = await supabase
      .from('newsletter_subscribers')
      .upsert(
        { email: email.toLowerCase().trim(), subscribed_at: new Date().toISOString() },
        { onConflict: 'email' }
      )

    if (error) {
      console.error('[newsletter] Subscribe failed:', error)
      return { success: false, error: 'Something went wrong. Please try again.' }
    }

    return { success: true }
  } catch (err) {
    console.error('[newsletter] Unexpected error:', err)
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}
