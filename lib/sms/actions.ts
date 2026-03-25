// SMS/WhatsApp Server Actions - Send messages and log them to unified inbox
// Uses Twilio under the hood, stores in messages table alongside Gmail messages

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { sendSMS, sendWhatsApp, isTwilioConfigured, isWhatsAppConfigured } from './twilio-client'
import { revalidatePath } from 'next/cache'

export interface SmsChannelStatus {
  smsEnabled: boolean
  whatsappEnabled: boolean
}

export async function getSmsChannelStatus(): Promise<SmsChannelStatus> {
  return {
    smsEnabled: isTwilioConfigured(),
    whatsappEnabled: isWhatsAppConfigured(),
  }
}

/**
 * Send an SMS to a client and log it in the messages table
 */
export async function sendSmsToClient(input: {
  clientId: string
  phone: string
  body: string
  inquiryId?: string
  eventId?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify client belongs to chef
  const { data: client } = await db
    .from('clients')
    .select('id, full_name, phone')
    .eq('id', input.clientId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!client) return { success: false, error: 'Client not found' }

  const result = await sendSMS(input.phone, input.body)

  // Log message regardless of send success (for visibility)
  await db.from('messages').insert({
    tenant_id: user.tenantId!,
    client_id: input.clientId,
    inquiry_id: input.inquiryId ?? null,
    event_id: input.eventId ?? null,
    direction: 'outbound',
    channel: 'sms',
    body: input.body,
    status: result.success ? 'sent' : 'failed',
    metadata: result.sid ? { twilio_sid: result.sid } : { error: result.error },
  })

  if (input.inquiryId) revalidatePath(`/inquiries/${input.inquiryId}`)

  return result
}

/**
 * Send a WhatsApp message to a client and log it in the messages table
 */
export async function sendWhatsAppToClient(input: {
  clientId: string
  phone: string
  body: string
  inquiryId?: string
  eventId?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify client belongs to chef
  const { data: client } = await db
    .from('clients')
    .select('id, full_name, phone')
    .eq('id', input.clientId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!client) return { success: false, error: 'Client not found' }

  const result = await sendWhatsApp(input.phone, input.body)

  // Log message regardless of send success
  await db.from('messages').insert({
    tenant_id: user.tenantId!,
    client_id: input.clientId,
    inquiry_id: input.inquiryId ?? null,
    event_id: input.eventId ?? null,
    direction: 'outbound',
    channel: 'whatsapp',
    body: input.body,
    status: result.success ? 'sent' : 'failed',
    metadata: result.sid ? { twilio_sid: result.sid } : { error: result.error },
  })

  if (input.inquiryId) revalidatePath(`/inquiries/${input.inquiryId}`)

  return result
}
