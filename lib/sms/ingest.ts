'use server'

// SMS Ingestion - Inbound Message Processing
// PRIVACY: SMS content may contain client PII - classification via local Ollama only.
//
// Accepts inbound SMS (from Twilio webhook or manual forward), matches sender
// to a known client, stores in messages table, and classifies with Ollama.
// If classification is "inquiry", creates an inquiry automatically.

import { createServerClient } from '@/lib/db/server'
import { classifyEmail } from '@/lib/gmail/classify'
import { parseInquiryFromText } from '@/lib/ai/parse-inquiry'
import { createClientFromLead } from '@/lib/clients/actions'
import { createNotification, getChefAuthUserId } from '@/lib/notifications/actions'
import type { Json } from '@/types/database'

export interface SmsIngestResult {
  action: 'created_inquiry' | 'logged_message' | 'skipped' | 'error'
  messageId?: string
  inquiryId?: string
  clientId?: string
  error?: string
}

export async function ingestInboundSms(
  tenantId: string,
  from: string,
  body: string,
  timestamp?: string
): Promise<SmsIngestResult> {
  const db: any = createServerClient({ admin: true })

  const receivedAt = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString()

  // 1. Try to match sender phone number to a known client
  const normalizedPhone = from.replace(/\D/g, '').slice(-10)
  const { data: client } = await db
    .from('clients')
    .select('id, full_name, email')
    .eq('tenant_id', tenantId)
    .or(`phone.ilike.%${normalizedPhone}%`)
    .limit(1)
    .maybeSingle()

  // 2. Load known client emails for classification context
  const { data: clients } = await db.from('clients').select('email').eq('tenant_id', tenantId)

  const knownClientEmails = (clients ?? []).map((c: any) => c.email).filter(Boolean) as string[]

  // 3. Classify the message (reuse email classifier - works for any text)
  let classification: { category: string; confidence: string }
  try {
    classification = await classifyEmail(
      `SMS from ${from}`,
      body,
      client?.email ?? from,
      knownClientEmails
    )
  } catch {
    // If Ollama is offline, default to logging as existing_thread if client known, else personal
    classification = {
      category: client ? 'existing_thread' : 'personal',
      confidence: 'low',
    }
  }

  // 4. Store the message
  const { data: message, error: msgError } = await db
    .from('messages')
    .insert({
      tenant_id: tenantId,
      client_id: client?.id ?? null,
      channel: 'sms' as const,
      direction: 'inbound' as const,
      status: 'logged' as const,
      subject: `SMS from ${from}`,
      body,
      sent_at: receivedAt,
    })
    .select('id')
    .single()

  if (msgError) {
    return { action: 'error', error: msgError.message }
  }

  // 5. Route by classification
  if (classification.category === 'inquiry') {
    try {
      const parseResult = await parseInquiryFromText(body)

      // Create or find client
      let clientId = client?.id ?? null
      if (!clientId) {
        try {
          const newClient = await createClientFromLead(tenantId, {
            email: null as any,
            full_name: parseResult.parsed.client_name ?? 'Unknown (SMS)',
            phone: from,
            dietary_restrictions: parseResult.parsed.confirmed_dietary_restrictions ?? null,
            source: 'text',
          })
          clientId = newClient.id
        } catch {
          // Non-fatal
        }
      }

      // Create inquiry
      const { data: inquiry, error: inqError } = await db
        .from('inquiries')
        .insert({
          tenant_id: tenantId,
          channel: 'text' as const,
          client_id: clientId,
          first_contact_at: receivedAt,
          confirmed_date: parseResult.parsed.confirmed_date ?? null,
          confirmed_guest_count: parseResult.parsed.confirmed_guest_count ?? null,
          confirmed_location: parseResult.parsed.confirmed_location ?? null,
          confirmed_occasion: parseResult.parsed.confirmed_occasion ?? null,
          confirmed_budget_cents: parseResult.parsed.confirmed_budget_cents ?? null,
          source_message: body,
          unknown_fields: { sms_from: from, original_body: body } as unknown as Json,
          next_action_required: 'Review SMS inquiry',
          next_action_by: 'chef',
        })
        .select()
        .single()

      if (inqError) throw new Error(inqError.message)

      // Link message to inquiry
      if (message?.id) {
        await db
          .from('messages')
          .update({ inquiry_id: inquiry.id, client_id: clientId })
          .eq('id', message.id)
      }

      // Notify chef (non-blocking)
      try {
        const chefUserId = await getChefAuthUserId(tenantId)
        if (chefUserId) {
          await createNotification({
            tenantId,
            recipientId: chefUserId,
            category: 'inquiry',
            action: 'new_inquiry',
            title: 'New inquiry via SMS',
            body: `${client?.full_name ?? from} - ${body.slice(0, 100)}`,
            actionUrl: `/inquiries/${inquiry.id}`,
            inquiryId: inquiry.id,
            clientId: clientId ?? undefined,
          })
        }
      } catch {
        // Non-fatal
      }

      return {
        action: 'created_inquiry',
        messageId: message.id,
        inquiryId: inquiry.id,
        clientId: clientId ?? undefined,
      }
    } catch (err) {
      return {
        action: 'error',
        messageId: message.id,
        error: (err as Error).message,
      }
    }
  }

  // If existing client replied - auto-advance any awaiting_client inquiry
  if (client?.id && classification.category === 'existing_thread') {
    try {
      const { data: openInquiry } = await db
        .from('inquiries')
        .select('id, status')
        .eq('tenant_id', tenantId)
        .eq('client_id', client.id)
        .eq('status', 'awaiting_client')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (openInquiry) {
        await db
          .from('inquiries')
          .update({
            status: 'awaiting_chef',
            follow_up_due_at: null,
            next_action_required: 'Client replied via SMS - review and respond',
            next_action_by: 'chef',
          })
          .eq('id', openInquiry.id)
          .eq('tenant_id', tenantId)

        // Link message to inquiry
        if (message?.id) {
          await db.from('messages').update({ inquiry_id: openInquiry.id }).eq('id', message.id)
        }

        // Notify chef
        try {
          const chefUserId = await getChefAuthUserId(tenantId)
          if (chefUserId) {
            await createNotification({
              tenantId,
              recipientId: chefUserId,
              category: 'inquiry',
              action: 'inquiry_reply',
              title: 'Client replied via SMS',
              body: `${client.full_name ?? from} - ${body.slice(0, 100)}`,
              actionUrl: `/inquiries/${openInquiry.id}`,
              inquiryId: openInquiry.id,
              clientId: client.id,
            })
          }
        } catch {
          // Non-fatal
        }
      }
    } catch {
      // Non-fatal - message was logged regardless
    }
  }

  return {
    action: 'logged_message',
    messageId: message.id,
    clientId: client?.id ?? undefined,
  }
}
