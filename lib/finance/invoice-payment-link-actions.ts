'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { createPaymentCheckoutUrl } from '@/lib/stripe/checkout'
import { revalidatePath } from 'next/cache'

export type InvoicePaymentStatusSummary = {
  eventId: string
  paymentStatus: string
  totalPaidCents: number
  outstandingBalanceCents: number
}

export async function generateHostedInvoicePaymentLink(eventId: string): Promise<{
  url: string
  expiresAtIso: string
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event, error } = await (db
    .from('events')
    .select('id, tenant_id, status')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (error || !event) {
    throw new Error('Event invoice not found')
  }

  if (String(event.status ?? '') !== 'accepted') {
    throw new Error('Hosted payment links are only available for accepted invoices')
  }

  const url = await createPaymentCheckoutUrl(String(event.id), user.tenantId!)
  if (!url) {
    throw new Error('Unable to generate hosted payment link for this invoice')
  }

  const expiresAtIso = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
  revalidatePath('/finance/invoices/sent')
  return { url, expiresAtIso }
}

export async function listInvoicePaymentStatusSummaries(
  eventIds: string[]
): Promise<Record<string, InvoicePaymentStatusSummary>> {
  await requireChef()
  const db: any = createServerClient()

  const ids = Array.from(
    new Set(
      (eventIds ?? [])
        .map((value) => String(value ?? '').trim())
        .filter((value) => value.length > 0)
    )
  )
  if (ids.length === 0) return {}

  const { data, error } = await (db
    .from('event_financial_summary')
    .select('event_id, payment_status, total_paid_cents, outstanding_balance_cents')
    .in('event_id', ids as any) as any)

  if (error) {
    throw new Error(`Failed to load invoice payment status summaries: ${error.message}`)
  }

  const map: Record<string, InvoicePaymentStatusSummary> = {}
  for (const row of (data ?? []) as any[]) {
    const eventId = String(row.event_id ?? '')
    if (!eventId) continue
    map[eventId] = {
      eventId,
      paymentStatus: String(row.payment_status ?? 'unpaid'),
      totalPaidCents: Number(row.total_paid_cents ?? 0),
      outstandingBalanceCents: Number(row.outstanding_balance_cents ?? 0),
    }
  }
  return map
}
