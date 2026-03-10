'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Types ──────────────────────────────────────────────────────────────────

export interface GiftCard {
  id: string
  tenantId: string
  code: string
  initialValueCents: number
  currentBalanceCents: number
  purchaserName: string | null
  purchaserEmail: string | null
  recipientName: string | null
  recipientEmail: string | null
  message: string | null
  status: 'active' | 'redeemed' | 'expired' | 'cancelled'
  expiresAt: string | null
  issuedAt: string
  createdAt: string
  updatedAt: string
}

export interface GiftCardTransaction {
  id: string
  tenantId: string
  giftCardId: string
  transactionType: 'purchase' | 'redemption' | 'refund' | 'adjustment'
  amountCents: number
  balanceAfterCents: number
  description: string | null
  saleId: string | null
  createdAt: string
}

export interface GiftCardStats {
  totalIssuedCents: number
  totalIssuedCount: number
  outstandingLiabilityCents: number
  totalRedeemedCents: number
  activeCount: number
  redeemedCount: number
  expiredCount: number
  cancelledCount: number
}

// ── Helpers ────────────────────────────────────────────────────────────────

function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I, O, 0, 1 for readability
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `GC-${result}`
}

function mapCard(r: any): GiftCard {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    code: r.code,
    initialValueCents: r.initial_value_cents,
    currentBalanceCents: r.current_balance_cents,
    purchaserName: r.purchaser_name,
    purchaserEmail: r.purchaser_email,
    recipientName: r.recipient_name,
    recipientEmail: r.recipient_email,
    message: r.message,
    status: r.status,
    expiresAt: r.expires_at,
    issuedAt: r.issued_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function mapTransaction(r: any): GiftCardTransaction {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    giftCardId: r.gift_card_id,
    transactionType: r.transaction_type,
    amountCents: r.amount_cents,
    balanceAfterCents: r.balance_after_cents,
    description: r.description,
    saleId: r.sale_id,
    createdAt: r.created_at,
  }
}

// ── Actions ────────────────────────────────────────────────────────────────

export async function issueGiftCard(data: {
  valueCents: number
  purchaserName?: string
  purchaserEmail?: string
  recipientName?: string
  recipientEmail?: string
  message?: string
  expiresAt?: string
}): Promise<GiftCard> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Generate a unique code, retry if collision
  let code = generateGiftCardCode()
  let attempts = 0
  while (attempts < 5) {
    const { data: existing } = await supabase
      .from('gift_cards')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('code', code)
      .single()
    if (!existing) break
    code = generateGiftCardCode()
    attempts++
  }

  const { data: card, error } = await supabase
    .from('gift_cards')
    .insert({
      tenant_id: tenantId,
      code,
      initial_value_cents: data.valueCents,
      current_balance_cents: data.valueCents,
      purchaser_name: data.purchaserName || null,
      purchaser_email: data.purchaserEmail || null,
      recipient_name: data.recipientName || null,
      recipient_email: data.recipientEmail || null,
      message: data.message || null,
      expires_at: data.expiresAt || null,
      status: 'active',
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to issue gift card: ${error.message}`)

  // Record purchase transaction
  await supabase.from('gift_card_transactions').insert({
    tenant_id: tenantId,
    gift_card_id: card.id,
    transaction_type: 'purchase',
    amount_cents: data.valueCents,
    balance_after_cents: data.valueCents,
    description: 'Initial gift card purchase',
  })

  revalidatePath('/commerce/gift-cards')
  return mapCard(card)
}

export async function lookupGiftCard(code: string): Promise<GiftCard | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('gift_cards')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('code', code.toUpperCase().trim())
    .single()

  if (!data) return null
  return mapCard(data)
}

export async function redeemGiftCard(
  code: string,
  amountCents: number,
  saleId?: string
): Promise<{ success: boolean; remainingCents: number; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: card } = await supabase
    .from('gift_cards')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('code', code.toUpperCase().trim())
    .single()

  if (!card) return { success: false, remainingCents: 0, error: 'Gift card not found' }
  if (card.status !== 'active')
    return {
      success: false,
      remainingCents: card.current_balance_cents,
      error: `Gift card is ${card.status}`,
    }
  if (card.expires_at && new Date(card.expires_at) < new Date()) {
    // Mark as expired
    await supabase
      .from('gift_cards')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', card.id)
    return {
      success: false,
      remainingCents: card.current_balance_cents,
      error: 'Gift card has expired',
    }
  }
  if (card.current_balance_cents < amountCents) {
    return {
      success: false,
      remainingCents: card.current_balance_cents,
      error: `Insufficient balance. Available: ${card.current_balance_cents} cents`,
    }
  }

  const newBalance = card.current_balance_cents - amountCents
  const newStatus = newBalance === 0 ? 'redeemed' : 'active'

  await supabase
    .from('gift_cards')
    .update({
      current_balance_cents: newBalance,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', card.id)

  await supabase.from('gift_card_transactions').insert({
    tenant_id: tenantId,
    gift_card_id: card.id,
    transaction_type: 'redemption',
    amount_cents: -amountCents,
    balance_after_cents: newBalance,
    description: saleId ? `Redeemed against sale ${saleId}` : 'Manual redemption',
    sale_id: saleId || null,
  })

  revalidatePath('/commerce/gift-cards')
  return { success: true, remainingCents: newBalance }
}

export async function refundToGiftCard(giftCardId: string, amountCents: number): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: card } = await supabase
    .from('gift_cards')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', giftCardId)
    .single()

  if (!card) throw new Error('Gift card not found')

  const newBalance = card.current_balance_cents + amountCents

  await supabase
    .from('gift_cards')
    .update({
      current_balance_cents: newBalance,
      status: 'active', // reactivate if was fully redeemed
      updated_at: new Date().toISOString(),
    })
    .eq('id', card.id)

  await supabase.from('gift_card_transactions').insert({
    tenant_id: tenantId,
    gift_card_id: card.id,
    transaction_type: 'refund',
    amount_cents: amountCents,
    balance_after_cents: newBalance,
    description: 'Refund credited to gift card',
  })

  revalidatePath('/commerce/gift-cards')
}

export async function getGiftCards(status?: string): Promise<GiftCard[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('gift_cards')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data } = await query
  return (data || []).map(mapCard)
}

export async function getGiftCardTransactions(giftCardId: string): Promise<GiftCardTransaction[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('gift_card_transactions')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('gift_card_id', giftCardId)
    .order('created_at', { ascending: false })

  return (data || []).map(mapTransaction)
}

export async function getGiftCardStats(): Promise<GiftCardStats> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('gift_cards')
    .select('initial_value_cents, current_balance_cents, status')
    .eq('tenant_id', user.tenantId!)

  const cards: Array<{
    initial_value_cents: number
    current_balance_cents: number
    status: string
  }> = data || []

  const totalIssuedCents = cards.reduce((s, c) => s + c.initial_value_cents, 0)
  const outstandingLiabilityCents = cards
    .filter((c) => c.status === 'active')
    .reduce((s, c) => s + c.current_balance_cents, 0)
  const totalRedeemedCents = cards.reduce(
    (s, c) => s + (c.initial_value_cents - c.current_balance_cents),
    0
  )

  return {
    totalIssuedCents,
    totalIssuedCount: cards.length,
    outstandingLiabilityCents,
    totalRedeemedCents,
    activeCount: cards.filter((c) => c.status === 'active').length,
    redeemedCount: cards.filter((c) => c.status === 'redeemed').length,
    expiredCount: cards.filter((c) => c.status === 'expired').length,
    cancelledCount: cards.filter((c) => c.status === 'cancelled').length,
  }
}

export async function bulkIssueGiftCards(count: number, valueCents: number): Promise<GiftCard[]> {
  const results: GiftCard[] = []
  for (let i = 0; i < count; i++) {
    const card = await issueGiftCard({ valueCents })
    results.push(card)
  }
  return results
}

export async function cancelGiftCard(id: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: card } = await supabase
    .from('gift_cards')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('id', id)
    .single()

  if (!card) throw new Error('Gift card not found')

  await supabase
    .from('gift_cards')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (card.current_balance_cents > 0) {
    await supabase.from('gift_card_transactions').insert({
      tenant_id: user.tenantId!,
      gift_card_id: id,
      transaction_type: 'adjustment',
      amount_cents: -card.current_balance_cents,
      balance_after_cents: 0,
      description: 'Card cancelled, remaining balance voided',
    })
  }

  revalidatePath('/commerce/gift-cards')
}
