'use server'

import { revalidatePath } from 'next/cache'
import { requireChef, requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

type QuoteLineItemInput = {
  label: string
  amountCents: number
  percentage?: number
  sortOrder?: number
  isVisibleToClient?: boolean
  sourceNote?: string
}

type QuoteLineItemRecord = {
  id: string
  quote_id: string
  tenant_id: string
  label: string
  amount_cents: number
  percentage: number | null
  sort_order: number
  is_visible_to_client: boolean
  source_note: string | null
  created_at: string
}

function revalidateQuotePaths(quoteId: string) {
  revalidatePath(`/quotes/${quoteId}`)
  revalidatePath(`/my-quotes/${quoteId}`)
}

async function assertChefQuoteAccess(quoteId: string, tenantId: string) {
  const supabase: any = createServerClient()
  const { data: quote } = await supabase
    .from('quotes')
    .select('id, tenant_id, client_id, total_quoted_cents, show_cost_breakdown, exclusions_note')
    .eq('id', quoteId)
    .eq('tenant_id', tenantId)
    .single()

  if (!quote) {
    throw new Error('Quote not found')
  }

  return quote as {
    id: string
    tenant_id: string
    client_id: string
    total_quoted_cents: number
    show_cost_breakdown: boolean
    exclusions_note: string | null
  }
}

async function assertClientQuoteAccess(quoteId: string, clientId: string) {
  const supabase: any = createServerClient()
  const { data: quote } = await supabase
    .from('quotes')
    .select('id, tenant_id, client_id, total_quoted_cents, show_cost_breakdown, exclusions_note')
    .eq('id', quoteId)
    .eq('client_id', clientId)
    .single()

  if (!quote) {
    throw new Error('Quote not found')
  }

  return quote as {
    id: string
    tenant_id: string
    client_id: string
    total_quoted_cents: number
    show_cost_breakdown: boolean
    exclusions_note: string | null
  }
}

export async function setQuoteLineItems(quoteId: string, items: QuoteLineItemInput[]) {
  const user = await requireChef()
  await assertChefQuoteAccess(quoteId, user.tenantId!)
  const supabase: any = createServerClient()

  const cleaned = items
    .map((item, index) => ({
      quote_id: quoteId,
      tenant_id: user.tenantId!,
      label: item.label.trim(),
      amount_cents: Math.max(0, Math.round(item.amountCents)),
      percentage: item.percentage == null ? null : Number(item.percentage),
      sort_order: item.sortOrder ?? index,
      is_visible_to_client: item.isVisibleToClient !== false,
      source_note: item.sourceNote?.trim() || null,
    }))
    .filter((item) => item.label.length > 0)

  const { error: deleteError } = await supabase.from('quote_line_items').delete().eq('quote_id', quoteId)
  if (deleteError) {
    console.error('[setQuoteLineItems] Delete error:', deleteError)
    throw new Error('Failed to save quote line items')
  }

  if (cleaned.length > 0) {
    const { error: insertError } = await supabase.from('quote_line_items').insert(cleaned)
    if (insertError) {
      console.error('[setQuoteLineItems] Insert error:', insertError)
      throw new Error('Failed to save quote line items')
    }
  }

  revalidateQuotePaths(quoteId)
  return getQuoteLineItems(quoteId)
}

export async function getQuoteLineItems(quoteId: string) {
  const user = await requireChef()
  const quote = await assertChefQuoteAccess(quoteId, user.tenantId!)
  const supabase: any = createServerClient()

  const { data: lineItems, error } = await supabase
    .from('quote_line_items')
    .select('*')
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[getQuoteLineItems] Error:', error)
    throw new Error('Failed to fetch quote line items')
  }

  return {
    quote,
    lineItems: ((lineItems ?? []) as QuoteLineItemRecord[]) || [],
  }
}

export async function toggleQuoteCostBreakdown(quoteId: string, show: boolean) {
  const user = await requireChef()
  await assertChefQuoteAccess(quoteId, user.tenantId!)
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('quotes')
    .update({ show_cost_breakdown: show, updated_by: user.id })
    .eq('id', quoteId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[toggleQuoteCostBreakdown] Error:', error)
    throw new Error('Failed to update quote cost breakdown visibility')
  }

  revalidateQuotePaths(quoteId)
  return { success: true, show }
}

export async function setQuoteExclusionsNote(quoteId: string, note: string) {
  const user = await requireChef()
  await assertChefQuoteAccess(quoteId, user.tenantId!)
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('quotes')
    .update({ exclusions_note: note.trim() || null, updated_by: user.id })
    .eq('id', quoteId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[setQuoteExclusionsNote] Error:', error)
    throw new Error('Failed to update quote exclusions')
  }

  revalidateQuotePaths(quoteId)
  return { success: true }
}

export async function updateCostBreakdownDefaults(
  showByDefault: boolean,
  defaultExclusionsNote?: string
) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('chefs')
    .update({
      default_show_cost_breakdown: showByDefault,
      default_exclusions_note: defaultExclusionsNote?.trim() || null,
    })
    .eq('id', user.tenantId!)

  if (error) {
    console.error('[updateCostBreakdownDefaults] Error:', error)
    throw new Error('Failed to update quote defaults')
  }

  revalidatePath('/settings/client-preview')
  return { success: true }
}

export async function getClientQuoteLineItems(quoteId: string) {
  const user = await requireClient()
  const quote = await assertClientQuoteAccess(quoteId, user.entityId)
  const supabase: any = createServerClient()

  const { data: lineItems, error } = await supabase
    .from('quote_line_items')
    .select('*')
    .eq('quote_id', quoteId)
    .eq('is_visible_to_client', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[getClientQuoteLineItems] Error:', error)
    throw new Error('Failed to fetch client quote line items')
  }

  return {
    showCostBreakdown: quote.show_cost_breakdown,
    exclusionsNote: quote.exclusions_note,
    totalQuotedCents: quote.total_quoted_cents,
    lineItems: ((lineItems ?? []) as QuoteLineItemRecord[]) || [],
  }
}
