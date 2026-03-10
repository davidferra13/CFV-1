'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

type MessageType =
  | 'order_ready'
  | 'table_ready'
  | 'delivery_eta'
  | 'reservation_confirm'
  | 'reservation_remind'
  | 'feedback_request'
  | 'custom'

type EntityType = 'event' | 'bakery_order' | 'reservation' | 'preorder' | 'delivery'

type SMSSettings = {
  sms_enabled: boolean
  twilio_account_sid: string | null
  twilio_auth_token: string | null
  twilio_phone_number: string | null
}

// ── Core send function ──────────────────────────────────────────────

export async function sendSMS(
  toPhone: string,
  message: string,
  messageType: MessageType,
  entityType?: EntityType,
  entityId?: string
) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  // Check if SMS is enabled
  const { data: prefs } = await supabase
    .from('chef_preferences')
    .select('sms_enabled, twilio_account_sid, twilio_auth_token, twilio_phone_number')
    .eq('chef_id', tenantId)
    .single()

  if (!prefs?.sms_enabled) {
    return { success: false, error: 'SMS is not enabled. Enable it in Settings > SMS.' }
  }

  const hasTwilio = prefs.twilio_account_sid && prefs.twilio_auth_token && prefs.twilio_phone_number

  let twilioSid: string | null = null
  let status: 'sent' | 'pending' | 'failed' = 'pending'
  let errorMessage: string | null = null
  let sentAt: string | null = null

  if (hasTwilio) {
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${prefs.twilio_account_sid}/Messages.json`
      const credentials = Buffer.from(
        `${prefs.twilio_account_sid}:${prefs.twilio_auth_token}`
      ).toString('base64')

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: toPhone,
          From: prefs.twilio_phone_number!,
          Body: message,
        }).toString(),
      })

      const result = await response.json()

      if (response.ok) {
        twilioSid = result.sid
        status = 'sent'
        sentAt = new Date().toISOString()
      } else {
        status = 'failed'
        errorMessage = result.message || 'Twilio API error'
        console.error('[sms] Twilio send failed:', errorMessage)
      }
    } catch (err) {
      status = 'failed'
      errorMessage = err instanceof Error ? err.message : 'Unknown error sending SMS'
      console.error('[sms] Twilio send error:', err)
    }
  } else {
    errorMessage = 'Twilio not configured'
  }

  // Record in database (non-blocking for the caller, but we await to get the ID)
  try {
    const { data: record } = await supabase
      .from('sms_messages')
      .insert({
        tenant_id: tenantId,
        to_phone: toPhone,
        message,
        message_type: messageType,
        entity_type: entityType || null,
        entity_id: entityId || null,
        status,
        twilio_sid: twilioSid,
        error_message: errorMessage,
        sent_at: sentAt,
      })
      .select('id')
      .single()

    return {
      success: status === 'sent',
      id: record?.id,
      status,
      error: errorMessage,
    }
  } catch (err) {
    console.error('[sms] Failed to record SMS in database:', err)
    return { success: status === 'sent', status, error: errorMessage }
  }
}

// ── Convenience functions ───────────────────────────────────────────

export async function sendOrderReadyNotification(
  phone: string,
  customerName: string,
  orderDetails: string,
  entityType?: EntityType,
  entityId?: string
) {
  const message = `Hi ${customerName}, your order is ready for pickup! ${orderDetails}`
  return sendSMS(phone, message, 'order_ready', entityType, entityId)
}

export async function sendTableReadyNotification(
  phone: string,
  customerName: string,
  partySize: number,
  entityId?: string
) {
  const message = `Hi ${customerName}, your table for ${partySize} is ready! Please check in with the host.`
  return sendSMS(phone, message, 'table_ready', 'reservation', entityId)
}

export async function sendDeliveryETANotification(
  phone: string,
  customerName: string,
  eta: number,
  entityId?: string
) {
  const message = `Hi ${customerName}, your delivery arrives in approximately ${eta} minutes.`
  return sendSMS(phone, message, 'delivery_eta', 'delivery', entityId)
}

export async function sendReservationConfirmation(
  phone: string,
  customerName: string,
  date: string,
  time: string,
  partySize: number,
  entityId?: string
) {
  const message = `Hi ${customerName}, your reservation is confirmed for ${date} at ${time}, party of ${partySize}. See you then!`
  return sendSMS(phone, message, 'reservation_confirm', 'reservation', entityId)
}

export async function sendFeedbackRequest(
  phone: string,
  customerName: string,
  feedbackUrl: string,
  entityType?: EntityType,
  entityId?: string
) {
  const message = `Hi ${customerName}, thanks for choosing us! We'd love your feedback: ${feedbackUrl}`
  return sendSMS(phone, message, 'feedback_request', entityType, entityId)
}

export async function sendCustomSMS(
  phone: string,
  message: string,
  entityType?: EntityType,
  entityId?: string
) {
  return sendSMS(phone, message, 'custom', entityType, entityId)
}

// ── History & Stats ─────────────────────────────────────────────────

export async function getSMSHistory(days: number = 30) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('sms_messages')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[sms] Failed to fetch history:', error)
    return { success: false as const, error: error.message, data: [] }
  }

  return { success: true as const, data: data || [] }
}

export async function getSMSStats() {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data, error } = await supabase
    .from('sms_messages')
    .select('status, message_type')
    .eq('tenant_id', tenantId)
    .gte('created_at', thirtyDaysAgo.toISOString())

  if (error) {
    console.error('[sms] Failed to fetch stats:', error)
    return {
      success: false as const,
      error: error.message,
      stats: {
        total: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        pending: 0,
        deliveryRate: 0,
        byType: {} as Record<string, number>,
      },
    }
  }

  const messages = data || []
  const total = messages.length
  const sent = messages.filter((m) => m.status === 'sent').length
  const delivered = messages.filter((m) => m.status === 'delivered').length
  const failed = messages.filter((m) => m.status === 'failed').length
  const pending = messages.filter((m) => m.status === 'pending').length
  const deliveryRate = total > 0 ? Math.round(((sent + delivered) / total) * 100) : 0

  const byType: Record<string, number> = {}
  for (const m of messages) {
    byType[m.message_type] = (byType[m.message_type] || 0) + 1
  }

  return {
    success: true as const,
    stats: { total, sent, delivered, failed, pending, deliveryRate, byType },
  }
}

// ── Settings ────────────────────────────────────────────────────────

export async function updateSMSSettings(settings: SMSSettings) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  const { error } = await supabase
    .from('chef_preferences')
    .update({
      sms_enabled: settings.sms_enabled,
      twilio_account_sid: settings.twilio_account_sid,
      twilio_auth_token: settings.twilio_auth_token,
      twilio_phone_number: settings.twilio_phone_number,
    })
    .eq('chef_id', tenantId)

  if (error) {
    console.error('[sms] Failed to update settings:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getSMSSettings() {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('chef_preferences')
    .select('sms_enabled, twilio_account_sid, twilio_auth_token, twilio_phone_number')
    .eq('chef_id', tenantId)
    .single()

  if (error) {
    console.error('[sms] Failed to fetch settings:', error)
    return {
      success: false as const,
      error: error.message,
      settings: {
        sms_enabled: false,
        twilio_account_sid: null,
        twilio_auth_token: null,
        twilio_phone_number: null,
      },
    }
  }

  return {
    success: true as const,
    settings: {
      sms_enabled: data?.sms_enabled ?? false,
      twilio_account_sid: data?.twilio_account_sid ?? null,
      twilio_auth_token: data?.twilio_auth_token ?? null,
      twilio_phone_number: data?.twilio_phone_number ?? null,
    },
  }
}

export async function testSMSConnection() {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  const { data: prefs } = await supabase
    .from('chef_preferences')
    .select('sms_enabled, twilio_account_sid, twilio_auth_token, twilio_phone_number')
    .eq('chef_id', tenantId)
    .single()

  if (!prefs?.twilio_account_sid || !prefs?.twilio_auth_token || !prefs?.twilio_phone_number) {
    return {
      success: false,
      error:
        'Twilio credentials not configured. Fill in Account SID, Auth Token, and Phone Number first.',
    }
  }

  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${prefs.twilio_account_sid}/Messages.json`
    const credentials = Buffer.from(
      `${prefs.twilio_account_sid}:${prefs.twilio_auth_token}`
    ).toString('base64')

    // Send a test message to the Twilio phone number itself
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: prefs.twilio_phone_number,
        From: prefs.twilio_phone_number,
        Body: 'ChefFlow SMS test - your connection is working!',
      }).toString(),
    })

    const result = await response.json()

    if (response.ok) {
      return { success: true, sid: result.sid }
    } else {
      return { success: false, error: result.message || 'Twilio API returned an error' }
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to connect to Twilio',
    }
  }
}
