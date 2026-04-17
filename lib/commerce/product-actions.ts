// Commerce Engine V1 - Product Projection Actions
// CRUD for sellable item snapshots. POS reads only these during checkout.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { TaxClass } from './constants'

// ─── Types ────────────────────────────────────────────────────────

export type CreateProductInput = {
  name: string
  description?: string
  category?: string
  sku?: string
  barcode?: string
  imageUrl?: string
  priceCents: number
  costCents?: number
  taxClass?: TaxClass
  trackInventory?: boolean
  availableQty?: number
  lowStockThreshold?: number
  tags?: string[]
  modifiers?: Array<{
    name: string
    options: Array<{ label: string; price_delta_cents: number }>
  }>
  dietaryTags?: string[]
  allergenFlags?: string[]
  recipeId?: string
  menuId?: string
}

export type UpdateProductInput = Partial<CreateProductInput> & { id: string }

export type CreateQuickBarcodeProductInput = {
  barcode: string
  name: string
  priceCents: number
  category?: string
  taxClass?: TaxClass
}

function normalizeBarcode(raw: string) {
  return raw.trim()
}

function isValidBarcode(code: string) {
  return /^\d{8,14}$/.test(code)
}

// ─── Create ───────────────────────────────────────────────────────

export async function createProduct(input: CreateProductInput) {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  if (!Number.isInteger(input.priceCents) || input.priceCents <= 0) {
    throw new Error('Price must be a positive integer (cents)')
  }

  const { data, error } = await (db
    .from('product_projections')
    .insert({
      tenant_id: user.tenantId!,
      name: input.name,
      description: input.description ?? null,
      category: input.category ?? null,
      sku: input.sku ?? null,
      barcode: input.barcode ?? null,
      image_url: input.imageUrl ?? null,
      price_cents: input.priceCents,
      cost_cents: input.costCents ?? null,
      tax_class: input.taxClass ?? 'standard',
      track_inventory: input.trackInventory ?? false,
      available_qty: input.availableQty ?? null,
      low_stock_threshold: input.lowStockThreshold ?? null,
      tags: input.tags ?? [],
      modifiers: input.modifiers ?? [],
      dietary_tags: input.dietaryTags ?? [],
      allergen_flags: input.allergenFlags ?? [],
      recipe_id: input.recipeId ?? null,
      menu_id: input.menuId ?? null,
    } as any)
    .select('id')
    .single() as any)

  if (error) throw new Error(`Failed to create product: ${error.message}`)

  revalidatePath('/commerce/products')
  return { id: data.id }
}

// ─── Quick Create from Unknown Barcode ───────────────────────────

export async function createQuickBarcodeProduct(input: CreateQuickBarcodeProductInput) {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const barcode = normalizeBarcode(input.barcode)
  const name = input.name.trim()

  if (!isValidBarcode(barcode)) {
    throw new Error('Barcode must be 8 to 14 digits')
  }
  if (!name) {
    throw new Error('Product name is required')
  }
  if (!Number.isInteger(input.priceCents) || input.priceCents <= 0) {
    throw new Error('Price must be a positive integer (cents)')
  }

  const { data: existing } = await (db
    .from('product_projections')
    .select(
      'id, name, barcode, price_cents, category, image_url, is_active, modifiers, tax_class, cost_cents, track_inventory, available_qty, low_stock_threshold'
    )
    .eq('tenant_id', user.tenantId!)
    .eq('barcode', barcode)
    .maybeSingle() as any)

  if (existing) {
    return {
      created: false,
      product: existing,
    }
  }

  const { data, error } = await (db
    .from('product_projections')
    .insert({
      tenant_id: user.tenantId!,
      name,
      barcode,
      price_cents: input.priceCents,
      category: input.category ?? null,
      tax_class: input.taxClass ?? 'standard',
      track_inventory: false,
      modifiers: [],
      tags: [],
      dietary_tags: [],
      allergen_flags: [],
      is_active: true,
    } as any)
    .select(
      'id, name, barcode, price_cents, category, image_url, is_active, modifiers, tax_class, cost_cents, track_inventory, available_qty, low_stock_threshold'
    )
    .single() as any)

  if (error || !data) {
    throw new Error(`Failed to create barcode product: ${error?.message ?? 'unknown error'}`)
  }

  revalidatePath('/commerce/products')
  return {
    created: true,
    product: data,
  }
}

// ─── Update ───────────────────────────────────────────────────────

export async function updateProduct(input: UpdateProductInput) {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const updates: Record<string, any> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined) updates.description = input.description
  if (input.category !== undefined) updates.category = input.category
  if (input.sku !== undefined) updates.sku = input.sku
  if (input.barcode !== undefined) updates.barcode = input.barcode
  if (input.imageUrl !== undefined) updates.image_url = input.imageUrl
  if (input.priceCents !== undefined) {
    if (!Number.isInteger(input.priceCents) || input.priceCents < 0) {
      throw new Error('Price must be a non-negative integer (cents)')
    }
    updates.price_cents = input.priceCents
  }
  if (input.costCents !== undefined) updates.cost_cents = input.costCents
  if (input.taxClass !== undefined) updates.tax_class = input.taxClass
  if (input.trackInventory !== undefined) updates.track_inventory = input.trackInventory
  if (input.availableQty !== undefined) updates.available_qty = input.availableQty
  if (input.lowStockThreshold !== undefined) updates.low_stock_threshold = input.lowStockThreshold
  if (input.tags !== undefined) updates.tags = input.tags
  if (input.modifiers !== undefined) updates.modifiers = input.modifiers
  if (input.dietaryTags !== undefined) updates.dietary_tags = input.dietaryTags
  if (input.allergenFlags !== undefined) updates.allergen_flags = input.allergenFlags

  if (Object.keys(updates).length === 0) return

  const { error } = await (db
    .from('product_projections')
    .update(updates as any)
    .eq('id', input.id)
    .eq('tenant_id', user.tenantId!) as any)

  if (error) throw new Error(`Failed to update product: ${error.message}`)

  revalidatePath('/commerce/products')
}

// ─── Toggle Active ────────────────────────────────────────────────

export async function toggleProductActive(productId: string, isActive: boolean) {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  // When deactivating, check for active (non-voided) sale items referencing this product
  if (!isActive) {
    const { data: activeSaleItems } = await (db
      .from('sale_items')
      .select('id')
      .eq('product_projection_id', productId)
      .eq('tenant_id', user.tenantId!)
      .limit(1) as any)

    if (activeSaleItems && activeSaleItems.length > 0) {
      throw new Error('Cannot deactivate a product that has existing sale items')
    }
  }

  const { error } = await (db
    .from('product_projections')
    .update({ is_active: isActive } as any)
    .eq('id', productId)
    .eq('tenant_id', user.tenantId!) as any)

  if (error) throw new Error(`Failed to toggle product: ${error.message}`)

  revalidatePath('/commerce/products')
}

// ─── 86 Toggle (temporary unavailability during service) ─────────

/**
 * Mark a product as 86'd (unavailable) or restore it.
 * Uses track_inventory + available_qty to block checkout without
 * permanently deactivating the product. Stored previous qty
 * in low_stock_threshold as a restore hint (non-destructive reuse).
 *
 * Unlike toggleProductActive, this does NOT check for existing sale items
 * and is designed for rapid mid-service use.
 */
export async function toggleProduct86(productId: string, is86d: boolean) {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  if (is86d) {
    // 86 the item: save current available_qty as restore hint, then zero it out
    const { data: product } = await (db
      .from('product_projections')
      .select('available_qty')
      .eq('id', productId)
      .eq('tenant_id', user.tenantId!)
      .single() as any)

    const prevQty = product?.available_qty ?? 100

    const { error } = await (db
      .from('product_projections')
      .update({
        track_inventory: true,
        available_qty: 0,
        low_stock_threshold: prevQty, // stash previous qty for restore
      } as any)
      .eq('id', productId)
      .eq('tenant_id', user.tenantId!) as any)

    if (error) throw new Error(`Failed to 86 product: ${error.message}`)
  } else {
    // Restore: use low_stock_threshold as the previous qty
    const { data: product } = await (db
      .from('product_projections')
      .select('low_stock_threshold')
      .eq('id', productId)
      .eq('tenant_id', user.tenantId!)
      .single() as any)

    const restoreQty = product?.low_stock_threshold ?? 100

    const { error } = await (db
      .from('product_projections')
      .update({
        available_qty: restoreQty,
      } as any)
      .eq('id', productId)
      .eq('tenant_id', user.tenantId!) as any)

    if (error) throw new Error(`Failed to restore product: ${error.message}`)
  }

  revalidatePath('/commerce/register')
  revalidatePath('/commerce/products')
  revalidatePath('/stations')
}

// ─── List Products ────────────────────────────────────────────────

export async function listProducts(filters?: {
  category?: string
  activeOnly?: boolean
  search?: string
  limit?: number
  offset?: number
}) {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  let query = db
    .from('product_projections')
    .select('*', { count: 'exact' })
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true }) as any

  if (filters?.activeOnly !== false) {
    query = query.eq('is_active', true)
  }
  if (filters?.category) {
    query = query.eq('category', filters.category)
  }
  if (filters?.search) {
    query = query.ilike('name', `%${filters.search.replace(/[%_,.()"'\\]/g, '')}%`)
  }
  if (filters?.limit) {
    const from = filters.offset ?? 0
    query = query.range(from, from + filters.limit - 1)
  }

  const { data, error, count } = await query
  if (error) throw new Error(`Failed to list products: ${error.message}`)

  return { products: data ?? [], total: count ?? 0 }
}

// ─── Get Single Product ───────────────────────────────────────────

export async function getProduct(productId: string) {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const { data, error } = await (db
    .from('product_projections')
    .select('*')
    .eq('id', productId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (error) throw new Error(`Product not found: ${error.message}`)
  return data
}

// ─── Snapshot from Recipe ─────────────────────────────────────────

/**
 * Create a product projection by snapshotting a recipe's current cost.
 * The chef sets the sell price; the cost is pulled from recipe_cost_summary.
 */
export async function snapshotProductFromRecipe(input: {
  recipeId: string
  priceCents: number
  category?: string
  taxClass?: TaxClass
}) {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  // Fetch recipe details
  const { data: recipe, error: recipeErr } = await (db
    .from('recipes')
    .select('id, name, category, allergen_flags, dietary_tags')
    .eq('id', input.recipeId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (recipeErr || !recipe) throw new Error('Recipe not found')

  // Fetch recipe cost from view (if available)
  let costCents: number | null = null
  const { data: costData } = await (db
    .from('recipe_cost_summary' as any)
    .select('total_cost_cents')
    .eq('recipe_id', input.recipeId)
    .single() as any)

  if (costData) {
    costCents = (costData as any).total_cost_cents
  }

  return createProduct({
    name: recipe.name,
    priceCents: input.priceCents,
    costCents: costCents ?? undefined,
    category: input.category ?? recipe.category ?? undefined,
    taxClass: input.taxClass ?? 'standard',
    recipeId: input.recipeId,
    dietaryTags: (recipe as any).dietary_tags ?? [],
    allergenFlags: (recipe as any).allergen_flags ?? [],
  })
}
