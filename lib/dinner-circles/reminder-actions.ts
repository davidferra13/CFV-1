'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  ReminderConfig,
  ReminderRecord,
  ReminderSchedule,
  ReminderStatus,
} from './reminder-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function assertCircleOwner(db: any, circleId: string, tenantId: string) {
  const { data: circle } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', circleId)
    .eq('tenant_id', tenantId)
    .single()

  if (!circle) throw new Error('Circle not found or unauthorized')
}

function mapConfigRow(r: any): ReminderConfig {
  return {
    id: r.id,
    circleId: r.circle_id,
    tenantId: r.tenant_id,
    reminderType: r.reminder_type,
    daysBefore: r.days_before,
    enabled: r.enabled,
    channel: r.channel,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function mapReminderRow(r: any): ReminderRecord {
  return {
    id: r.id,
    configId: r.config_id,
    circleId: r.circle_id,
    eventId: r.event_id,
    tenantId: r.tenant_id,
    status: r.status,
    scheduledFor: r.scheduled_for,
    sentAt: r.sent_at,
    recipientCount: r.recipient_count,
    errorMessage: r.error_message,
    createdAt: r.created_at,
  }
}

// ---------------------------------------------------------------------------
// configureCircleReminders
// Set reminder schedule per circle event (upsert per type)
// ---------------------------------------------------------------------------

export async function configureCircleReminders(
  circleId: string,
  schedules: ReminderSchedule[]
): Promise<{ success: boolean; configs?: ReminderConfig[]; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  await assertCircleOwner(db, circleId, tenantId)

  const results: ReminderConfig[] = []

  for (const schedule of schedules) {
    // Check if config already exists for this type
    const { data: existing } = await db
      .from('circle_reminder_configs')
      .select('id')
      .eq('circle_id', circleId)
      .eq('tenant_id', tenantId)
      .eq('reminder_type', schedule.reminderType)
      .maybeSingle()

    if (existing) {
      const { data: updated, error: updateErr } = await db
        .from('circle_reminder_configs')
        .update({
          days_before: schedule.daysBefore,
          enabled: schedule.enabled,
          channel: schedule.channel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*')
        .single()

      if (updateErr) {
        return { success: false, error: `Failed to update ${schedule.reminderType} config` }
      }
      results.push(mapConfigRow(updated))
    } else {
      const { data: inserted, error: insertErr } = await db
        .from('circle_reminder_configs')
        .insert({
          circle_id: circleId,
          tenant_id: tenantId,
          reminder_type: schedule.reminderType,
          days_before: schedule.daysBefore,
          enabled: schedule.enabled,
          channel: schedule.channel,
        })
        .select('*')
        .single()

      if (insertErr) {
        return { success: false, error: `Failed to create ${schedule.reminderType} config` }
      }
      results.push(mapConfigRow(inserted))
    }
  }

  revalidatePath('/circles')
  return { success: true, configs: results }
}

// ---------------------------------------------------------------------------
// getCircleReminderConfig
// ---------------------------------------------------------------------------

export async function getCircleReminderConfig(circleId: string): Promise<ReminderConfig[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  await assertCircleOwner(db, circleId, user.tenantId!)

  const { data, error } = await db
    .from('circle_reminder_configs')
    .select('*')
    .eq('circle_id', circleId)
    .eq('tenant_id', user.tenantId!)
    .order('days_before', { ascending: false })

  if (error || !data) return []
  return data.map(mapConfigRow)
}

// ---------------------------------------------------------------------------
// getUpcomingReminders
// All pending reminders across circles (or filtered to one)
// ---------------------------------------------------------------------------

export async function getUpcomingReminders(circleId?: string): Promise<ReminderRecord[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  let query = db
    .from('circle_reminders')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')
    .order('scheduled_for', { ascending: true })

  if (circleId) {
    query = query.eq('circle_id', circleId)
  }

  const { data, error } = await query

  if (error || !data) return []
  return data.map(mapReminderRow)
}

// ---------------------------------------------------------------------------
// sendReminder
// Manually trigger a pending reminder (marks as sent, logs timestamp)
// ---------------------------------------------------------------------------

export async function sendReminder(
  reminderId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Load reminder and verify ownership
  const { data: reminder } = await db
    .from('circle_reminders')
    .select('id, tenant_id, status, circle_id')
    .eq('id', reminderId)
    .eq('tenant_id', tenantId)
    .single()

  if (!reminder) {
    return { success: false, error: 'Reminder not found' }
  }

  if (reminder.status !== 'pending') {
    return { success: false, error: `Reminder already ${reminder.status as ReminderStatus}` }
  }

  // Count recipients (circle members)
  const { data: members } = await db
    .from('hub_group_members')
    .select('id', { count: 'exact' })
    .eq('group_id', reminder.circle_id)

  const recipientCount = members?.length ?? 0

  const { error: updateErr } = await db
    .from('circle_reminders')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      recipient_count: recipientCount,
    })
    .eq('id', reminderId)
    .eq('status', 'pending')

  if (updateErr) {
    return { success: false, error: 'Failed to send reminder' }
  }

  revalidatePath('/circles')
  return { success: true }
}

// ---------------------------------------------------------------------------
// skipReminder
// Chef explicitly skips a pending reminder
// ---------------------------------------------------------------------------

export async function skipReminder(
  reminderId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: reminder } = await db
    .from('circle_reminders')
    .select('id, tenant_id, status')
    .eq('id', reminderId)
    .eq('tenant_id', tenantId)
    .single()

  if (!reminder) {
    return { success: false, error: 'Reminder not found' }
  }

  if (reminder.status !== 'pending') {
    return { success: false, error: `Reminder already ${reminder.status as ReminderStatus}` }
  }

  const { error: updateErr } = await db
    .from('circle_reminders')
    .update({ status: 'skipped' })
    .eq('id', reminderId)
    .eq('status', 'pending')

  if (updateErr) {
    return { success: false, error: 'Failed to skip reminder' }
  }

  revalidatePath('/circles')
  return { success: true }
}

// ---------------------------------------------------------------------------
// getCircleReminderHistory
// Past reminders with delivery status for a circle
// ---------------------------------------------------------------------------

export async function getCircleReminderHistory(circleId: string): Promise<ReminderRecord[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  await assertCircleOwner(db, circleId, user.tenantId!)

  const { data, error } = await db
    .from('circle_reminders')
    .select('*')
    .eq('circle_id', circleId)
    .eq('tenant_id', user.tenantId!)
    .in('status', ['sent', 'skipped', 'failed'])
    .order('scheduled_for', { ascending: false })

  if (error || !data) return []
  return data.map(mapReminderRow)
}
