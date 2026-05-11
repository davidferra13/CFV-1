'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ---------------------------------------------------------------------------
// Legacy type (kept for backward compat with the communication page)
// ---------------------------------------------------------------------------

export type CommunicationHealth = {
  emailsSent30d: number
  emailsFailed30d: number
  smsSent30d: number
  scheduledPending: number
  unreadInbox: number
  pushSubscriptions: number
}

// ---------------------------------------------------------------------------
// New dashboard types
// ---------------------------------------------------------------------------

export type ChannelStatus = {
  channel: 'email' | 'sms' | 'push' | 'voice'
  configured: boolean
  sent30d: number
  failed30d: number
  deliveryRate: number // 0-100, -1 if no sends
}

export type RecentFailure = {
  id: string
  channel: string
  errorCode: string | null
  errorMessage: string | null
  occurredAt: string
}

export type CommunicationHealthDashboard = {
  channels: ChannelStatus[]
  totalSent30d: number
  totalFailed30d: number
  overallDeliveryRate: number // 0-100
  scheduledPending: number
  unreadInbox: number
  recentFailures: RecentFailure[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calcDeliveryRate(sent: number, failed: number): number {
  const total = sent + failed
  if (total === 0) return -1
  return Math.round(((total - failed) / total) * 100)
}

// ---------------------------------------------------------------------------
// Legacy action (backward compat)
// ---------------------------------------------------------------------------

export async function getCommunicationHealthMetrics(): Promise<CommunicationHealth> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Each query wrapped in try/catch so missing tables don't break the panel
  let emailsSent30d = 0
  let emailsFailed30d = 0
  let smsSent30d = 0
  let scheduledPending = 0
  let unreadInbox = 0
  let pushSubscriptions = 0

  try {
    const { count } = await db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('channel', 'email')
      .eq('direction', 'outbound')
      .gte('created_at', thirtyDaysAgo)
    emailsSent30d = count ?? 0
  } catch (e) {
    console.error('[health-metrics] emailsSent30d query failed:', e)
  }

  // messages table has no 'failed' status; use communication_events provider_delivery_status instead
  try {
    const { count } = await db
      .from('communication_events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('source', 'email')
      .eq('direction', 'outbound')
      .eq('provider_delivery_status', 'failed')
      .gte('timestamp', thirtyDaysAgo)
    emailsFailed30d = count ?? 0
  } catch (e) {
    console.error('[health-metrics] emailsFailed30d query failed:', e)
  }

  try {
    const { count } = await db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('channel', 'text')
      .eq('direction', 'outbound')
      .gte('created_at', thirtyDaysAgo)
    smsSent30d = count ?? 0
  } catch (e) {
    console.error('[health-metrics] smsSent30d query failed:', e)
  }

  try {
    const { count } = await db
      .from('scheduled_messages')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', user.entityId)
      .eq('status', 'scheduled')
    scheduledPending = count ?? 0
  } catch (e) {
    console.error('[health-metrics] scheduledPending query failed:', e)
  }

  try {
    const { count } = await db
      .from('communication_events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('direction', 'inbound')
      .eq('status', 'unlinked')
    unreadInbox = count ?? 0
  } catch (e) {
    console.error('[health-metrics] unreadInbox query failed:', e)
  }

  try {
    const { count } = await db
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
    pushSubscriptions = count ?? 0
  } catch (e) {
    console.error('[health-metrics] pushSubscriptions query failed:', e)
  }

  return {
    emailsSent30d,
    emailsFailed30d,
    smsSent30d,
    scheduledPending,
    unreadInbox,
    pushSubscriptions,
  }
}

// ---------------------------------------------------------------------------
// New dashboard action
// ---------------------------------------------------------------------------

export async function getCommunicationHealthDashboard(): Promise<CommunicationHealthDashboard> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const chefId = user.entityId!
  const db: any = createServerClient({ admin: true })
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // ----- Channel configuration checks -----

  let emailConfigured = false
  try {
    const { count } = await db
      .from('chef_email_channels')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', chefId)
    emailConfigured = (count ?? 0) > 0
  } catch (e) {
    console.error('[health-dashboard] emailConfigured query failed:', e)
  }

  let smsConfigured = false
  try {
    const { count } = await db
      .from('chef_twilio_credentials')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', chefId)
    smsConfigured = (count ?? 0) > 0
  } catch (e) {
    console.error('[health-dashboard] smsConfigured query failed:', e)
  }

  let pushConfigured = false
  try {
    const { count } = await db
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
    pushConfigured = (count ?? 0) > 0
  } catch (e) {
    console.error('[health-dashboard] pushConfigured query failed:', e)
  }

  // ----- Email sent/failed 30d (communication_events, source='email', direction='outbound') -----

  let emailSent = 0
  let emailFailed = 0
  try {
    const { count } = await db
      .from('communication_events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('source', 'email')
      .eq('direction', 'outbound')
      .gte('timestamp', thirtyDaysAgo)
      .neq('provider_delivery_status', 'failed')
    emailSent = count ?? 0
  } catch (e) {
    console.error('[health-dashboard] emailSent query failed:', e)
  }

  try {
    const { count } = await db
      .from('communication_events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('source', 'email')
      .eq('direction', 'outbound')
      .eq('provider_delivery_status', 'failed')
      .gte('timestamp', thirtyDaysAgo)
    emailFailed = count ?? 0
  } catch (e) {
    console.error('[health-dashboard] emailFailed query failed:', e)
  }

  // ----- SMS sent/failed 30d (sms_messages) -----

  let smsSent = 0
  let smsFailed = 0
  try {
    const { count } = await db
      .from('sms_messages')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['sent', 'delivered'])
      .gte('created_at', thirtyDaysAgo)
    smsSent = count ?? 0
  } catch (e) {
    console.error('[health-dashboard] smsSent query failed:', e)
  }

  try {
    const { count } = await db
      .from('sms_messages')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'failed')
      .gte('created_at', thirtyDaysAgo)
    smsFailed = count ?? 0
  } catch (e) {
    console.error('[health-dashboard] smsFailed query failed:', e)
  }

  // ----- Push sent/failed 30d (notification_delivery_log) -----

  let pushSent = 0
  let pushFailed = 0
  try {
    const { count } = await db
      .from('notification_delivery_log')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('channel', 'push')
      .eq('status', 'sent')
      .gte('sent_at', thirtyDaysAgo)
    pushSent = count ?? 0
  } catch (e) {
    console.error('[health-dashboard] pushSent query failed:', e)
  }

  try {
    const { count } = await db
      .from('notification_delivery_log')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('channel', 'push')
      .eq('status', 'failed')
      .gte('sent_at', thirtyDaysAgo)
    pushFailed = count ?? 0
  } catch (e) {
    console.error('[health-dashboard] pushFailed query failed:', e)
  }

  // ----- Scheduled pending -----

  let scheduledPending = 0
  try {
    const { count } = await db
      .from('scheduled_messages')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', chefId)
      .eq('status', 'scheduled')
    scheduledPending = count ?? 0
  } catch (e) {
    console.error('[health-dashboard] scheduledPending query failed:', e)
  }

  // ----- Unread inbox -----

  let unreadInbox = 0
  try {
    const { count } = await db
      .from('communication_events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('direction', 'inbound')
      .eq('status', 'unlinked')
    unreadInbox = count ?? 0
  } catch (e) {
    console.error('[health-dashboard] unreadInbox query failed:', e)
  }

  // ----- Recent failures (last 10, union of comm events + delivery log) -----

  const recentFailures: RecentFailure[] = []

  try {
    const { data: commFailures } = await db
      .from('communication_events')
      .select('id, source, provider_status, provider_delivery_status, timestamp')
      .eq('tenant_id', tenantId)
      .eq('provider_delivery_status', 'failed')
      .order('timestamp', { ascending: false })
      .limit(10)

    if (commFailures) {
      for (const row of commFailures) {
        recentFailures.push({
          id: row.id,
          channel: row.source ?? 'unknown',
          errorCode: row.provider_delivery_status ?? null,
          errorMessage: row.provider_status ?? null,
          occurredAt: row.timestamp,
        })
      }
    }
  } catch (e) {
    console.error('[health-dashboard] commFailures query failed:', e)
  }

  try {
    const { data: deliveryFailures } = await db
      .from('notification_delivery_log')
      .select('id, channel, status, error_message, sent_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'failed')
      .order('sent_at', { ascending: false })
      .limit(10)

    if (deliveryFailures) {
      for (const row of deliveryFailures) {
        recentFailures.push({
          id: row.id,
          channel: row.channel ?? 'unknown',
          errorCode: row.status ?? null,
          errorMessage: row.error_message ?? null,
          occurredAt: row.sent_at,
        })
      }
    }
  } catch (e) {
    console.error('[health-dashboard] deliveryFailures query failed:', e)
  }

  // Sort combined failures by date desc, take top 10
  recentFailures.sort((a, b) => {
    const ta = new Date(a.occurredAt).getTime()
    const tb = new Date(b.occurredAt).getTime()
    return tb - ta
  })
  recentFailures.splice(10)

  // ----- Voice calls 30d (supplier_calls + ai_calls) -----

  let voiceSent = 0
  let voiceFailed = 0
  let voiceConfigured = false

  // Check if calling is configured (has routing rules)
  try {
    const { count } = await db
      .from('ai_call_routing_rules')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', chefId)
    voiceConfigured = (count ?? 0) > 0
  } catch (e) {
    console.error('[health-dashboard] voiceConfigured query failed:', e)
  }

  // Supplier calls (completed = sent, failed = failed)
  try {
    const { count } = await db
      .from('supplier_calls')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', chefId)
      .eq('status', 'completed')
      .gte('created_at', thirtyDaysAgo)
    voiceSent += count ?? 0
  } catch (e) {
    console.error('[health-dashboard] supplierCallsSent query failed:', e)
  }

  try {
    const { count } = await db
      .from('supplier_calls')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', chefId)
      .eq('status', 'failed')
      .gte('created_at', thirtyDaysAgo)
    voiceFailed += count ?? 0
  } catch (e) {
    console.error('[health-dashboard] supplierCallsFailed query failed:', e)
  }

  // AI calls (completed/voicemail = sent, failed = failed)
  try {
    const { count } = await db
      .from('ai_calls')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', chefId)
      .in('status', ['completed', 'voicemail'])
      .gte('created_at', thirtyDaysAgo)
    voiceSent += count ?? 0
  } catch (e) {
    console.error('[health-dashboard] aiCallsSent query failed:', e)
  }

  try {
    const { count } = await db
      .from('ai_calls')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', chefId)
      .eq('status', 'failed')
      .gte('created_at', thirtyDaysAgo)
    voiceFailed += count ?? 0
  } catch (e) {
    console.error('[health-dashboard] aiCallsFailed query failed:', e)
  }

  // ----- Build channel statuses -----

  const channels: ChannelStatus[] = [
    {
      channel: 'email',
      configured: emailConfigured,
      sent30d: emailSent,
      failed30d: emailFailed,
      deliveryRate: calcDeliveryRate(emailSent, emailFailed),
    },
    {
      channel: 'sms',
      configured: smsConfigured,
      sent30d: smsSent,
      failed30d: smsFailed,
      deliveryRate: calcDeliveryRate(smsSent, smsFailed),
    },
    {
      channel: 'push',
      configured: pushConfigured,
      sent30d: pushSent,
      failed30d: pushFailed,
      deliveryRate: calcDeliveryRate(pushSent, pushFailed),
    },
    {
      channel: 'voice',
      configured: voiceConfigured,
      sent30d: voiceSent,
      failed30d: voiceFailed,
      deliveryRate: calcDeliveryRate(voiceSent, voiceFailed),
    },
  ]

  const totalSent30d = emailSent + smsSent + pushSent + voiceSent
  const totalFailed30d = emailFailed + smsFailed + pushFailed + voiceFailed

  return {
    channels,
    totalSent30d,
    totalFailed30d,
    overallDeliveryRate: calcDeliveryRate(totalSent30d, totalFailed30d),
    scheduledPending,
    unreadInbox,
    recentFailures,
  }
}
