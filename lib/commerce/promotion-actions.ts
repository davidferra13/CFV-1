'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { TAX_CLASSES, type TaxClass } from './constants'
import { PROMOTION_DISCOUNT_TYPES, type PromotionDiscountType } from './promotion-engine'

export type CommercePromotion = {
  id: string
  code: string
  name: string
  description: string | null
  discountType: PromotionDiscountType
  discountPercent: number | null
  discountCents: number | null
  minSubtotalCents: number
  maxDiscountCents: number | null
  targetTaxClasses: TaxClass[]
  autoApply: boolean
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
  createdAt: string
  updatedAt: string
}

export type CreatePromotionInput = {
  code: string
  name: string
  description?: string
  discountType: PromotionDiscountType
  discountPercent?: number | null
  discountCents?: number | null
  minSubtotalCents?: number
  maxDiscountCents?: number | null
  targetTaxClasses?: TaxClass[]
  autoApply?: boolean
  startsAt?: string | null
  endsAt?: string | null
}

export type UpdatePromotionInput = Partial<CreatePromotionInput> & { id: string }

const PROMOTION_CODE_PATTERN = /^[A-Z0-9_-]{3,32}$/
const TAX_CLASS_SET = new Set<TaxClass>(TAX_CLASSES as unknown as TaxClass[])

function asPositiveInt(value: unknown, field: string) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${field} must be a positive integer (cents)`)
  }
  return parsed
}

function asNonNegativeInt(value: unknown, field: string, fallback = 0) {
  if (value == null) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${field} must be a non-negative integer (cents)`)
  }
  return parsed
}

function normalizeCode(raw: string) {
  const code = String(raw ?? '')
    .trim()
    .toUpperCase()
  if (!PROMOTION_CODE_PATTERN.test(code)) {
    throw new Error('Promotion code must be 3-32 chars using A-Z, 0-9, "_" or "-"')
  }
  return code
}

function normalizeTaxClassTargets(value: TaxClass[] | undefined, discountType: PromotionDiscountType) {
  if (discountType === 'fixed_order' || discountType === 'percent_order') return [] as TaxClass[]
  const targets = Array.isArray(value) ? value : []
  const unique = Array.from(new Set(targets))
  for (const taxClass of unique) {
    if (!TAX_CLASS_SET.has(taxClass)) {
      throw new Error(`Invalid target tax class: ${taxClass}`)
    }
  }
  return unique
}

function normalizeDateTime(value: string | null | undefined, field: string) {
  if (!value) return null
  const iso = new Date(value).toISOString()
  if (!iso) throw new Error(`${field} must be a valid datetime`)
  return iso
}

function normalizePromotionInput(input: CreatePromotionInput) {
  if (!PROMOTION_DISCOUNT_TYPES.includes(input.discountType)) {
    throw new Error('Invalid promotion discount type')
  }
  const name = String(input.name ?? '').trim()
  if (!name) throw new Error('Promotion name is required')

  const code = normalizeCode(input.code)
  const minSubtotalCents = asNonNegativeInt(input.minSubtotalCents, 'Minimum subtotal', 0)
  const maxDiscountCents =
    input.maxDiscountCents == null
      ? null
      : asPositiveInt(input.maxDiscountCents, 'Maximum discount')

  const startsAt = normalizeDateTime(input.startsAt ?? null, 'Start date')
  const endsAt = normalizeDateTime(input.endsAt ?? null, 'End date')
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
    throw new Error('End date must be after start date')
  }

  let discountPercent: number | null = null
  let discountCents: number | null = null
  if (input.discountType === 'percent_order' || input.discountType === 'percent_item') {
    const parsed = Number(input.discountPercent)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      throw new Error('Percent discount must be an integer between 1 and 100')
    }
    discountPercent = parsed
  } else {
    discountCents = asPositiveInt(input.discountCents, 'Fixed discount')
  }

  return {
    code,
    name,
    description: String(input.description ?? '').trim() || null,
    discountType: input.discountType,
    discountPercent,
    discountCents,
    minSubtotalCents,
    maxDiscountCents,
    targetTaxClasses: normalizeTaxClassTargets(input.targetTaxClasses, input.discountType),
    autoApply: input.autoApply === true,
    startsAt,
    endsAt,
  }
}

function mapPromotionRow(row: any): CommercePromotion {
  return {
    id: row.id,
    code: String(row.code),
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    discountType: row.discount_type as PromotionDiscountType,
    discountPercent: row.discount_percent ?? null,
    discountCents: row.discount_cents ?? null,
    minSubtotalCents: Number(row.min_subtotal_cents ?? 0),
    maxDiscountCents: row.max_discount_cents ?? null,
    targetTaxClasses: Array.isArray(row.target_tax_classes)
      ? (row.target_tax_classes as TaxClass[])
      : [],
    autoApply: row.auto_apply === true,
    isActive: row.is_active === true,
    startsAt: row.starts_at ?? null,
    endsAt: row.ends_at ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export async function createPromotion(input: CreatePromotionInput) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const normalized = normalizePromotionInput(input)
  const { data, error } = await (supabase
    .from('commerce_promotions' as any)
    .insert({
      tenant_id: user.tenantId!,
      code: normalized.code,
      name: normalized.name,
      description: normalized.description,
      discount_type: normalized.discountType,
      discount_percent: normalized.discountPercent,
      discount_cents: normalized.discountCents,
      min_subtotal_cents: normalized.minSubtotalCents,
      max_discount_cents: normalized.maxDiscountCents,
      target_tax_classes: normalized.targetTaxClasses,
      auto_apply: normalized.autoApply,
      starts_at: normalized.startsAt,
      ends_at: normalized.endsAt,
      is_active: true,
      created_by: user.id,
    } as any)
    .select('*')
    .single() as any)

  if (error) {
    if (String(error.code ?? '') === '23505') {
      throw new Error('Promotion code already exists')
    }
    throw new Error(`Failed to create promotion: ${error.message}`)
  }

  revalidatePath('/commerce')
  revalidatePath('/commerce/promotions')
  return mapPromotionRow(data)
}

export async function updatePromotion(input: UpdatePromotionInput) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { data: current, error: currentErr } = await (supabase
    .from('commerce_promotions' as any)
    .select('*')
    .eq('id', input.id)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (currentErr || !current) throw new Error('Promotion not found')

  const normalized = normalizePromotionInput({
    code: input.code ?? current.code,
    name: input.name ?? current.name,
    description: input.description ?? current.description ?? undefined,
    discountType: (input.discountType ?? current.discount_type) as PromotionDiscountType,
    discountPercent: input.discountPercent ?? current.discount_percent,
    discountCents: input.discountCents ?? current.discount_cents,
    minSubtotalCents: input.minSubtotalCents ?? current.min_subtotal_cents,
    maxDiscountCents: input.maxDiscountCents ?? current.max_discount_cents,
    targetTaxClasses: (input.targetTaxClasses ??
      current.target_tax_classes ??
      []) as TaxClass[],
    autoApply: input.autoApply ?? current.auto_apply,
    startsAt: input.startsAt ?? current.starts_at,
    endsAt: input.endsAt ?? current.ends_at,
  })

  const { data, error } = await (supabase
    .from('commerce_promotions' as any)
    .update({
      code: normalized.code,
      name: normalized.name,
      description: normalized.description,
      discount_type: normalized.discountType,
      discount_percent: normalized.discountPercent,
      discount_cents: normalized.discountCents,
      min_subtotal_cents: normalized.minSubtotalCents,
      max_discount_cents: normalized.maxDiscountCents,
      target_tax_classes: normalized.targetTaxClasses,
      auto_apply: normalized.autoApply,
      starts_at: normalized.startsAt,
      ends_at: normalized.endsAt,
    } as any)
    .eq('id', input.id)
    .eq('tenant_id', user.tenantId!)
    .select('*')
    .single() as any)

  if (error) {
    if (String(error.code ?? '') === '23505') {
      throw new Error('Promotion code already exists')
    }
    throw new Error(`Failed to update promotion: ${error.message}`)
  }

  revalidatePath('/commerce')
  revalidatePath('/commerce/promotions')
  return mapPromotionRow(data)
}

export async function togglePromotionActive(promotionId: string, isActive: boolean) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { error } = await (supabase
    .from('commerce_promotions' as any)
    .update({ is_active: isActive } as any)
    .eq('id', promotionId)
    .eq('tenant_id', user.tenantId!) as any)

  if (error) throw new Error(`Failed to update promotion status: ${error.message}`)
  revalidatePath('/commerce')
  revalidatePath('/commerce/promotions')
}

export async function listPromotions(options?: { activeOnly?: boolean; limit?: number }) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  let query = supabase
    .from('commerce_promotions' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false }) as any

  if (options?.activeOnly) query = query.eq('is_active', true)
  if (options?.limit && Number.isInteger(options.limit) && options.limit > 0) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to list promotions: ${error.message}`)
  return (data ?? []).map(mapPromotionRow)
}

