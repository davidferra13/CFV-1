'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  NotificationPreference,
  NotificationCategory,
  NotificationChannel,
  NotificationSeverity,
  InterruptionLevel,
  QuietHours,
} from './notification-prefs-types'

// ---------------------------------------------------------------------------
// Category definitions (pure data)
// ---------------------------------------------------------------------------

const CATEGORIES: NotificationCategory[] = [
  {
    key: 'inquiries',
    label: 'Inquiries',
    description: 'New client inquiries and follow-ups',
    defaultSeverity: 'critical',
    defaultChannels: ['in_app', 'email'],
    allowMute: false,
  },
  {
    key: 'events',
    label: 'Events',
    description: 'Event updates, confirmations, and changes',
    defaultSeverity: 'important',
    defaultChannels: ['in_app', 'email'],
    allowMute: true,
  },
  {
    key: 'payments',
    label: 'Payments',
    description: 'Payment received, overdue, and refund alerts',
    defaultSeverity: 'critical',
    defaultChannels: ['in_app', 'email'],
    allowMute: false,
  },
  {
    key: 'reminders',
    label: 'Reminders',
    description: 'Prep timelines, deadlines, and scheduled tasks',
    defaultSeverity: 'important',
    defaultChannels: ['in_app'],
    allowMute: true,
  },
  {
    key: 'system',
    label: 'System',
    description: 'Account, security, and platform updates',
    defaultSeverity: 'informational',
    defaultChannels: ['in_app'],
    allowMute: true,
  },
  {
    key: 'ai_suggestions',
    label: 'AI Suggestions',
    description: 'Remy insights, pricing alerts, and smart recommendations',
    defaultSeverity: 'informational',
    defaultChannels: ['in_app'],
    allowMute: true,
  },
  {
    key: 'circle_updates',
    label: 'Circle Updates',
    description: 'Dinner circle activity, RSVPs, and member changes',
    defaultSeverity: 'informational',
    defaultChannels: ['in_app'],
    allowMute: true,
  },
  {
    key: 'client_actions',
    label: 'Client Actions',
    description: 'Menu submissions, dietary updates, and portal activity',
    defaultSeverity: 'important',
    defaultChannels: ['in_app', 'email'],
    allowMute: true,
  },
]

const VALID_SEVERITIES: NotificationSeverity[] = [
  'critical',
  'important',
  'informational',
  'silent',
]
const VALID_CHANNELS: NotificationChannel[] = ['push', 'email', 'sms', 'in_app']
const VALID_INTERRUPTION_LEVELS: InterruptionLevel[] = [
  'always',
  'business_hours',
  'urgent_only',
  'never',
]

// ---------------------------------------------------------------------------
// 1. Get notification preferences (with defaults for unconfigured categories)
// ---------------------------------------------------------------------------

export async function getNotificationPreferences(): Promise<NotificationPreference[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('notification_preferences')
    .select('*')
    .eq('tenant_id', user.id)

  if (error) throw new Error(`Failed to load notification preferences: ${error.message}`)

  const existing: Record<string, NotificationPreference> = {}
  for (const row of data || []) {
    existing[row.category] = mapPrefRow(row)
  }

  // Fill defaults for any unconfigured category
  const results: NotificationPreference[] = []
  for (const cat of CATEGORIES) {
    if (existing[cat.key]) {
      results.push(existing[cat.key])
    } else {
      results.push({
        id: '',
        tenantId: user.id,
        category: cat.key,
        severity: cat.defaultSeverity,
        channels: cat.defaultChannels,
        interruptionLevel: 'business_hours',
        mutedUntil: null,
        createdAt: '',
        updatedAt: '',
      })
    }
  }

  return results
}

// ---------------------------------------------------------------------------
// 2. Update notification preference (upsert)
// ---------------------------------------------------------------------------

export async function updateNotificationPreference(
  category: string,
  updates: Partial<{ severity: string; channels: string[]; interruptionLevel: string }>
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const validCategory = CATEGORIES.find((c) => c.key === category)
  if (!validCategory) throw new Error(`Invalid category: ${category}`)

  if (updates.severity && !VALID_SEVERITIES.includes(updates.severity as NotificationSeverity)) {
    throw new Error(`Invalid severity: ${updates.severity}`)
  }
  if (updates.channels) {
    for (const ch of updates.channels) {
      if (!VALID_CHANNELS.includes(ch as NotificationChannel)) {
        throw new Error(`Invalid channel: ${ch}`)
      }
    }
  }
  if (
    updates.interruptionLevel &&
    !VALID_INTERRUPTION_LEVELS.includes(updates.interruptionLevel as InterruptionLevel)
  ) {
    throw new Error(`Invalid interruption level: ${updates.interruptionLevel}`)
  }

  const now = new Date().toISOString()
  const payload: Record<string, unknown> = { updated_at: now }
  if (updates.severity) payload.severity = updates.severity
  if (updates.channels) payload.channels = updates.channels
  if (updates.interruptionLevel) payload.interruption_level = updates.interruptionLevel

  // Try update first
  const { data: existing } = await db
    .from('notification_preferences')
    .select('id')
    .eq('tenant_id', user.id)
    .eq('category', category)
    .maybeSingle()

  if (existing) {
    const { error } = await db
      .from('notification_preferences')
      .update(payload)
      .eq('tenant_id', user.id)
      .eq('category', category)

    if (error) throw new Error(`Failed to update notification preference: ${error.message}`)
  } else {
    const { error } = await db.from('notification_preferences').insert({
      tenant_id: user.id,
      category,
      severity: updates.severity || validCategory.defaultSeverity,
      channels: updates.channels || validCategory.defaultChannels,
      interruption_level: updates.interruptionLevel || 'business_hours',
      created_at: now,
      updated_at: now,
    })

    if (error) throw new Error(`Failed to create notification preference: ${error.message}`)
  }
}

// ---------------------------------------------------------------------------
// 3. Mute category (temporary mute with duration)
// ---------------------------------------------------------------------------

export async function muteCategory(category: string, durationMinutes: number): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const validCategory = CATEGORIES.find((c) => c.key === category)
  if (!validCategory) throw new Error(`Invalid category: ${category}`)
  if (!validCategory.allowMute) throw new Error(`Category "${category}" cannot be muted`)
  if (durationMinutes < 1 || durationMinutes > 43200)
    throw new Error('Duration must be between 1 and 43200 minutes')

  const mutedUntil = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
  const now = new Date().toISOString()

  // Upsert: set mutedUntil
  const { data: existing } = await db
    .from('notification_preferences')
    .select('id')
    .eq('tenant_id', user.id)
    .eq('category', category)
    .maybeSingle()

  if (existing) {
    const { error } = await db
      .from('notification_preferences')
      .update({ muted_until: mutedUntil, updated_at: now })
      .eq('tenant_id', user.id)
      .eq('category', category)

    if (error) throw new Error(`Failed to mute category: ${error.message}`)
  } else {
    const { error } = await db.from('notification_preferences').insert({
      tenant_id: user.id,
      category,
      severity: validCategory.defaultSeverity,
      channels: validCategory.defaultChannels,
      interruption_level: 'business_hours',
      muted_until: mutedUntil,
      created_at: now,
      updated_at: now,
    })

    if (error) throw new Error(`Failed to mute category: ${error.message}`)
  }
}

// ---------------------------------------------------------------------------
// 4. Unmute category
// ---------------------------------------------------------------------------

export async function unmuteCategory(category: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const validCategory = CATEGORIES.find((c) => c.key === category)
  if (!validCategory) throw new Error(`Invalid category: ${category}`)

  const { error } = await db
    .from('notification_preferences')
    .update({ muted_until: null, updated_at: new Date().toISOString() })
    .eq('tenant_id', user.id)
    .eq('category', category)

  if (error) throw new Error(`Failed to unmute category: ${error.message}`)
}

// ---------------------------------------------------------------------------
// 5. Get quiet hours config
// ---------------------------------------------------------------------------

export async function getQuietHours(): Promise<QuietHours> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('quiet_hours')
    .select('*')
    .eq('tenant_id', user.id)
    .maybeSingle()

  if (error) throw new Error(`Failed to load quiet hours: ${error.message}`)

  if (data) return mapQuietRow(data)

  // Return default (not yet persisted)
  return {
    id: '',
    tenantId: user.id,
    enabled: false,
    startTime: '22:00',
    endTime: '07:00',
    timezone: 'America/New_York',
    allowCritical: true,
  }
}

// ---------------------------------------------------------------------------
// 6. Update quiet hours
// ---------------------------------------------------------------------------

export async function updateQuietHours(config: {
  enabled: boolean
  startTime: string
  endTime: string
  timezone: string
  allowCritical: boolean
}): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (typeof config.enabled !== 'boolean') throw new Error('enabled must be a boolean')
  if (typeof config.allowCritical !== 'boolean') throw new Error('allowCritical must be a boolean')
  if (!config.startTime || !config.endTime) throw new Error('startTime and endTime are required')
  if (!config.timezone) throw new Error('timezone is required')

  const now = new Date().toISOString()

  const { data: existing } = await db
    .from('quiet_hours')
    .select('id')
    .eq('tenant_id', user.id)
    .maybeSingle()

  if (existing) {
    const { error } = await db
      .from('quiet_hours')
      .update({
        enabled: config.enabled,
        start_time: config.startTime,
        end_time: config.endTime,
        timezone: config.timezone,
        allow_critical: config.allowCritical,
        updated_at: now,
      })
      .eq('tenant_id', user.id)

    if (error) throw new Error(`Failed to update quiet hours: ${error.message}`)
  } else {
    const { error } = await db.from('quiet_hours').insert({
      tenant_id: user.id,
      enabled: config.enabled,
      start_time: config.startTime,
      end_time: config.endTime,
      timezone: config.timezone,
      allow_critical: config.allowCritical,
      created_at: now,
      updated_at: now,
    })

    if (error) throw new Error(`Failed to create quiet hours: ${error.message}`)
  }
}

// ---------------------------------------------------------------------------
// 7. Get notification categories (pure function)
// ---------------------------------------------------------------------------

export async function getNotificationCategories(): Promise<NotificationCategory[]> {
  await requireChef()
  return CATEGORIES
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapPrefRow(row: any): NotificationPreference {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    category: row.category,
    severity: row.severity,
    channels: row.channels,
    interruptionLevel: row.interruption_level,
    mutedUntil: row.muted_until,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapQuietRow(row: any): QuietHours {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    enabled: row.enabled,
    startTime: row.start_time,
    endTime: row.end_time,
    timezone: row.timezone,
    allowCritical: row.allow_critical,
  }
}
