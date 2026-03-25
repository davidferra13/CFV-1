import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  generateSplitInvoices,
  getSplitBilling,
  setSplitBilling,
  type SplitEntry,
} from '@/lib/operations/split-billing-actions'

export type PaymentSplitEvent = {
  id: string
  occasion: string | null
  event_date: string
  quoted_price_cents: number | null
  split_billing: Array<{
    client_id: string
    percentage: number
    amount_cents: number
  }> | null
}

export async function listPaymentSplitEvents(limit = 25): Promise<PaymentSplitEvent[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('events')
    .select('id, occasion, event_date, quoted_price_cents, split_billing')
    .eq('tenant_id', user.tenantId!)
    .not('split_billing', 'is', null)
    .order('event_date', { ascending: false })
    .limit(Math.max(1, Math.min(limit, 100)))

  if (error) {
    throw new Error(`Failed to load split payment events: ${error.message}`)
  }

  return (data || []) as PaymentSplitEvent[]
}

export async function getPaymentSplitDetails(eventId: string) {
  const [config, invoices] = await Promise.all([
    getSplitBilling(eventId),
    generateSplitInvoices(eventId),
  ])
  return {
    eventId,
    config,
    invoices,
  }
}

export async function updateEventPaymentSplits(input: {
  eventId: string
  splits: SplitEntry[]
  expectedCurrentSignature?: string
}) {
  const existing = await getSplitBilling(input.eventId)
  const currentSignature = JSON.stringify(existing.splits)

  // Guard against silent overwrite in financial records.
  if (input.expectedCurrentSignature && input.expectedCurrentSignature !== currentSignature) {
    throw new Error('Split billing was updated by someone else. Reload and try again.')
  }

  await setSplitBilling(input.eventId, input.splits)
  return {
    success: true,
    signature: JSON.stringify(input.splits),
  }
}
