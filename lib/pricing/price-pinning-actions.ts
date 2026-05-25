'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const pinSchema = z.object({
  ingredientId: z.string().uuid(),
  priceCents: z.number().int().min(1),
  unit: z.string().min(1),
  source: z.string().min(1),
  vendor: z.string().optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
})

export async function pinIngredientPrice(input: {
  ingredientId: string
  priceCents: number
  unit: string
  source: string
  vendor?: string
  expiresInDays?: number
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const parsed = pinSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' }
  }

  const { ingredientId, priceCents, unit, source, vendor, expiresInDays = 30 } = parsed.data
  const db: any = createServerClient()

  const { data: ingredient } = await db
    .from('ingredients')
    .select('id')
    .eq('id', ingredientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!ingredient) {
    return { success: false, error: 'Ingredient not found' }
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  const { error } = await db
    .from('ingredients')
    .update({
      pinned_price_cents: priceCents,
      pinned_price_unit: unit,
      pinned_price_source: source,
      pinned_price_vendor: vendor || null,
      pinned_price_expires_at: expiresAt.toISOString(),
      pinned_price_set_at: new Date().toISOString(),
      pinned_price_set_by: user.authUserId,
    })
    .eq('id', ingredientId)
    .eq('tenant_id', tenantId)

  if (error) {
    return { success: false, error: 'Failed to pin price' }
  }

  revalidatePath('/culinary/costing')
  return { success: true }
}

export async function unpinIngredientPrice(
  ingredientId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: ingredient } = await db
    .from('ingredients')
    .select('id')
    .eq('id', ingredientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!ingredient) {
    return { success: false, error: 'Ingredient not found' }
  }

  const { error } = await db
    .from('ingredients')
    .update({
      pinned_price_cents: null,
      pinned_price_unit: null,
      pinned_price_source: null,
      pinned_price_vendor: null,
      pinned_price_expires_at: null,
      pinned_price_set_at: null,
      pinned_price_set_by: null,
    })
    .eq('id', ingredientId)
    .eq('tenant_id', tenantId)

  if (error) {
    return { success: false, error: 'Failed to unpin price' }
  }

  revalidatePath('/culinary/costing')
  return { success: true }
}

export interface PinnedPriceInfo {
  ingredientId: string
  ingredientName: string
  priceCents: number
  unit: string
  source: string
  vendor: string | null
  expiresAt: string
  setAt: string
  daysUntilExpiry: number
}

export async function getExpiringPins(): Promise<PinnedPriceInfo[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

  const { data } = await db
    .from('ingredients')
    .select(
      'id, name, pinned_price_cents, pinned_price_unit, pinned_price_source, pinned_price_vendor, pinned_price_expires_at, pinned_price_set_at'
    )
    .eq('tenant_id', tenantId)
    .not('pinned_price_cents', 'is', null)
    .not('pinned_price_expires_at', 'is', null)
    .lte('pinned_price_expires_at', sevenDaysFromNow.toISOString())
    .gte('pinned_price_expires_at', new Date().toISOString())
    .order('pinned_price_expires_at', { ascending: true })

  if (!data) return []

  return data.map((row: any) => {
    const expiresAt = new Date(row.pinned_price_expires_at)
    const daysUntilExpiry = Math.max(
      0,
      Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    )
    return {
      ingredientId: row.id,
      ingredientName: row.name,
      priceCents: row.pinned_price_cents,
      unit: row.pinned_price_unit,
      source: row.pinned_price_source,
      vendor: row.pinned_price_vendor,
      expiresAt: row.pinned_price_expires_at,
      setAt: row.pinned_price_set_at,
      daysUntilExpiry,
    }
  })
}

export async function getPinnedPrice(ingredientId: string): Promise<PinnedPriceInfo | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data } = await db
    .from('ingredients')
    .select(
      'id, name, pinned_price_cents, pinned_price_unit, pinned_price_source, pinned_price_vendor, pinned_price_expires_at, pinned_price_set_at'
    )
    .eq('id', ingredientId)
    .eq('tenant_id', tenantId)
    .not('pinned_price_cents', 'is', null)
    .single()

  if (!data) return null

  const expiresAt = data.pinned_price_expires_at ? new Date(data.pinned_price_expires_at) : null
  const isExpired = expiresAt && expiresAt < new Date()
  if (isExpired) return null

  const daysUntilExpiry = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 999

  return {
    ingredientId: data.id,
    ingredientName: data.name,
    priceCents: data.pinned_price_cents,
    unit: data.pinned_price_unit,
    source: data.pinned_price_source,
    vendor: data.pinned_price_vendor,
    expiresAt: data.pinned_price_expires_at || '',
    setAt: data.pinned_price_set_at || '',
    daysUntilExpiry,
  }
}
