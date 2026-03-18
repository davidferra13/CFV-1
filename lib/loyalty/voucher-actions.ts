'use server'

import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAuth, requireChef, type AuthUser } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils/currency'

type IncentiveType = 'voucher' | 'gift_card'
type DeliveryChannel = 'email' | 'manual'

type IncentiveRecord = {
  id: string
  tenant_id: string
  type: IncentiveType
  code: string
  title: string
  note: string | null
  currency_code: string
  amount_cents: number | null
  discount_percent: number | null
  expires_at: string | null
  max_redemptions: number
  redemptions_used: number
  is_active: boolean
  target_client_id: string | null
  created_by_user_id: string
  created_by_role: 'chef' | 'client'
  created_by_client_id: string | null
  created_at: string
  updated_at: string
}

type IncentiveDeliveryRecord = {
  id: string
  incentive_id: string
  tenant_id: string
  sent_by_user_id: string
  recipient_name: string | null
  recipient_email: string
  message: string | null
  delivery_channel: DeliveryChannel
  sent_at: string
}

type UntypedSupabaseClient = any & {
  from: (relation: string) => any
}

const CreateVoucherOrGiftCardSchema = z
  .object({
    type: z.enum(['voucher', 'gift_card']),
    title: z.string().min(1, 'Title is required').max(120, 'Title is too long'),
    note: z.string().max(1000, 'Note is too long').optional(),
    code: z
      .string()
      .min(4, 'Code must be at least 4 characters')
      .max(32, 'Code must be 32 characters or fewer')
      .regex(/^[A-Za-z0-9-]+$/, 'Code may only contain letters, numbers, and hyphens')
      .optional(),
    amount_cents: z.number().int().positive('Amount must be positive').optional(),
    discount_percent: z.number().int().min(1).max(100).optional(),
    expires_at: z.string().optional(),
    max_redemptions: z.number().int().min(1).max(1000).optional(),
    target_client_id: z.string().uuid().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    const hasAmount = value.amount_cents != null
    const hasDiscount = value.discount_percent != null

    if (value.type === 'gift_card') {
      if (!hasAmount || hasDiscount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Gift cards require amount_cents and cannot use discount_percent',
          path: ['amount_cents'],
        })
      }
      return
    }

    if (hasAmount === hasDiscount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vouchers must define either amount_cents or discount_percent (not both)',
        path: ['amount_cents'],
      })
    }
  })

const SendVoucherOrGiftCardSchema = z.object({
  incentive_id: z.string().uuid(),
  recipient_email: z.string().email('Valid recipient email required'),
  recipient_name: z.string().max(120, 'Recipient name is too long').optional(),
  message: z.string().max(1000, 'Message is too long').optional(),
  delivery_channel: z.enum(['email', 'manual']).default('email'),
})

export type CreateVoucherOrGiftCardInput = z.infer<typeof CreateVoucherOrGiftCardSchema>
export type SendVoucherOrGiftCardInput = z.infer<typeof SendVoucherOrGiftCardSchema>
export type { IncentiveRecord, IncentiveDeliveryRecord }

function getUntypedSupabaseClient() {
  return createServerClient() as unknown as UntypedSupabaseClient
}

function normalizeCode(raw: string): string {
  const normalized = raw
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')

  if (normalized.length < 4 || normalized.length > 32) {
    throw new Error('Code must be 4-32 characters after normalization')
  }

  return normalized
}

function generateCode(type: IncentiveType): string {
  const prefix = type === 'gift_card' ? 'GFT' : 'VCH'
  return `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
}

function parseExpiryToIso(expiresAt?: string): string | null {
  if (!expiresAt) return null

  const parsed = new Date(expiresAt)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid expires_at date')
  }

  return parsed.toISOString()
}

function isUniqueCodeViolation(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false
  return error.code === '23505' || error.message?.includes('uq_client_incentives_tenant_code')
}

async function resolveTenantForUser(user: AuthUser, supabase: UntypedSupabaseClient) {
  if (user.role === 'chef') {
    if (!user.tenantId) {
      throw new Error('Chef account is missing tenant context')
    }
    return { tenantId: user.tenantId, clientId: null as string | null }
  }

  const { data, error } = await supabase
    .from('clients')
    .select('id, tenant_id')
    .eq('id', user.entityId)
    .single()

  if (error || !data) {
    throw new Error('Client account not found')
  }

  const client = data as { id: string; tenant_id: string | null }

  if (!client.tenant_id) {
    throw new Error('Client account must be linked to a chef to create vouchers or gift cards')
  }

  return {
    tenantId: client.tenant_id,
    clientId: client.id,
  }
}

async function ensureClientBelongsToTenant(
  supabase: UntypedSupabaseClient,
  tenantId: string,
  clientId: string
) {
  const { data, error } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) {
    throw new Error('Target client was not found in this tenant')
  }
}

function formatIncentiveValueLabel(incentive: IncentiveRecord): string {
  if (incentive.discount_percent != null) {
    return `${incentive.discount_percent}% off`
  }

  if (incentive.amount_cents != null) {
    const amount = formatCurrency(incentive.amount_cents, incentive.currency_code || 'USD')
    if (incentive.type === 'gift_card') {
      return `${amount} gift card value`
    }
    return `${amount} off`
  }

  return 'Value available at redemption'
}

export async function createVoucherOrGiftCard(input: CreateVoucherOrGiftCardInput) {
  const user = await requireAuth()
  const validated = CreateVoucherOrGiftCardSchema.parse(input)
  const supabase = getUntypedSupabaseClient()

  const { tenantId, clientId } = await resolveTenantForUser(user, supabase)

  let targetClientId = validated.target_client_id ?? null

  if (user.role === 'client') {
    if (targetClientId && targetClientId !== clientId) {
      throw new Error('Clients can only create vouchers or gift cards for themselves')
    }
    targetClientId = clientId
  } else if (targetClientId) {
    await ensureClientBelongsToTenant(supabase, tenantId, targetClientId)
  }

  const expiresAtIso = parseExpiryToIso(validated.expires_at)

  let code = validated.code ? normalizeCode(validated.code) : generateCode(validated.type)

  let created: IncentiveRecord | null = null

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('client_incentives')
      .insert({
        tenant_id: tenantId,
        type: validated.type,
        code,
        title: validated.title.trim(),
        note: validated.note?.trim() || null,
        currency_code: 'USD',
        amount_cents: validated.amount_cents ?? null,
        discount_percent: validated.discount_percent ?? null,
        expires_at: expiresAtIso,
        max_redemptions: validated.max_redemptions ?? 1,
        target_client_id: targetClientId,
        created_by_user_id: user.id,
        created_by_role: user.role,
        created_by_client_id: user.role === 'client' ? user.entityId : null,
      })
      .select('*')
      .single()

    if (!error && data) {
      created = data as IncentiveRecord
      break
    }

    if (isUniqueCodeViolation(error)) {
      if (validated.code) {
        throw new Error('This code is already in use for your tenant')
      }
      code = generateCode(validated.type)
      continue
    }

    console.error('[createVoucherOrGiftCard] Error:', error)
    throw new Error('Failed to create voucher or gift card')
  }

  if (!created) {
    throw new Error('Could not generate a unique code. Please try again.')
  }

  revalidatePath('/loyalty')
  revalidatePath('/my-rewards')

  return {
    success: true as const,
    incentive: created,
  }
}

export async function getVoucherAndGiftCards() {
  const user = await requireAuth()
  const supabase = getUntypedSupabaseClient()
  const { tenantId, clientId } = await resolveTenantForUser(user, supabase)

  let query = supabase
    .from('client_incentives')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (user.role === 'client' && clientId) {
    query = query.or(`created_by_client_id.eq.${clientId},target_client_id.eq.${clientId}`)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getVoucherAndGiftCards] Error:', error)
    throw new Error('Failed to fetch vouchers and gift cards')
  }

  return (data || []) as IncentiveRecord[]
}

type IncentiveRedemptionRecord = {
  id: string
  incentive_id: string
  tenant_id: string
  event_id: string
  client_id: string
  code: string
  type: IncentiveType
  applied_amount_cents: number
  applied_discount_percent: number | null
  balance_before_cents: number | null
  balance_after_cents: number | null
  ledger_entry_id: string | null
  redeemed_by_user_id: string | null
  redeemed_at: string
  created_at: string
  // Joined fields
  event?: { occasion: string | null; event_date: string } | null
  client?: { full_name: string | null } | null
}

type IncentiveStats = {
  totalIssued: number
  totalRedeemed: number
  totalValueAppliedCents: number
  giftCardCount: number
  voucherCount: number
}

export type { IncentiveRedemptionRecord, IncentiveStats }

/**
 * Deactivate a voucher or gift card (chef-only, soft disable).
 * Does not delete - preserves history and redemption records.
 */
export async function deactivateIncentive(incentiveId: string) {
  const user = await requireChef()
  const supabase = getUntypedSupabaseClient()

  const { error } = await supabase
    .from('client_incentives')
    .update({ is_active: false })
    .eq('id', incentiveId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deactivateIncentive] Error:', error)
    throw new Error('Failed to deactivate incentive')
  }

  revalidatePath('/clients/gift-cards')
  return { success: true as const }
}

/**
 * Get redemption history for a specific incentive, or all redemptions for the tenant.
 * Chef-only. Joins event and client data for display.
 */
export async function getIncentiveRedemptions(incentiveId?: string) {
  const user = await requireChef()
  const supabase = getUntypedSupabaseClient()

  let query = supabase
    .from('incentive_redemptions')
    .select(
      `
      *,
      event:events(occasion, event_date),
      client:clients(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .order('redeemed_at', { ascending: false })
    .limit(100)

  if (incentiveId) {
    query = query.eq('incentive_id', incentiveId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getIncentiveRedemptions] Error:', error)
    throw new Error('Failed to fetch redemption history')
  }

  return (data || []) as IncentiveRedemptionRecord[]
}

/**
 * Aggregate stats for all incentives in the tenant.
 * Chef-only. Used for the gift cards management page summary cards.
 */
export async function getIncentiveStats(): Promise<IncentiveStats> {
  const user = await requireChef()
  const supabase = getUntypedSupabaseClient()

  const { data: incentives, error: incentivesError } = await supabase
    .from('client_incentives')
    .select('type, is_active')
    .eq('tenant_id', user.tenantId!)

  if (incentivesError) {
    console.error('[getIncentiveStats] Error:', incentivesError)
    throw new Error('Failed to fetch incentive stats')
  }

  const { data: redemptions, error: redemptionsError } = await supabase
    .from('incentive_redemptions')
    .select('applied_amount_cents')
    .eq('tenant_id', user.tenantId!)

  if (redemptionsError) {
    console.error('[getIncentiveStats] Redemptions error:', redemptionsError)
  }

  const all = (incentives || []) as { type: IncentiveType; is_active: boolean }[]
  const reds = (redemptions || []) as { applied_amount_cents: number }[]

  return {
    totalIssued: all.length,
    totalRedeemed: reds.length,
    totalValueAppliedCents: reds.reduce((sum, r) => sum + r.applied_amount_cents, 0),
    giftCardCount: all.filter((i) => i.type === 'gift_card').length,
    voucherCount: all.filter((i) => i.type === 'voucher').length,
  }
}

export async function sendVoucherOrGiftCardToAnyone(input: SendVoucherOrGiftCardInput) {
  const user = await requireChef()
  const validated = SendVoucherOrGiftCardSchema.parse(input)
  const supabase = getUntypedSupabaseClient()

  const { data: incentiveData, error: incentiveError } = await supabase
    .from('client_incentives')
    .select('*')
    .eq('id', validated.incentive_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (incentiveError || !incentiveData) {
    throw new Error('Voucher or gift card not found')
  }

  const incentive = incentiveData as IncentiveRecord

  if (!incentive.is_active) {
    throw new Error('This voucher or gift card is inactive')
  }

  if (incentive.expires_at && new Date(incentive.expires_at).getTime() < Date.now()) {
    throw new Error('This voucher or gift card has expired')
  }

  const { data: deliveryData, error: deliveryError } = await supabase
    .from('incentive_deliveries')
    .insert({
      incentive_id: incentive.id,
      tenant_id: user.tenantId!,
      sent_by_user_id: user.id,
      recipient_name: validated.recipient_name?.trim() || null,
      recipient_email: validated.recipient_email.toLowerCase(),
      message: validated.message?.trim() || null,
      delivery_channel: validated.delivery_channel,
    })
    .select('*')
    .single()

  if (deliveryError || !deliveryData) {
    console.error('[sendVoucherOrGiftCardToAnyone] Delivery log error:', deliveryError)
    throw new Error('Failed to record voucher or gift card delivery')
  }

  const { data: chefData } = await supabase
    .from('chefs')
    .select('business_name, display_name')
    .eq('id', user.tenantId!)
    .single()

  if (validated.delivery_channel === 'email') {
    const { sendIncentiveDeliveryEmail } = await import('@/lib/email/notifications')

    const expiresAtLabel = incentive.expires_at
      ? new Date(incentive.expires_at).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : null

    await sendIncentiveDeliveryEmail({
      recipientEmail: validated.recipient_email,
      recipientName: validated.recipient_name,
      senderName: chefData?.display_name || chefData?.business_name || 'Your Chef',
      incentiveType: incentive.type,
      title: incentive.title,
      code: incentive.code,
      valueLabel: formatIncentiveValueLabel(incentive),
      expiresAt: expiresAtLabel,
      personalMessage: validated.message,
    })
  }

  revalidatePath('/loyalty')

  return {
    success: true as const,
    incentive,
    delivery: deliveryData as IncentiveDeliveryRecord,
  }
}
