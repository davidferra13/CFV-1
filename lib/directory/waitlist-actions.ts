'use server'

import { createAdminClient } from '@/lib/db/admin'

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
