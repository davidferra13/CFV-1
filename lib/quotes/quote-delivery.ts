'use server'

import { createServerClient } from '@/lib/db/server'
import { createClientPortalLinkForClient } from '@/lib/client-portal/actions'
import { sendQuoteSentEmail } from '@/lib/email/notifications'

type QuoteDeliveryRecord = {
  id: string
  tenant_id: string
  client_id: string
  inquiry_id: string | null
  event_id: string | null
  status: string
  total_quoted_cents: number
  deposit_required: boolean | null
  deposit_amount_cents: number | null
  valid_until: string | null
}

async function getQuoteOccasion(
  db: any,
  input: { inquiryId: string | null; eventId: string | null }
): Promise<string | null> {
  if (input.inquiryId) {
    const { data: inquiry } = await db
      .from('inquiries')
      .select('confirmed_occasion')
      .eq('id', input.inquiryId)
      .maybeSingle()

    if (inquiry?.confirmed_occasion) {
      return inquiry.confirmed_occasion
    }
  }

  if (input.eventId) {
    const { data: event } = await db
      .from('events')
      .select('occasion')
      .eq('id', input.eventId)
      .maybeSingle()

    if (event?.occasion) {
      return event.occasion
    }
  }

  return null
}

export async function redeliverQuoteSentDelivery(input: {
  tenantId: string
  quoteId: string
}): Promise<{ emailSent: true; clientNotificationSent: boolean; message: string }> {
  const db: any = createServerClient({ admin: true })

  const { data: quote, error: quoteError } = await db
    .from('quotes')
    .select(
      'id, tenant_id, client_id, inquiry_id, event_id, status, total_quoted_cents, deposit_required, deposit_amount_cents, valid_until'
    )
    .eq('id', input.quoteId)
    .eq('tenant_id', input.tenantId)
    .single()

  if (quoteError || !quote) {
    throw new Error('Quote no longer exists for delivery repair.')
  }

  const quoteRecord = quote as QuoteDeliveryRecord
  if (quoteRecord.status !== 'sent') {
    throw new Error(`Quote is ${quoteRecord.status}, not sent. Automatic redelivery is blocked.`)
  }

  const [{ data: client }, { data: chef }] = await Promise.all([
    db
      .from('clients')
      .select('id, email, full_name')
      .eq('id', quoteRecord.client_id)
      .eq('tenant_id', input.tenantId)
      .single(),
    db.from('chefs').select('business_name').eq('id', input.tenantId).single(),
  ])

  if (!client?.email) {
    throw new Error('Client email is missing. Automatic quote redelivery is unavailable.')
  }

  const occasion = await getQuoteOccasion(db, {
    inquiryId: quoteRecord.inquiry_id,
    eventId: quoteRecord.event_id,
  })

  const chefName = chef?.business_name || 'Your Chef'
  const portalLink = await createClientPortalLinkForClient({
    db,
    clientId: quoteRecord.client_id,
    tenantId: input.tenantId,
    path: `/quotes/${quoteRecord.id}`,
  })
  const emailSent = await sendQuoteSentEmail({
    clientEmail: client.email,
    clientName: client.full_name,
    chefName,
    quoteId: quoteRecord.id,
    totalCents: quoteRecord.total_quoted_cents,
    depositRequired: quoteRecord.deposit_required ?? false,
    depositCents: quoteRecord.deposit_amount_cents ?? null,
    occasion,
    validUntil: quoteRecord.valid_until,
    quoteUrl: portalLink.url,
  })

  let clientNotificationSent = false

  try {
    const { createClientNotification } = await import('@/lib/notifications/client-actions')
    await createClientNotification({
      tenantId: input.tenantId,
      clientId: quoteRecord.client_id,
      category: 'quote',
      action: 'quote_sent_to_client',
      title: `New quote from ${chefName}`,
      body: `${(quoteRecord.total_quoted_cents / 100).toFixed(2)} for ${occasion || 'your event'}`,
      actionUrl: `/my-quotes/${quoteRecord.id}`,
      inquiryId: quoteRecord.inquiry_id ?? undefined,
    })
    clientNotificationSent = true
  } catch (notificationErr) {
    console.error(
      '[quote-delivery] Client notification replay failed (non-blocking):',
      notificationErr
    )
  }

  if (!emailSent) {
    throw new Error('Quote email provider did not confirm delivery.')
  }

  return {
    emailSent: true,
    clientNotificationSent,
    message: clientNotificationSent
      ? 'Quote email redelivered and client notification refreshed.'
      : 'Quote email redelivered.',
  }
}
