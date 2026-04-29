'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  loadRadarDataForChef,
  loadRadarPreferencesForChef,
  radarCategories,
} from '@/lib/culinary-radar/read-model'
import type {
  RadarCategory,
  RadarLoadResult,
  RadarPreferenceLoadResult,
  RadarSeverity,
} from '@/lib/culinary-radar/view-model'

const SEVERITIES: RadarSeverity[] = ['critical', 'high', 'medium', 'low', 'info']
const DIGEST_FREQUENCIES = ['immediate', 'daily', 'weekly', 'never'] as const

export async function getRadarOverview(): Promise<RadarLoadResult> {
  const user = await requireChef()
  return loadRadarDataForChef(user.entityId)
}

export async function getRadarPreferences(): Promise<RadarPreferenceLoadResult> {
  const user = await requireChef()
  return loadRadarPreferencesForChef(user.entityId)
}

export async function updateRadarPreference(
  input: FormData
): Promise<{ success: boolean; error?: string }> {
  const category = String(input.get('category') ?? '') as RadarCategory
  const enabled = input.get('enabled') === 'true'
  const emailEnabled = input.get('emailEnabled') === 'true'
  const minAlertSeverity = String(input.get('minAlertSeverity') ?? 'high') as RadarSeverity
  const digestFrequency = String(input.get('digestFrequency') ?? 'daily')

  if (!radarCategories().includes(category)) {
    return { success: false, error: 'Invalid radar category.' }
  }
  if (!SEVERITIES.includes(minAlertSeverity)) {
    return { success: false, error: 'Invalid alert severity.' }
  }
  if (!DIGEST_FREQUENCIES.includes(digestFrequency as (typeof DIGEST_FREQUENCIES)[number])) {
    return { success: false, error: 'Invalid digest frequency.' }
  }

  const user = await requireChef()
  const db: any = createServerClient()
  const { error } = await db.from('chef_radar_preferences').upsert(
    {
      chef_id: user.entityId,
      category,
      enabled,
      email_enabled: emailEnabled,
      min_alert_severity: minAlertSeverity,
      digest_frequency: digestFrequency,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chef_id,category' }
  )

  if (error) {
    return { success: false, error: error.message ?? 'Could not update radar preference.' }
  }

  revalidatePath('/radar')
  revalidatePath('/dashboard')
  revalidatePath('/briefing')
  revalidatePath('/daily')
  return { success: true }
}

export async function markRadarMatchRead(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!id) return { success: false, error: 'Missing radar item.' }

  const user = await requireChef()
  const db: any = createServerClient()
  const { error } = await db
    .from('chef_radar_matches')
    .update({ delivery_state: 'read', read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    return { success: false, error: error.message ?? 'Could not mark radar item read.' }
  }

  revalidatePath('/radar')
  revalidatePath('/dashboard')
  revalidatePath('/briefing')
  revalidatePath('/daily')
  return { success: true }
}

export async function dismissRadarMatch(id: string): Promise<{ success: boolean; error?: string }> {
  if (!id) return { success: false, error: 'Missing radar item.' }

  const user = await requireChef()
  const db: any = createServerClient()
  const { error } = await db
    .from('chef_radar_matches')
    .update({ delivery_state: 'dismissed', dismissed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    return { success: false, error: error.message ?? 'Could not dismiss radar item.' }
  }

  revalidatePath('/radar')
  revalidatePath('/dashboard')
  revalidatePath('/briefing')
  revalidatePath('/daily')
  return { success: true }
}

export async function markRadarMatchUseful(
  id: string,
  useful: boolean
): Promise<{ success: boolean; error?: string }> {
  if (!id) return { success: false, error: 'Missing radar item.' }

  const user = await requireChef()
  const db: any = createServerClient()
  const { error } = await db
    .from('chef_radar_matches')
    .update({ useful_feedback: useful, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    return { success: false, error: error.message ?? 'Could not save radar feedback.' }
  }

  revalidatePath('/radar')
  return { success: true }
}
