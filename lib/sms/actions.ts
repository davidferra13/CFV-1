// SMS/WhatsApp Server Actions - Send messages and log them to unified inbox
// Uses Twilio under the hood, stores in messages table alongside Gmail messages

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import {
  getManagedOutboundChannel,
  sendManagedTwilioMessage,
} from '@/lib/communication/managed-channels'

export interface SmsChannelStatus {
  smsEnabled: boolean
  whatsappEnabled: boolean
}

export async function getSmsChannelStatus(): Promise<SmsChannelStatus> {
  const user = await requireChef()
  const smsChannel = await getManagedOutboundChannel({
    tenantId: user.tenantId!,
    channel: 'sms',
  })
  const whatsappChannel = await getManagedOutboundChannel({
    tenantId: user.tenantId!,
    channel: 'whatsapp',
  })

  return {
    smsEnabled: Boolean(smsChannel),
    whatsappEnabled: Boolean(whatsappChannel),
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
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) return { success: false, error: 'Client not found' }

  const result = await sendManagedTwilioMessage({
    tenantId: user.tenantId!,
    channel: 'sms',
    to: input.phone,
    body: input.body,
  })

  // Log message regardless of send success (for visibility)
  await db.from('messages').insert({
    tenant_id: user.tenantId!,
    client_id: input.clientId,
    inquiry_id: input.inquiryId ?? null,
    event_id: input.eventId ?? null,
    direction: 'outbound',
    channel: 'text',
    body: input.body,
    status: result.success ? 'sent' : 'logged',
    metadata: result.providerMessageId
      ? { twilio_sid: result.providerMessageId, managed_from: result.managedAddress || null }
      : { error: result.error, managed_from: result.managedAddress || null },
  })

  if (input.inquiryId) revalidatePath(`/inquiries/${input.inquiryId}`)

  return {
    success: result.success,
    error: result.error,
  }
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
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) return { success: false, error: 'Client not found' }

  const result = await sendManagedTwilioMessage({
    tenantId: user.tenantId!,
    channel: 'whatsapp',
    to: input.phone,
    body: input.body,
  })

  // Log message regardless of send success
  await db.from('messages').insert({
    tenant_id: user.tenantId!,
    client_id: input.clientId,
    inquiry_id: input.inquiryId ?? null,
    event_id: input.eventId ?? null,
    direction: 'outbound',
    channel: 'text',
    body: input.body,
    status: result.success ? 'sent' : 'logged',
    metadata: result.providerMessageId
      ? { twilio_sid: result.providerMessageId, managed_from: result.managedAddress || null }
      : { error: result.error, managed_from: result.managedAddress || null },
  })

  if (input.inquiryId) revalidatePath(`/inquiries/${input.inquiryId}`)

  return {
    success: result.success,
    error: result.error,
  }
}
