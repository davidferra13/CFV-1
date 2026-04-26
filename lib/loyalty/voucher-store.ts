// Tenant-explicit voucher/gift card helpers for API v2 routes.
// Accepts tenantId directly instead of calling requireChef()/requireAuth().

import crypto from 'crypto'
import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import { formatCurrency } from '@/lib/utils/currency'
import type { IncentiveRecord, IncentiveDeliveryRecord } from './voucher-actions'

const CreateSchema = z
  .object({
    type: z.enum(['voucher', 'gift_card']),
    title: z.string().min(1).max(120),
    note: z.string().max(1000).optional(),
    code: z
      .string()
      .min(4)
      .max(32)
      .regex(/^[A-Za-z0-9-]+$/)
      .optional(),
    amount_cents: z.number().int().positive().max(1_000_000).optional(),
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
          message: 'Gift cards require amount_cents',
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

const SendSchema = z.object({
  incentive_id: z.string().uuid(),
  recipient_email: z.string().email(),
  recipient_name: z.string().max(120).optional(),
  message: z.string().max(1000).optional(),
  delivery_channel: z.enum(['email', 'manual']).default('email'),
})

function normalizeCode(raw: string): string {
  const normalized = raw
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
  if (normalized.length < 4 || normalized.length > 32)
    throw new Error('Code must be 4-32 characters after normalization')
  return normalized
}

function generateCode(type: string): string {
  const prefix = type === 'gift_card' ? 'GFT' : 'VCH'
  return `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
}

function parseExpiryToIso(expiresAt?: string): string | null {
  if (!expiresAt) return null
  const parsed = new Date(expiresAt)
  if (Number.isNaN(parsed.getTime())) throw new Error('Invalid expires_at date')
  return parsed.toISOString()
}

function formatIncentiveValueLabel(incentive: IncentiveRecord): string {
  if (incentive.discount_percent != null) return `${incentive.discount_percent}% off`
  if (incentive.amount_cents != null) {
    const amount = formatCurrency(incentive.amount_cents, {
      currency: incentive.currency_code || 'USD',
    })
    return incentive.type === 'gift_card' ? `${amount} gift card value` : `${amount} off`
  }
  return 'Value available at redemption'
}

export async function getVoucherAndGiftCardsForTenant(
  tenantId: string
): Promise<IncentiveRecord[]> {
  const db: any = createServerClient({ admin: true })
  const { data, error } = await db
    .from('client_incentives')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) throw new Error('Failed to fetch vouchers and gift cards')
  return (data || []) as IncentiveRecord[]
}

export async function createVoucherOrGiftCardForTenant(
  tenantId: string,
  input: z.infer<typeof CreateSchema>,
  actorId?: string
) {
  const validated = CreateSchema.parse(input)
  const db: any = createServerClient({ admin: true })

  if (validated.target_client_id) {
    const { data: c } = await db
      .from('clients')
      .select('id')
      .eq('id', validated.target_client_id)
      .eq('tenant_id', tenantId)
      .single()
    if (!c) throw new Error('Target client not found in this tenant')
  }

  const expiresAtIso = parseExpiryToIso(validated.expires_at)
  let code = validated.code ? normalizeCode(validated.code) : generateCode(validated.type)
  let created: IncentiveRecord | null = null

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await db
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
        target_client_id: validated.target_client_id ?? null,
        created_by_user_id: actorId ?? tenantId,
        created_by_role: 'chef',
        created_by_client_id: null,
      })
      .select('*')
      .single()

    if (!error && data) {
      created = data as IncentiveRecord
      break
    }

    if (error?.code === '23505' || error?.message?.includes('uq_client_incentives_tenant_code')) {
      if (validated.code) throw new Error('This code is already in use for your tenant')
      code = generateCode(validated.type)
      continue
    }

    throw new Error('Failed to create voucher or gift card')
  }

  if (!created) throw new Error('Could not generate a unique code. Please try again.')
  return { success: true as const, incentive: created }
}

export async function deactivateIncentiveForTenant(tenantId: string, incentiveId: string) {
  const db: any = createServerClient({ admin: true })
  const { error } = await db
    .from('client_incentives')
    .update({ is_active: false })
    .eq('id', incentiveId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error('Failed to deactivate incentive')
  return { success: true as const }
}

export async function sendVoucherOrGiftCardForTenant(
  tenantId: string,
  input: z.infer<typeof SendSchema>,
  actorId?: string
) {
  const validated = SendSchema.parse(input)
  const db: any = createServerClient({ admin: true })

  const { data: incentiveData, error: incentiveError } = await db
    .from('client_incentives')
    .select('*')
    .eq('id', validated.incentive_id)
    .eq('tenant_id', tenantId)
    .single()

  if (incentiveError || !incentiveData) throw new Error('Voucher or gift card not found')
  const incentive = incentiveData as IncentiveRecord
  if (!incentive.is_active) throw new Error('This voucher or gift card is inactive')
  if (incentive.expires_at && new Date(incentive.expires_at).getTime() < Date.now())
    throw new Error('This voucher or gift card has expired')

  const { data: deliveryData, error: deliveryError } = await db
    .from('incentive_deliveries')
    .insert({
      incentive_id: incentive.id,
      tenant_id: tenantId,
      sent_by_user_id: actorId ?? tenantId,
      recipient_name: validated.recipient_name?.trim() || null,
      recipient_email: validated.recipient_email.toLowerCase(),
      message: validated.message?.trim() || null,
      delivery_channel: validated.delivery_channel,
    })
    .select('*')
    .single()

  if (deliveryError || !deliveryData) throw new Error('Failed to record delivery')

  const { data: chefData } = await db
    .from('chefs')
    .select('business_name, display_name')
    .eq('id', tenantId)
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

  return { success: true as const, incentive, delivery: deliveryData as IncentiveDeliveryRecord }
}
