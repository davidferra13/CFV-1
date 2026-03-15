'use server'

// Gift Certificates - Feature 12.4
// Digital gift certificates that clients can purchase and gift to others.
// Federal law: gift cards must be valid for minimum 5 years.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

// ── Types ──────────────────────────────────────────────────────────────────

export type GiftCertificateStatus = 'active' | 'redeemed' | 'expired' | 'voided'

export type GiftCertificateRow = {
  id: string
  tenant_id: string
  code: string
  amount_cents: number
  balance_cents: number
  purchaser_name: string
  purchaser_email: string | null
  recipient_name: string | null
  recipient_email: string | null
  message: string | null
  status: GiftCertificateStatus
  purchased_at: string
  expires_at: string | null
  redeemed_at: string | null
  redeemed_event_id: string | null
  created_at: string
}

export type GiftCertificateCreateInput = {
  amount_cents: number
  purchaser_name: string
  purchaser_email?: string
  recipient_name?: string
  recipient_email?: string
  message?: string
  expires_at?: string
}

export type GiftCertificateStats = {
  totalSold: number
  totalSoldCents: number
  totalRedeemed: number
  totalRedeemedCents: number
  outstandingBalanceCents: number
  activeCount: number
}

export type GiftCertificateFilterOptions = {
  status?: GiftCertificateStatus | 'all'
}

// ── Helpers ────────────────────────────────────────────────────────────────

// Characters that are unambiguous (no O/0, I/1, L)
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** Generate a unique 8-character gift certificate code */
function generateCode(): string {
  const bytes = crypto.randomBytes(8)
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += CODE_CHARS[bytes[i] % CODE_CHARS.length]
  }
  return code
}

/** Default expiry: 5 years from now (federal minimum for gift cards) */
function defaultExpiryDate(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 5)
  return d.toISOString()
}

// ── Server Actions ─────────────────────────────────────────────────────────

export async function createGiftCertificate(
  data: GiftCertificateCreateInput
): Promise<GiftCertificateRow> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  if (data.amount_cents <= 0) {
    throw new Error('Amount must be greater than zero')
  }
  if (!data.purchaser_name?.trim()) {
    throw new Error('Purchaser name is required')
  }

  // Generate unique code with collision retry (max 3 attempts per anti-loop rule)
  let code = ''
  for (let attempt = 0; attempt < 3; attempt++) {
    const candidate = generateCode()
    const { data: existing } = await supabase
      .from('gift_certificates' as any)
      .select('id')
      .eq('code', candidate)
      .maybeSingle()

    if (!existing) {
      code = candidate
      break
    }
  }
  if (!code) {
    throw new Error('Failed to generate unique code after 3 attempts')
  }

  const expiresAt = data.expires_at || defaultExpiryDate()

  const { data: cert, error } = await supabase
    .from('gift_certificates' as any)
    .insert({
      tenant_id: tenantId,
      code,
      amount_cents: data.amount_cents,
      balance_cents: data.amount_cents,
      purchaser_name: data.purchaser_name.trim(),
      purchaser_email: data.purchaser_email?.trim() || null,
      recipient_name: data.recipient_name?.trim() || null,
      recipient_email: data.recipient_email?.trim() || null,
      message: data.message?.trim() || null,
      expires_at: expiresAt,
    })
    .select('*')
    .single()

  if (error) {
    console.error('[createGiftCertificate] Insert error:', error)
    throw new Error('Failed to create gift certificate')
  }

  revalidatePath('/gifts')
  return cert as GiftCertificateRow
}

export async function getGiftCertificates(
  options?: GiftCertificateFilterOptions
): Promise<GiftCertificateRow[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('gift_certificates' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getGiftCertificates] Error:', error)
    return []
  }

  return (data ?? []) as GiftCertificateRow[]
}

export async function redeemGiftCertificate(
  code: string,
  eventId: string,
  amountCents?: number
): Promise<GiftCertificateRow> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Look up the certificate
  const { data: cert, error: lookupError } = await supabase
    .from('gift_certificates' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('code', code.toUpperCase().trim())
    .single()

  if (lookupError || !cert) {
    throw new Error('Gift certificate not found')
  }

  const row = cert as GiftCertificateRow

  if (row.status !== 'active') {
    throw new Error(`Certificate is ${row.status}, cannot redeem`)
  }
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    throw new Error('Certificate has expired')
  }
  if (row.balance_cents <= 0) {
    throw new Error('Certificate has no remaining balance')
  }

  // Determine redemption amount (partial or full)
  const redeemAmount = amountCents ? Math.min(amountCents, row.balance_cents) : row.balance_cents

  if (redeemAmount <= 0) {
    throw new Error('Redemption amount must be greater than zero')
  }

  const newBalance = row.balance_cents - redeemAmount
  const newStatus = newBalance === 0 ? 'redeemed' : 'active'

  const { data: updated, error: updateError } = await supabase
    .from('gift_certificates' as any)
    .update({
      balance_cents: newBalance,
      status: newStatus,
      redeemed_at: newBalance === 0 ? new Date().toISOString() : row.redeemed_at,
      redeemed_event_id: eventId,
    })
    .eq('id', row.id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single()

  if (updateError) {
    console.error('[redeemGiftCertificate] Update error:', updateError)
    throw new Error('Failed to redeem gift certificate')
  }

  revalidatePath('/gifts')
  revalidatePath('/events')
  return updated as GiftCertificateRow
}

export async function voidGiftCertificate(id: string): Promise<GiftCertificateRow> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: cert, error } = await supabase
    .from('gift_certificates' as any)
    .update({ status: 'voided' })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single()

  if (error) {
    console.error('[voidGiftCertificate] Update error:', error)
    throw new Error('Failed to void gift certificate')
  }

  revalidatePath('/gifts')
  return cert as GiftCertificateRow
}

/**
 * Public lookup: no auth required.
 * Only returns non-sensitive fields (code, amount, balance, status, expiry).
 */
export async function lookupGiftCertificate(code: string): Promise<{
  code: string
  amount_cents: number
  balance_cents: number
  status: GiftCertificateStatus
  expires_at: string | null
  recipient_name: string | null
  message: string | null
} | null> {
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('gift_certificates' as any)
    .select('code, amount_cents, balance_cents, status, expires_at, recipient_name, message')
    .eq('code', code.toUpperCase().trim())
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data
}

export async function getGiftCertificateStats(): Promise<GiftCertificateStats> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('gift_certificates' as any)
    .select('amount_cents, balance_cents, status')
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[getGiftCertificateStats] Error:', error)
    return {
      totalSold: 0,
      totalSoldCents: 0,
      totalRedeemed: 0,
      totalRedeemedCents: 0,
      outstandingBalanceCents: 0,
      activeCount: 0,
    }
  }

  const certs = (data ?? []) as { amount_cents: number; balance_cents: number; status: string }[]

  const totalSold = certs.length
  const totalSoldCents = certs.reduce((sum, c) => sum + c.amount_cents, 0)
  const redeemed = certs.filter((c) => c.status === 'redeemed')
  const totalRedeemed = redeemed.length
  const totalRedeemedCents = redeemed.reduce((sum, c) => sum + c.amount_cents, 0)
  const activeCerts = certs.filter((c) => c.status === 'active')
  const outstandingBalanceCents = activeCerts.reduce((sum, c) => sum + c.balance_cents, 0)

  return {
    totalSold,
    totalSoldCents,
    totalRedeemed,
    totalRedeemedCents,
    outstandingBalanceCents,
    activeCount: activeCerts.length,
  }
}
