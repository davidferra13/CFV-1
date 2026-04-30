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

type RadarActionMatch = {
  id: string
  chef_id: string
  item_id: string
  severity: RadarSeverity
  item: {
    id: string
    source_id: string
    title: string
    summary: string | null
    canonical_url: string
    category: RadarCategory
    source_published_at: string | null
    source: {
      name: string
      homepage_url: string | null
    } | null
  } | null
}

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

export async function createRadarReviewTask(
  id: string
): Promise<{ success: boolean; error?: string; taskId?: string }> {
  if (!id) return { success: false, error: 'Missing radar item.' }

  const user = await requireChef()
  const db: any = createServerClient()
  const match = await loadRadarActionMatch(db, id, user.entityId)
  if (!match) return { success: false, error: 'Radar item not found.' }

  const today = localDateISO(new Date())
  const title = `Review Radar: ${match.item?.title ?? 'Source item'}`.slice(0, 180)
  const { data, error } = await db
    .from('tasks')
    .insert({
      chef_id: user.tenantId!,
      title,
      description: buildRadarTaskDescription(match),
      due_date: today,
      due_time: null,
      priority: taskPriorityForSeverity(match.severity),
      status: 'pending',
      notes: `Created from Culinary Radar match ${match.id}.`,
      recurring_rule: null,
    })
    .select('id')
    .single()

  if (error) {
    return { success: false, error: error.message ?? 'Could not create Radar task.' }
  }

  revalidatePath('/radar')
  revalidatePath('/tasks')
  return { success: true, taskId: data.id }
}

export async function createRadarVendorLead(
  id: string
): Promise<{ success: boolean; error?: string; vendorId?: string; duplicate?: boolean }> {
  if (!id) return { success: false, error: 'Missing radar item.' }

  const user = await requireChef()
  const db: any = createServerClient()
  const match = await loadRadarActionMatch(db, id, user.entityId)
  if (!match) return { success: false, error: 'Radar item not found.' }
  if (match.item?.category !== 'local') {
    return { success: false, error: 'Only local sourcing Radar items can become vendor leads.' }
  }

  const name = `Local source: ${match.item.title}`.slice(0, 160)
  const existing = await db
    .from('vendors')
    .select('id')
    .eq('chef_id', user.tenantId!)
    .eq('name', name)
    .limit(1)

  if (existing.error) {
    return { success: false, error: existing.error.message ?? 'Could not check vendor leads.' }
  }

  const duplicate = existing.data?.[0]
  if (duplicate?.id) {
    return { success: true, vendorId: duplicate.id, duplicate: true }
  }

  const { data, error } = await db
    .from('vendors')
    .insert({
      chef_id: user.tenantId!,
      name,
      vendor_type: 'farm',
      website: match.item.canonical_url,
      notes: buildRadarVendorNotes(match),
      status: 'active',
      is_preferred: false,
    })
    .select('id')
    .single()

  if (error) {
    return { success: false, error: error.message ?? 'Could not create vendor lead.' }
  }

  revalidatePath('/radar')
  revalidatePath('/vendors')
  revalidatePath('/culinary/vendors')
  return { success: true, vendorId: data.id }
}

export async function createRadarMarketCalendarNote(
  id: string
): Promise<{ success: boolean; error?: string; calendarEntryId?: string; duplicate?: boolean }> {
  if (!id) return { success: false, error: 'Missing radar item.' }

  const user = await requireChef()
  const db: any = createServerClient()
  const match = await loadRadarActionMatch(db, id, user.entityId)
  if (!match) return { success: false, error: 'Radar item not found.' }
  if (match.item?.category !== 'local') {
    return { success: false, error: 'Only local sourcing Radar items can become market notes.' }
  }

  const today = localDateISO(new Date())
  const title = `Market sourcing: ${match.item.title}`.slice(0, 180)
  const existing = await db
    .from('chef_calendar_entries')
    .select('id')
    .eq('chef_id', user.tenantId!)
    .eq('entry_type', 'market')
    .eq('title', title)
    .eq('start_date', today)
    .limit(1)

  if (existing.error) {
    return { success: false, error: existing.error.message ?? 'Could not check calendar notes.' }
  }

  const duplicate = existing.data?.[0]
  if (duplicate?.id) {
    return { success: true, calendarEntryId: duplicate.id, duplicate: true }
  }

  const { data, error } = await db
    .from('chef_calendar_entries')
    .insert({
      chef_id: user.tenantId!,
      entry_type: 'market',
      title,
      description: buildRadarMarketNote(match),
      start_date: today,
      end_date: today,
      all_day: true,
      start_time: null,
      end_time: null,
      blocks_bookings: false,
      is_revenue_generating: false,
      revenue_type: null,
      expected_revenue_cents: null,
      revenue_notes: null,
      is_public: false,
      public_note: null,
      color_override: null,
    })
    .select('id')
    .single()

  if (error) {
    return { success: false, error: error.message ?? 'Could not create market calendar note.' }
  }

  revalidatePath('/radar')
  revalidatePath('/calendar')
  return { success: true, calendarEntryId: data.id }
}

async function loadRadarActionMatch(
  db: any,
  id: string,
  chefId: string
): Promise<RadarActionMatch | null> {
  const matchResult = await db
    .from('chef_radar_matches')
    .select('id, chef_id, item_id, severity')
    .eq('id', id)
    .eq('chef_id', chefId)
    .single()

  if (matchResult.error || !matchResult.data) return null

  const match = matchResult.data as Omit<RadarActionMatch, 'item'>
  const itemResult = await db
    .from('culinary_radar_items')
    .select('id, source_id, title, summary, canonical_url, category, source_published_at')
    .eq('id', match.item_id)
    .single()

  if (itemResult.error || !itemResult.data) return { ...match, item: null }

  const item = itemResult.data as RadarActionMatch['item'] & { source_id: string }
  const sourceResult = await db
    .from('culinary_radar_sources')
    .select('name, homepage_url')
    .eq('id', item.source_id)
    .single()

  return {
    ...match,
    item: {
      ...item,
      source: sourceResult.error ? null : sourceResult.data,
    },
  }
}

function buildRadarTaskDescription(match: RadarActionMatch): string {
  const item = match.item
  const sourceName = item?.source?.name ?? 'External source'
  const summary = item?.summary ? `\n\nSummary: ${item.summary}` : ''
  return [
    `Review this Culinary Radar item from ${sourceName}.`,
    `Source: ${item?.canonical_url ?? 'No source URL'}`,
    summary,
  ]
    .filter(Boolean)
    .join('\n')
}

function buildRadarVendorNotes(match: RadarActionMatch): string {
  return [
    'Created from a Culinary Radar local sourcing signal.',
    `Source: ${match.item?.canonical_url ?? 'No source URL'}`,
    'Confirm specific market vendors, hours, accepted payment, product fit, and delivery options before marking preferred.',
  ].join('\n')
}

function buildRadarMarketNote(match: RadarActionMatch): string {
  return [
    'Culinary Radar local sourcing note.',
    `Source: ${match.item?.canonical_url ?? 'No source URL'}`,
    'Search by ZIP code or event city. Confirm actual market hours before using this note for procurement.',
  ].join('\n')
}

function taskPriorityForSeverity(severity: RadarSeverity): 'low' | 'medium' | 'high' | 'urgent' {
  if (severity === 'critical') return 'urgent'
  if (severity === 'high') return 'high'
  if (severity === 'medium') return 'medium'
  return 'low'
}

function localDateISO(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}
