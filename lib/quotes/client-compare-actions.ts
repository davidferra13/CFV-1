// Quote Comparison Actions - Client-side
// Fetches multiple quotes with line items for side-by-side comparison.

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export interface CompareLineItem {
  id: string
  label: string
  amount_cents: number
  sort_order: number
}

export interface CompareAddon {
  id: string
  label: string
  description: string | null
  price_cents: number
  is_per_person: boolean
}

export interface CompareQuote {
  id: string
  quote_name: string | null
  status: string
  pricing_model: string | null
  price_per_person_cents: number | null
  guest_count_estimated: number | null
  total_quoted_cents: number | null
  addon_total_cents: number | null
  effective_total_cents: number | null
  deposit_amount_cents: number | null
  deposit_required: boolean | null
  exclusions_note: string | null
  show_cost_breakdown: boolean
  sent_at: string | null
  valid_until: string | null
  created_at: string
  version: number
  occasion: string | null
  event_date: string | null
  line_items: CompareLineItem[]
  addons: CompareAddon[]
}

/**
 * Fetch multiple quotes for comparison, scoped to the current client.
 * Maximum of 4 quotes to prevent abuse.
 */
export async function getQuotesForComparison(quoteIds: number[]): Promise<CompareQuote[]> {
  const user = await requireClient()
  const db: any = createServerClient()

  if (!quoteIds.length || quoteIds.length > 4) {
    return []
  }

  const stringIds = quoteIds.map(String)

  const { data: quotes, error } = await db
    .from('quotes')
    .select(
      `
      id, quote_name, status, pricing_model,
      price_per_person_cents, guest_count_estimated,
      total_quoted_cents, addon_total_cents, effective_total_cents,
      deposit_amount_cents, deposit_required, exclusions_note,
      show_cost_breakdown, sent_at, valid_until, created_at, version,
      inquiry:inquiries(confirmed_occasion, confirmed_date),
      event:events(occasion, event_date)
    `
    )
    .eq('client_id', user.entityId)
    .in('id', stringIds)
    .in('status', ['sent', 'accepted', 'rejected'])
    .order('created_at', { ascending: false })

  if (error || !quotes?.length) {
    if (error) console.error('[getQuotesForComparison] Error:', error)
    return []
  }

  // Fetch line items for all quotes (client-visible only)
  const quoteDbIds = quotes.map((q: any) => q.id)
  const { data: lineItems } = await db
    .from('quote_line_items')
    .select('id, quote_id, label, amount_cents, sort_order')
    .in('quote_id', quoteDbIds)
    .eq('is_visible_to_client', true)
    .order('sort_order', { ascending: true })

  // Fetch addons for all quotes
  const { data: addons } = await db
    .from('quote_addons')
    .select('id, quote_id, label, description, price_cents, is_per_person')
    .in('quote_id', quoteDbIds)
    .order('sort_order', { ascending: true })

  // Group by quote_id
  const lineItemsByQuote = new Map<string, CompareLineItem[]>()
  for (const li of lineItems ?? []) {
    const arr = lineItemsByQuote.get(li.quote_id) ?? []
    arr.push({
      id: li.id,
      label: li.label,
      amount_cents: li.amount_cents,
      sort_order: li.sort_order,
    })
    lineItemsByQuote.set(li.quote_id, arr)
  }

  const addonsByQuote = new Map<string, CompareAddon[]>()
  for (const a of addons ?? []) {
    const arr = addonsByQuote.get(a.quote_id) ?? []
    arr.push({
      id: a.id,
      label: a.label,
      description: a.description ?? null,
      price_cents: a.price_cents,
      is_per_person: a.is_per_person,
    })
    addonsByQuote.set(a.quote_id, arr)
  }

  return quotes.map((q: any) => ({
    id: q.id,
    quote_name: q.quote_name,
    status: q.status,
    pricing_model: q.pricing_model,
    price_per_person_cents: q.price_per_person_cents,
    guest_count_estimated: q.guest_count_estimated,
    total_quoted_cents: q.total_quoted_cents,
    addon_total_cents: q.addon_total_cents,
    effective_total_cents: q.effective_total_cents,
    deposit_amount_cents: q.deposit_amount_cents,
    deposit_required: q.deposit_required,
    exclusions_note: q.exclusions_note,
    show_cost_breakdown: q.show_cost_breakdown ?? false,
    sent_at: q.sent_at,
    valid_until: q.valid_until,
    created_at: q.created_at,
    version: q.version ?? 1,
    occasion: q.event?.occasion ?? q.inquiry?.confirmed_occasion ?? null,
    event_date: q.event?.event_date ?? q.inquiry?.confirmed_date ?? null,
    line_items: lineItemsByQuote.get(q.id) ?? [],
    addons: addonsByQuote.get(q.id) ?? [],
  }))
}
