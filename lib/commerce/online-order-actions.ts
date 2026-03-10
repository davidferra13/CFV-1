// Commerce Engine V1 - Online Order Actions
// Public-facing actions for online ordering storefront.
// NO auth required for customers placing orders.

'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { OnlineOrderConfirmationEmail } from '@/lib/email/templates/online-order-confirmation'
import { resolveChefByPublicSlug } from '@/lib/chefs/public-slug-resolver'

// ─── Types ────────────────────────────────────────────────────────

export type OnlineMenuItem = {
  id: string
  name: string
  description: string | null
  category: string | null
  price_cents: number
  image_url: string | null
  dietary_tags: string[]
  allergen_flags: string[]
  modifiers: Array<{
    name: string
    options: Array<{ label: string; price_delta_cents: number }>
  }>
}

export type OnlineMenuCategory = {
  category: string
  label: string
  items: OnlineMenuItem[]
}

export type RestaurantInfo = {
  id: string
  businessName: string
  displayName: string | null
  address: string | null
  phone: string | null
  profileImageUrl: string | null
}

export type PlaceOnlineOrderInput = {
  chefSlug: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  items: Array<{
    productId: string
    quantity: number
    modifiers?: Array<{ name: string; option: string; priceDeltaCents: number }>
    notes?: string
  }>
  orderType: 'pickup' | 'dine_in'
  notes?: string
}

export type OnlineOrderResult = {
  orderId: string
  orderNumber: string
  estimatedReadyMinutes: number
  totalCents: number
}

export type OrderStatusResult = {
  orderId: string
  orderNumber: string
  status: string
  customerName: string | null
  estimatedReadyAt: string | null
  receivedAt: string
  preparingAt: string | null
  readyAt: string | null
  pickedUpAt: string | null
  items: Array<{
    name: string
    quantity: number
    unitPriceCents: number
    lineTotalCents: number
    modifiers: any[]
  }>
  subtotalCents: number
  taxCents: number
  totalCents: number
}

// ─── Category Labels ──────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  appetizer: 'Appetizers',
  entree: 'Entrees',
  dessert: 'Desserts',
  beverage: 'Beverages',
  side: 'Sides',
  bread: 'Bread',
  soup: 'Soups',
  salad: 'Salads',
  snack: 'Snacks',
  merchandise: 'Merchandise',
  other: 'Other',
}

const CATEGORY_ORDER = [
  'appetizer',
  'soup',
  'salad',
  'bread',
  'entree',
  'side',
  'dessert',
  'beverage',
  'snack',
  'merchandise',
  'other',
]

// ─── Public Menu ──────────────────────────────────────────────────

export async function getPublicMenu(chefSlug: string): Promise<OnlineMenuCategory[]> {
  const supabase: any = createAdminClient()

  const chef = await resolveChefByPublicSlug(supabase, chefSlug, 'id')
  if (!chef) throw new Error('Restaurant not found')

  const chefId = (chef as any).id

  const { data: products, error } = await (supabase
    .from('product_projections')
    .select(
      'id, name, description, category, price_cents, image_url, dietary_tags, allergen_flags, modifiers, is_active, track_inventory, available_qty'
    )
    .eq('tenant_id', chefId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true }) as any)

  if (error) throw new Error('Failed to load menu')

  // Filter out sold-out items with inventory tracking
  const available = (products ?? []).filter((p: any) => {
    if (p.track_inventory && (p.available_qty ?? 0) <= 0) return false
    return true
  })

  // Also fetch normalized modifier groups for products that have assignments
  const productIds = available.map((p: any) => p.id)
  let modifierAssignments: any[] = []
  let modifierGroups: any[] = []
  let modifierOptions: any[] = []

  if (productIds.length > 0) {
    const { data: assignments } = await (supabase
      .from('product_modifier_assignments')
      .select('product_id, modifier_group_id')
      .in('product_id', productIds)
      .eq('chef_id', chefId) as any)
    modifierAssignments = assignments ?? []

    const groupIds = [...new Set(modifierAssignments.map((a: any) => a.modifier_group_id))]
    if (groupIds.length > 0) {
      const { data: groups } = await (supabase
        .from('product_modifier_groups')
        .select('*')
        .in('id', groupIds)
        .order('sort_order', { ascending: true }) as any)
      modifierGroups = groups ?? []

      const { data: mods } = await (supabase
        .from('product_modifiers')
        .select('*')
        .in('group_id', groupIds)
        .eq('available', true)
        .order('sort_order', { ascending: true }) as any)
      modifierOptions = mods ?? []
    }
  }

  // Build a map of productId -> modifier groups with options
  const productModifierMap = new Map<string, any[]>()
  for (const assignment of modifierAssignments) {
    const group = modifierGroups.find((g: any) => g.id === assignment.modifier_group_id)
    if (!group) continue
    const options = modifierOptions.filter((m: any) => m.group_id === group.id)
    if (!productModifierMap.has(assignment.product_id)) {
      productModifierMap.set(assignment.product_id, [])
    }
    productModifierMap.get(assignment.product_id)!.push({
      ...group,
      modifiers: options,
    })
  }

  // Group by category
  const categoryMap = new Map<string, OnlineMenuItem[]>()
  for (const product of available) {
    const cat = product.category || 'other'
    if (!categoryMap.has(cat)) categoryMap.set(cat, [])

    // Merge inline modifiers (legacy) with normalized modifier groups
    const normalizedGroups = productModifierMap.get(product.id) ?? []
    const inlineModifiers = product.modifiers ?? []

    // Convert normalized groups to the inline format for the public API
    const allModifiers = [
      ...inlineModifiers,
      ...normalizedGroups.map((g: any) => ({
        name: g.name,
        selectionType: g.selection_type,
        required: g.required,
        minSelections: g.min_selections,
        maxSelections: g.max_selections,
        options: (g.modifiers ?? []).map((m: any) => ({
          label: m.name,
          price_delta_cents: m.price_adjustment_cents,
          isDefault: m.is_default,
        })),
      })),
    ]

    categoryMap.get(cat)!.push({
      id: product.id,
      name: product.name,
      description: product.description,
      category: cat,
      price_cents: product.price_cents,
      image_url: product.image_url,
      dietary_tags: product.dietary_tags ?? [],
      allergen_flags: product.allergen_flags ?? [],
      modifiers: allModifiers,
    })
  }

  // Sort categories
  const result: OnlineMenuCategory[] = []
  for (const cat of CATEGORY_ORDER) {
    const items = categoryMap.get(cat)
    if (items && items.length > 0) {
      result.push({
        category: cat,
        label: CATEGORY_LABELS[cat] || cat,
        items,
      })
      categoryMap.delete(cat)
    }
  }
  // Any remaining categories not in the predefined order
  for (const [cat, items] of categoryMap) {
    if (items.length > 0) {
      result.push({
        category: cat,
        label: CATEGORY_LABELS[cat] || cat,
        items,
      })
    }
  }

  return result
}

// ─── Restaurant Info ──────────────────────────────────────────────

export async function getRestaurantInfo(chefSlug: string): Promise<RestaurantInfo | null> {
  const supabase: any = createAdminClient()

  const chef = await resolveChefByPublicSlug(
    supabase,
    chefSlug,
    'id, business_name, display_name, address, phone, profile_image_url'
  )

  if (!chef) return null

  return {
    id: (chef as any).id,
    businessName: (chef as any).business_name || (chef as any).display_name || 'Restaurant',
    displayName: (chef as any).display_name || null,
    address: (chef as any).address || null,
    phone: (chef as any).phone || null,
    profileImageUrl: (chef as any).profile_image_url || null,
  }
}

// ─── Place Order ──────────────────────────────────────────────────

export async function placeOnlineOrder(input: PlaceOnlineOrderInput): Promise<OnlineOrderResult> {
  const supabase: any = createAdminClient()

  // Validate required fields
  if (!input.customerName.trim()) throw new Error('Name is required')
  if (!input.customerPhone.trim()) throw new Error('Phone number is required')
  if (!input.items || input.items.length === 0) throw new Error('Cart is empty')

  // Resolve chef
  const chef = await resolveChefByPublicSlug(
    supabase,
    input.chefSlug,
    'id, business_name, display_name'
  )
  if (!chef) throw new Error('Restaurant not found')
  const chefId = (chef as any).id

  // Fetch products to validate prices
  const productIds = input.items.map((i) => i.productId)
  const { data: products, error: pErr } = await (supabase
    .from('product_projections')
    .select(
      'id, name, price_cents, tax_class, is_active, track_inventory, available_qty, category, description'
    )
    .eq('tenant_id', chefId)
    .in('id', productIds) as any)

  if (pErr || !products) throw new Error('Failed to validate products')

  const productMap = new Map((products as any[]).map((p) => [p.id, p]))

  // Validate all items exist and are active
  for (const item of input.items) {
    const product = productMap.get(item.productId)
    if (!product) throw new Error(`Product not found: ${item.productId}`)
    if (!product.is_active) throw new Error(`${product.name} is no longer available`)
    if (product.track_inventory && (product.available_qty ?? 0) < item.quantity) {
      throw new Error(`${product.name} is sold out`)
    }
  }

  // Create the sale
  const { data: sale, error: saleErr } = await (supabase
    .from('sales')
    .insert({
      tenant_id: chefId,
      channel: 'online',
      status: 'pending_payment',
      notes: [
        `Online order: ${input.orderType === 'pickup' ? 'Pickup' : 'Dine-in'}`,
        `Customer: ${input.customerName.trim()}`,
        `Phone: ${input.customerPhone.trim()}`,
        input.customerEmail ? `Email: ${input.customerEmail.trim()}` : null,
        input.notes ? `Notes: ${input.notes.trim()}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    } as any)
    .select('id, sale_number')
    .single() as any)

  if (saleErr || !sale) throw new Error('Failed to create order')

  // Add sale items
  let subtotalCents = 0
  const saleItems: Array<{
    name: string
    quantity: number
    unitPriceCents: number
    lineTotalCents: number
  }> = []

  for (let i = 0; i < input.items.length; i++) {
    const item = input.items[i]
    const product = productMap.get(item.productId)!

    const modifierTotal = (item.modifiers ?? []).reduce(
      (sum, m) => sum + m.priceDeltaCents * item.quantity,
      0
    )
    const lineTotalCents = product.price_cents * item.quantity + modifierTotal

    const modifiersApplied = (item.modifiers ?? []).map((m) => ({
      name: m.name,
      option: m.option,
      price_delta_cents: m.priceDeltaCents,
    }))

    const { error: itemErr } = await (supabase.from('sale_items').insert({
      sale_id: sale.id,
      tenant_id: chefId,
      product_projection_id: item.productId,
      name: product.name,
      description: product.description ?? null,
      category: product.category ?? null,
      unit_price_cents: product.price_cents,
      quantity: item.quantity,
      discount_cents: 0,
      line_total_cents: lineTotalCents,
      tax_class: product.tax_class ?? 'standard',
      tax_cents: 0,
      modifiers_applied: modifiersApplied,
      sort_order: i,
    } as any) as any)

    if (itemErr) throw new Error('Failed to add items to order')

    subtotalCents += lineTotalCents
    saleItems.push({
      name: product.name,
      quantity: item.quantity,
      unitPriceCents: product.price_cents,
      lineTotalCents,
    })
  }

  // Update sale totals
  await (supabase
    .from('sales')
    .update({
      subtotal_cents: subtotalCents,
      tax_cents: 0,
      discount_cents: 0,
      total_cents: subtotalCents,
    } as any)
    .eq('id', sale.id) as any)

  // Estimate ready time
  const estimatedMinutes = await estimateReadyTime(chefId)
  const estimatedReadyAt = new Date(Date.now() + estimatedMinutes * 60 * 1000).toISOString()

  // Create order queue entry (using admin client, no auth needed)
  const { data: orderEntry, error: orderErr } = await (supabase
    .from('order_queue')
    .insert({
      tenant_id: chefId,
      sale_id: sale.id,
      status: 'received',
      customer_name: input.customerName.trim(),
      estimated_ready_at: estimatedReadyAt,
      notes: [
        input.orderType === 'pickup' ? 'Pickup order' : 'Dine-in order',
        input.notes ? input.notes.trim() : null,
      ]
        .filter(Boolean)
        .join(' | '),
    } as any)
    .select('id, order_number')
    .single() as any)

  if (orderErr || !orderEntry) throw new Error('Failed to queue order')

  // Send confirmation email (non-blocking)
  if (input.customerEmail) {
    const businessName = (chef as any).business_name || (chef as any).display_name || 'Restaurant'
    try {
      await sendEmail({
        to: input.customerEmail.trim(),
        subject: `Order confirmed! #${sale.sale_number}`,
        react: OnlineOrderConfirmationEmail({
          customerName: input.customerName.trim(),
          businessName,
          orderNumber: sale.sale_number,
          items: saleItems.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            totalFormatted: `$${(i.lineTotalCents / 100).toFixed(2)}`,
          })),
          totalFormatted: `$${(subtotalCents / 100).toFixed(2)}`,
          estimatedReadyMinutes: estimatedMinutes,
          orderType: input.orderType,
        }),
      })
    } catch (err) {
      console.error('[non-blocking] Order confirmation email failed', err)
    }
  }

  return {
    orderId: orderEntry.id,
    orderNumber: sale.sale_number,
    estimatedReadyMinutes: estimatedMinutes,
    totalCents: subtotalCents,
  }
}

// ─── Order Status ─────────────────────────────────────────────────

export async function getOrderStatus(orderId: string): Promise<OrderStatusResult | null> {
  const supabase: any = createAdminClient()

  const { data: order, error } = await (supabase
    .from('order_queue')
    .select(
      '*, sales!inner(sale_number, subtotal_cents, tax_cents, total_cents, sale_items(name, quantity, unit_price_cents, line_total_cents, modifiers_applied))'
    )
    .eq('id', orderId)
    .single() as any)

  if (error || !order) return null

  return {
    orderId: order.id,
    orderNumber: (order as any).sales?.sale_number ?? '',
    status: order.status,
    customerName: order.customer_name,
    estimatedReadyAt: order.estimated_ready_at,
    receivedAt: order.received_at ?? order.created_at,
    preparingAt: order.preparing_at ?? null,
    readyAt: order.ready_at ?? null,
    pickedUpAt: order.picked_up_at ?? null,
    items: ((order as any).sales?.sale_items ?? []).map((item: any) => ({
      name: item.name,
      quantity: item.quantity,
      unitPriceCents: item.unit_price_cents,
      lineTotalCents: item.line_total_cents,
      modifiers: item.modifiers_applied ?? [],
    })),
    subtotalCents: (order as any).sales?.subtotal_cents ?? 0,
    taxCents: (order as any).sales?.tax_cents ?? 0,
    totalCents: (order as any).sales?.total_cents ?? 0,
  }
}

// ─── Estimate Ready Time ──────────────────────────────────────────

export async function estimateReadyTime(chefId: string): Promise<number> {
  const supabase: any = createAdminClient()

  // Count active orders
  const { count } = await (supabase
    .from('order_queue')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', chefId)
    .in('status', ['received', 'preparing']) as any)

  const activeOrders = count ?? 0

  // Base: 15 min + 5 min per active order, capped at 60
  return Math.min(15 + activeOrders * 5, 60)
}
