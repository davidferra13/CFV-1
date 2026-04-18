'use server'

import { createAdminClient } from '@/lib/db/admin'
import { sendEmail } from '@/lib/email/send'

/**
 * Public action: save an email + location to the directory waitlist.
 * Called when a consumer searches /chefs and gets zero results.
 * No auth required (public surface).
 */
export async function joinDirectoryWaitlist(
  email: string,
  location: string
): Promise<{ success: boolean; error?: string }> {
  const trimmedEmail = email.trim().toLowerCase()
  const trimmedLocation = location.trim()

  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' }
  }
  if (!trimmedLocation || trimmedLocation.length < 2) {
    return { success: false, error: 'Please enter a location.' }
  }
  if (trimmedEmail.length > 320 || trimmedLocation.length > 300) {
    return { success: false, error: 'Input too long.' }
  }

  try {
    const db = createAdminClient()
    // Upsert: if same email + location exists, just update created_at
    await db.from('directory_waitlist').upsert(
      {
        email: trimmedEmail,
        location: trimmedLocation,
      },
      { onConflict: 'lower(email), lower(location)' }
    )
    return { success: true }
  } catch (err: any) {
    // Unique constraint violation = already signed up, treat as success
    if (err?.code === '23505') {
      return { success: true }
    }
    console.error('[directory-waitlist] Failed to save:', err)
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}

/**
 * Sweep: find waitlist entries that match recently-joined chefs and notify them.
 * Matching: waitlist location (freetext) is checked against chef home_city and home_state
 * using case-insensitive substring matching.
 * Called from /api/scheduled/waitlist-directory-sweep cron (daily).
 */
export async function sweepDirectoryWaitlist(): Promise<{
  checked: number
  notified: number
  errors: number
}> {
  const db = createAdminClient()
  let checked = 0
  let notified = 0
  let errors = 0

  // Get un-notified waitlist entries (limit batch to prevent runaway)
  const { data: waitlistEntries } = await db
    .from('directory_waitlist')
    .select('id, email, location')
    .is('notified_at', null)
    .order('created_at', { ascending: true })
    .limit(200)

  if (!waitlistEntries || waitlistEntries.length === 0) {
    return { checked: 0, notified: 0, errors: 0 }
  }

  // Get all discoverable chefs with city/state
  const { data: chefs } = await db
    .from('chefs')
    .select('id, display_name, home_city, home_state, public_slug')
    .not('public_slug', 'is', null)
    .not('home_city', 'is', null)

  if (!chefs || chefs.length === 0) {
    return { checked: waitlistEntries.length, notified: 0, errors: 0 }
  }

  for (const entry of waitlistEntries) {
    checked++
    const loc = (entry.location as string).toLowerCase()

    // Find chefs whose city or state appears in the waitlist location
    const matches = (chefs as any[]).filter((c) => {
      const city = ((c.home_city as string) || '').toLowerCase()
      const state = ((c.home_state as string) || '').toLowerCase()
      return (city && loc.includes(city)) || (state && loc.includes(state))
    })

    if (matches.length === 0) continue

    try {
      const chefNames = matches
        .slice(0, 3)
        .map((c: any) => c.display_name || 'A new chef')
        .join(', ')
      const browseUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'}/chefs?location=${encodeURIComponent(entry.location as string)}`

      await sendEmail({
        to: entry.email as string,
        subject: `A chef is now available near ${entry.location}`,
        react: (await import('@/lib/email/templates/waitlist-match')).WaitlistMatchEmail({
          location: entry.location as string,
          chefNames,
          matchCount: matches.length,
          browseUrl,
        }),
      })

      // Mark as notified
      await db
        .from('directory_waitlist')
        .update({ notified_at: new Date().toISOString() })
        .eq('id', entry.id)

      notified++
    } catch (err) {
      errors++
      console.error(`[directory-waitlist] Failed to notify ${entry.email}:`, err)
    }
  }

  return { checked, notified, errors }
}
