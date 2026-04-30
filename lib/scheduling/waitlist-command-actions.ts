'use server'

import {
  convertWaitlistToEvent,
  removeFromWaitlist,
  updateWaitlistEntry,
} from '@/lib/scheduling/waitlist-actions'

export async function markWaitlistContacted(
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  if (!entryId.trim()) {
    return { success: false, error: 'Waitlist entry is required' }
  }

  try {
    await updateWaitlistEntry(entryId, {
      status: 'contacted',
      contacted_at: new Date().toISOString(),
    })
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update waitlist guest',
    }
  }
}

export async function dismissWaitlistEntry(
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  if (!entryId.trim()) {
    return { success: false, error: 'Waitlist entry is required' }
  }

  return removeFromWaitlist(entryId)
}

export async function convertWaitlistEntryToEvent(
  entryId: string
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  if (!entryId.trim()) {
    return { success: false, error: 'Waitlist entry is required' }
  }

  try {
    const eventId = await convertWaitlistToEvent(entryId)
    return { success: true, eventId }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to convert waitlist guest',
    }
  }
}
