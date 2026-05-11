'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export type CommunicationPreferences = {
  preferred_contact_method: 'email' | 'sms' | 'phone' | 'circle'
  notification_frequency: 'immediate' | 'daily_digest' | 'weekly_digest'
  marketing_opt_in: boolean
}

export async function getClientCommunicationPreferences(): Promise<CommunicationPreferences> {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data: client } = await db
    .from('clients')
    .select('preferred_contact_method, notification_frequency, marketing_opt_in')
    .eq('id', user.entityId)
    .single()

  return {
    preferred_contact_method: client?.preferred_contact_method || 'email',
    notification_frequency: client?.notification_frequency || 'immediate',
    marketing_opt_in: client?.marketing_opt_in ?? true,
  }
}

export async function updateClientCommunicationPreferences(
  prefs: Partial<CommunicationPreferences>
): Promise<{ success: boolean }> {
  const user = await requireClient()
  const db: any = createServerClient()

  const validMethods = ['email', 'sms', 'phone', 'circle']
  const validFreqs = ['immediate', 'daily_digest', 'weekly_digest']

  const updates: Record<string, unknown> = {}

  if (prefs.preferred_contact_method && validMethods.includes(prefs.preferred_contact_method)) {
    updates.preferred_contact_method = prefs.preferred_contact_method
  }
  if (prefs.notification_frequency && validFreqs.includes(prefs.notification_frequency)) {
    updates.notification_frequency = prefs.notification_frequency
  }
  if (typeof prefs.marketing_opt_in === 'boolean') {
    updates.marketing_opt_in = prefs.marketing_opt_in
  }

  if (Object.keys(updates).length === 0) {
    return { success: true }
  }

  const { error } = await db.from('clients').update(updates).eq('id', user.entityId)

  if (error) {
    console.error('[updateClientCommunicationPreferences] Error:', error)
    throw new Error('Failed to update communication preferences')
  }

  revalidatePath('/my-profile')
  return { success: true }
}
