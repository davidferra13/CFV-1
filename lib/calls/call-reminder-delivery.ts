'use server'

import { createServerClient } from '@/lib/db/server'
import { sendEmail } from '@/lib/email/send'
import { CallReminderEmail } from '@/lib/email/templates/call-reminder'
import type { CallType } from '@/lib/calls/actions'

export type CallReminderType = '24h' | '1h'

type CallReminderDeliveryResult =
  | { emailSent: true; recipientEmail: string }
  | { emailSent: false; skipped: true; reason: string }

type CallReminderRecord = {
  id: string
  tenant_id: string
  call_type: CallType
  title: string | null
  scheduled_at: string
  duration_minutes: number
  status: string
  contact_name: string | null
  contact_company: string | null
  reminder_24h_sent_at: string | null
  reminder_1h_sent_at: string | null
  client: {
    full_name: string | null
  } | null
}

function getReminderSentColumn(reminderType: CallReminderType) {
  return reminderType === '24h' ? 'reminder_24h_sent_at' : 'reminder_1h_sent_at'
}

function getReminderLabel(reminderType: CallReminderType) {
  return reminderType === '24h' ? '24-hour' : '1-hour'
}

function getContactLabel(call: {
  client?: { full_name: string | null } | null
  contact_name?: string | null
  contact_company?: string | null
}) {
  return call.client?.full_name ?? call.contact_name ?? call.contact_company ?? 'your contact'
}

async function resolveChefReminderRecipient(input: { tenantId: string }): Promise<{
  displayName: string
  recipientEmail: string | null
}> {
  const db: any = createServerClient({ admin: true })
  const { data: userRole } = await db
    .from('user_roles')
    .select('auth_user_id')
    .eq('entity_id', input.tenantId)
    .eq('role', 'chef')
    .single()

  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', input.tenantId)
    .single()

  const displayName = chef?.display_name || chef?.business_name || 'Chef'
  if (!userRole?.auth_user_id) {
    return {
      displayName,
      recipientEmail: null,
    }
  }

  const { data: authUser } = await db.auth.admin.getUserById(userRole.auth_user_id)
  return {
    displayName,
    recipientEmail: authUser?.user?.email ?? null,
  }
}

export async function sendCallReminderEmailDelivery(input: {
  tenantId: string
  callType: CallType
  title: string | null
  scheduledAt: string
  durationMinutes: number
  reminderType: CallReminderType
  contactLabel: string
}): Promise<CallReminderDeliveryResult> {
  const recipient = await resolveChefReminderRecipient({ tenantId: input.tenantId })
  if (!recipient.recipientEmail) {
    return {
      emailSent: false,
      skipped: true,
      reason: 'Chef auth email is missing for call reminder delivery.',
    }
  }

  const subject =
    input.reminderType === '1h'
      ? 'Your call starts in 1 hour'
      : `Reminder: call tomorrow with ${input.contactLabel}`

  const emailSent = await sendEmail({
    to: recipient.recipientEmail,
    subject,
    react: CallReminderEmail({
      recipientName: recipient.displayName,
      chefName: recipient.displayName,
      callType: input.callType,
      scheduledAt: input.scheduledAt,
      durationMinutes: input.durationMinutes,
      title: input.title,
      isChefReminder: true,
      hoursUntil: input.reminderType === '1h' ? 1 : 24,
    }),
  })

  if (!emailSent) {
    throw new Error('Call reminder email provider did not confirm delivery.')
  }

  return {
    emailSent: true,
    recipientEmail: recipient.recipientEmail,
  }
}

export async function redeliverCallReminderEmail(input: {
  tenantId: string
  callId: string
  reminderType: CallReminderType
}): Promise<{ emailSent: true; message: string }> {
  const db: any = createServerClient({ admin: true })
  const { data: call, error } = await db
    .from('scheduled_calls')
    .select(
      `
      id,
      tenant_id,
      call_type,
      title,
      scheduled_at,
      duration_minutes,
      status,
      contact_name,
      contact_company,
      reminder_24h_sent_at,
      reminder_1h_sent_at,
      client:clients(full_name)
    `
    )
    .eq('id', input.callId)
    .eq('tenant_id', input.tenantId)
    .single()

  if (error || !call) {
    throw new Error('Scheduled call no longer exists for reminder repair.')
  }

  const reminderCall = call as CallReminderRecord
  if (!['scheduled', 'confirmed'].includes(reminderCall.status)) {
    throw new Error(
      `Call is ${reminderCall.status}, not scheduled or confirmed. Automatic reminder redelivery is blocked.`
    )
  }

  const scheduledAtMs = new Date(reminderCall.scheduled_at).getTime()
  if (!Number.isFinite(scheduledAtMs) || scheduledAtMs <= Date.now()) {
    throw new Error('Call time has already passed. Automatic reminder redelivery is blocked.')
  }

  const reminderSentColumn = getReminderSentColumn(input.reminderType)
  if (reminderCall[reminderSentColumn]) {
    throw new Error(
      `${getReminderLabel(input.reminderType)} call reminder already marked sent. Automatic reminder redelivery is blocked.`
    )
  }

  const delivery = await sendCallReminderEmailDelivery({
    tenantId: input.tenantId,
    callType: reminderCall.call_type,
    title: reminderCall.title,
    scheduledAt: reminderCall.scheduled_at,
    durationMinutes: reminderCall.duration_minutes,
    reminderType: input.reminderType,
    contactLabel: getContactLabel(reminderCall),
  })

  if (!delivery.emailSent) {
    throw new Error(delivery.reason)
  }

  const reminderSentAt = new Date().toISOString()
  const { error: updateError } = await db
    .from('scheduled_calls')
    .update({ [reminderSentColumn]: reminderSentAt })
    .eq('id', input.callId)
    .eq('tenant_id', input.tenantId)

  if (updateError) {
    throw new Error(`Failed to mark call reminder sent: ${updateError.message}`)
  }

  return {
    emailSent: true,
    message: `${getReminderLabel(input.reminderType)} call reminder redelivered.`,
  }
}
