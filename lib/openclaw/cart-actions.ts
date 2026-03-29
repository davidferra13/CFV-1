'use server'

import { requireChef } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

// --- Types ---

export type ShoppingCart = {
  id: string
  tenantId: string
  name: string
  storeFilter: string | null
  notes: string | null
  items: ShoppingCartItem[]
  totalCents: number
  createdAt: string
  updatedAt: string
}

export type ShoppingCartItem = {
  id: string
  ingredientName: string
  canonicalIngredientId: string | null
  quantity: number
  unit: string
  priceCents: number | null
  priceSource: string | null
  imageUrl: string | null
  checkedOff: boolean
  sortOrder: number
}

// --- Unit defaults ---

const UNIT_DEFAULTS: Record<string, number> = {
  lb: 1,
  oz: 8,
  fl_oz: 16,
  gallon: 1,
  each: 1,
  dozen: 1,
  bunch: 1,
  head: 1,
  bag: 1,
  pint: 1,
  quart: 1,
}

function defaultQtyForUnit(unit: string): number {
  return UNIT_DEFAULTS[unit] ?? 1
}

// --- Actions ---

export async function createCart(input: {
  name: string
  storeFilter?: string
}): Promise<{ success: boolean; cart?: ShoppingCart; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  try {
    const [row] = await db.execute(sql`
      INSERT INTO shopping_carts (tenant_id, name, store_filter)
      VALUES (${tenantId}, ${input.name}, ${input.storeFilter ?? null})
      RETURNING id, tenant_id, name, store_filter, notes, created_at, updated_at
    `)

    return {
      success: true,
      cart: {
        id: row.id as string,
        tenantId: row.tenant_id as string,
        name: row.name as string,
        storeFilter: row.store_filter as string | null,
        notes: row.notes as string | null,
        items: [],
        totalCents: 0,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      },
    }
  } catch (err) {
    console.error('[cart] createCart error:', err)
    return { success: false, error: 'Failed to create cart' }
  }
}

export async function getCarts(): Promise<ShoppingCart[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  try {
    const rows = await db.execute(sql`
      SELECT c.id, c.tenant_id, c.name, c.store_filter, c.notes, c.created_at, c.updated_at,
             COALESCE(
               (SELECT COUNT(*) FROM shopping_cart_items ci WHERE ci.cart_id = c.id),
               0
             ) as item_count,
             COALESCE(
               (SELECT SUM(
                 CASE WHEN ci.price_cents IS NOT NULL
                   THEN ROUND(ci.quantity * ci.price_cents)::INTEGER
                   ELSE 0 END
               ) FROM shopping_cart_items ci WHERE ci.cart_id = c.id),
               0
             ) as total_cents
      FROM shopping_carts c
      WHERE c.tenant_id = ${tenantId}
      ORDER BY c.updated_at DESC
    `)

    return rows.map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      name: r.name,
      storeFilter: r.store_filter,
      notes: r.notes,
      items: [],
      totalCents: Number(r.total_cents) || 0,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }))
  } catch (err) {
    console.error('[cart] getCarts error:', err)
    return []
  }
}

export async function getCartWithItems(cartId: string): Promise<ShoppingCart | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  try {
    const [cart] = await db.execute(sql`
      SELECT id, tenant_id, name, store_filter, notes, created_at, updated_at
      FROM shopping_carts
      WHERE id = ${cartId} AND tenant_id = ${tenantId}
    `)
    if (!cart) return null

    const itemRows = await db.execute(sql`
      SELECT id, ingredient_name, canonical_ingredient_id, quantity, unit,
             price_cents, price_source, image_url, checked_off, sort_order
      FROM shopping_cart_items
      WHERE cart_id = ${cartId} AND tenant_id = ${tenantId}
      ORDER BY checked_off ASC, sort_order ASC, created_at ASC
    `)

    const items: ShoppingCartItem[] = itemRows.map((r: any) => ({
      id: r.id,
      ingredientName: r.ingredient_name,
      canonicalIngredientId: r.canonical_ingredient_id,
      quantity: Number(r.quantity),
      unit: r.unit,
      priceCents: r.price_cents != null ? Number(r.price_cents) : null,
      priceSource: r.price_source,
      imageUrl: r.image_url,
      checkedOff: r.checked_off === true,
      sortOrder: r.sort_order ?? 0,
    }))

    const totalCents = items.reduce((sum, item) => {
      if (item.priceCents == null) return sum
      return sum + Math.round(item.quantity * item.priceCents)
    }, 0)

    return {
      id: cart.id as string,
      tenantId: cart.tenant_id as string,
      name: cart.name as string,
      storeFilter: cart.store_filter as string | null,
      notes: cart.notes as string | null,
      items,
      totalCents,
      createdAt: String(cart.created_at),
      updatedAt: String(cart.updated_at),
    }
  } catch (err) {
    console.error('[cart] getCartWithItems error:', err)
    return null
  }
}

export async function addToCart(input: {
  cartId: string
  ingredientName: string
  canonicalId?: string
  quantity?: number
  unit?: string
  priceCents?: number
  priceSource?: string
  imageUrl?: string
}): Promise<{ success: boolean; item?: ShoppingCartItem; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  try {
    // Verify cart ownership
    const [cart] = await db.execute(sql`
      SELECT id, store_filter FROM shopping_carts
      WHERE id = ${input.cartId} AND tenant_id = ${tenantId}
    `)
    if (!cart) return { success: false, error: 'Cart not found' }

    const unit = input.unit || 'each'
    const quantity = input.quantity ?? defaultQtyForUnit(unit)

    // Get current max sort_order
    const [maxSort] = await db.execute(sql`
      SELECT COALESCE(MAX(sort_order), -1) as max_sort
      FROM shopping_cart_items WHERE cart_id = ${input.cartId}
    `)

    const [row] = await db.execute(sql`
      INSERT INTO shopping_cart_items (
        cart_id, tenant_id, ingredient_name, canonical_ingredient_id,
        quantity, unit, price_cents, price_source, image_url, sort_order
      ) VALUES (
        ${input.cartId}, ${tenantId}, ${input.ingredientName},
        ${input.canonicalId ?? null}, ${quantity}, ${unit},
        ${input.priceCents ?? null}, ${input.priceSource ?? null},
        ${input.imageUrl ?? null}, ${(Number(maxSort?.max_sort) || 0) + 1}
      )
      RETURNING id, ingredient_name, canonical_ingredient_id, quantity, unit,
                price_cents, price_source, image_url, checked_off, sort_order
    `)

    // Update cart timestamp
    await db.execute(sql`
      UPDATE shopping_carts SET updated_at = now() WHERE id = ${input.cartId}
    `)

    return {
      success: true,
      item: {
        id: row.id as string,
        ingredientName: row.ingredient_name as string,
        canonicalIngredientId: row.canonical_ingredient_id as string | null,
        quantity: Number(row.quantity),
        unit: row.unit as string,
        priceCents: row.price_cents != null ? Number(row.price_cents) : null,
        priceSource: row.price_source as string | null,
        imageUrl: row.image_url as string | null,
        checkedOff: false,
        sortOrder: Number(row.sort_order),
      },
    }
  } catch (err) {
    console.error('[cart] addToCart error:', err)
    return { success: false, error: 'Failed to add item' }
  }
}

export async function updateCartItem(input: {
  itemId: string
  quantity?: number
  checkedOff?: boolean
  sortOrder?: number
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  try {
    if (
      input.quantity === undefined &&
      input.checkedOff === undefined &&
      input.sortOrder === undefined
    ) {
      return { success: true }
    }

    // Build individual updates to avoid dynamic SQL issues with Drizzle
    if (input.quantity !== undefined) {
      await db.execute(sql`
        UPDATE shopping_cart_items SET quantity = ${input.quantity}
        WHERE id = ${input.itemId} AND tenant_id = ${tenantId}
      `)
    }
    if (input.checkedOff !== undefined) {
      await db.execute(sql`
        UPDATE shopping_cart_items SET checked_off = ${input.checkedOff}
        WHERE id = ${input.itemId} AND tenant_id = ${tenantId}
      `)
    }
    if (input.sortOrder !== undefined) {
      await db.execute(sql`
        UPDATE shopping_cart_items SET sort_order = ${input.sortOrder}
        WHERE id = ${input.itemId} AND tenant_id = ${tenantId}
      `)
    }

    return { success: true }
  } catch (err) {
    console.error('[cart] updateCartItem error:', err)
    return { success: false, error: 'Failed to update item' }
  }
}

export async function removeCartItem(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  try {
    await db.execute(sql`
      DELETE FROM shopping_cart_items
      WHERE id = ${itemId} AND tenant_id = ${tenantId}
    `)
    return { success: true }
  } catch (err) {
    console.error('[cart] removeCartItem error:', err)
    return { success: false, error: 'Failed to remove item' }
  }
}

export async function deleteCart(cartId: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  try {
    await db.execute(sql`
      DELETE FROM shopping_carts
      WHERE id = ${cartId} AND tenant_id = ${tenantId}
    `)
    return { success: true }
  } catch (err) {
    console.error('[cart] deleteCart error:', err)
    return { success: false, error: 'Failed to delete cart' }
  }
}

export async function refreshCartPrices(
  cartId: string
): Promise<{ success: boolean; updated: number; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  try {
    // Get cart with its store filter
    const [cart] = await db.execute(sql`
      SELECT store_filter FROM shopping_carts
      WHERE id = ${cartId} AND tenant_id = ${tenantId}
    `)
    if (!cart) return { success: false, updated: 0, error: 'Cart not found' }

    // Get all items with canonical IDs
    const items = await db.execute(sql`
      SELECT id, canonical_ingredient_id FROM shopping_cart_items
      WHERE cart_id = ${cartId} AND canonical_ingredient_id IS NOT NULL
    `)

    if (items.length === 0) return { success: true, updated: 0 }

    // Fetch latest prices from Pi for each item
    const OPENCLAW_API = process.env.OPENCLAW_API_URL || 'http://10.0.0.177:8081'
    let updated = 0

    for (const item of items) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)
        const res = await fetch(
          `${OPENCLAW_API}/api/ingredients/detail/${item.canonical_ingredient_id}`,
          { signal: controller.signal, cache: 'no-store' }
        )
        clearTimeout(timeout)

        if (!res.ok) continue
        const data = await res.json()

        // Find price for the cart's store, or cheapest
        let price = null
        const storeFilter = cart.store_filter as string | null
        if (storeFilter && data.prices) {
          price = data.prices.find((p: any) =>
            p.store?.toLowerCase().includes(storeFilter.toLowerCase())
          )
        }
        if (!price && data.prices?.length > 0) {
          price = data.prices[0]
        }

        if (price) {
          await db.execute(sql`
            UPDATE shopping_cart_items
            SET price_cents = ${price.priceCents}, price_source = ${price.store}
            WHERE id = ${item.id} AND tenant_id = ${tenantId}
          `)
          updated++
        }
      } catch {
        // Skip individual item failures
      }
    }

    return { success: true, updated }
  } catch (err) {
    console.error('[cart] refreshCartPrices error:', err)
    return { success: false, updated: 0, error: 'Failed to refresh prices' }
  }
}

export async function changeCartStore(input: {
  cartId: string
  sourceId: string
}): Promise<{ success: boolean; repriced: number; unavailable: number; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  try {
    // Update store filter
    await db.execute(sql`
      UPDATE shopping_carts
      SET store_filter = ${input.sourceId}, updated_at = now()
      WHERE id = ${input.cartId} AND tenant_id = ${tenantId}
    `)

    // Reprice all items
    const result = await refreshCartPrices(input.cartId)

    // Count unavailable items (those that didn't get repriced)
    const [total] = await db.execute(sql`
      SELECT COUNT(*) as count FROM shopping_cart_items WHERE cart_id = ${input.cartId}
    `)
    const totalCount = Number(total?.count) || 0
    const unavailable = totalCount - (result.updated || 0)

    return {
      success: true,
      repriced: result.updated || 0,
      unavailable,
    }
  } catch (err) {
    console.error('[cart] changeCartStore error:', err)
    return { success: false, repriced: 0, unavailable: 0, error: 'Failed to change store' }
  }
}
