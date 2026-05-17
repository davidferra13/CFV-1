'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { UnknownAppError } from '@/lib/errors/app-error'
import { revalidatePath } from 'next/cache'
import type {
  MenuVariant,
  MenuVariantWithDishes,
  GuestVariantAssignment,
  VariantServiceNote,
  VariantShoppingEntry,
  CreateMenuVariantInput,
} from './variant-types'

// ---------------------------------------------------------------------------
// Create a menu variant (with optional dish swaps)
// ---------------------------------------------------------------------------
export async function createMenuVariant(
  menuId: string,
  input: CreateMenuVariantInput
): Promise<MenuVariant> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify menu belongs to tenant
  const { data: menu, error: menuErr } = await db
    .from('menus')
    .select('id')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (menuErr || !menu) {
    throw new UnknownAppError('Menu not found or access denied')
  }

  // Insert the variant
  const { data: variant, error: variantErr } = await db
    .from('menu_variants')
    .insert({
      menu_id: menuId,
      tenant_id: user.tenantId!,
      name: input.name,
      reason: input.reason ?? null,
      swap_description: input.swap_description ?? null,
      price_adjustment_cents: input.price_adjustment_cents ?? 0,
    })
    .select('*')
    .single()

  if (variantErr || !variant) {
    throw new UnknownAppError(`Failed to create variant: ${variantErr?.message ?? 'unknown error'}`)
  }

  // Insert dish swaps if provided
  if (input.dishes && input.dishes.length > 0) {
    const dishRows = input.dishes.map((d) => ({
      variant_id: variant.id,
      original_dish_id: d.original_dish_id,
      substitute_dish_id: d.substitute_dish_id ?? null,
      notes: d.notes ?? null,
    }))

    const { error: dishErr } = await db.from('menu_variant_dishes').insert(dishRows)

    if (dishErr) {
      throw new UnknownAppError(`Variant created but dish swaps failed: ${dishErr.message}`)
    }
  }

  revalidatePath(`/menus/${menuId}`)
  return variant as MenuVariant
}

// ---------------------------------------------------------------------------
// Assign a guest to a variant
// ---------------------------------------------------------------------------
export async function assignGuestToVariant(
  variantId: string,
  guestId: string
): Promise<GuestVariantAssignment> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify variant belongs to tenant
  const { data: variant, error: vErr } = await db
    .from('menu_variants')
    .select('id, menu_id')
    .eq('id', variantId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (vErr || !variant) {
    throw new UnknownAppError('Variant not found or access denied')
  }

  // Upsert assignment (idempotent)
  const { data: assignment, error: aErr } = await db
    .from('guest_variant_assignments')
    .upsert(
      {
        guest_id: guestId,
        variant_id: variantId,
        assigned_by: user.entityId,
        assigned_at: new Date().toISOString(),
      },
      { onConflict: 'guest_id,variant_id' }
    )
    .select('*')
    .single()

  if (aErr || !assignment) {
    throw new UnknownAppError(`Failed to assign guest: ${aErr?.message ?? 'unknown error'}`)
  }

  revalidatePath(`/menus/${variant.menu_id}`)
  return assignment as GuestVariantAssignment
}

// ---------------------------------------------------------------------------
// Remove a guest from a variant
// ---------------------------------------------------------------------------
export async function removeGuestFromVariant(variantId: string, guestId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify variant belongs to tenant
  const { data: variant, error: vErr } = await db
    .from('menu_variants')
    .select('id, menu_id')
    .eq('id', variantId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (vErr || !variant) {
    throw new UnknownAppError('Variant not found or access denied')
  }

  const { error } = await db
    .from('guest_variant_assignments')
    .delete()
    .eq('guest_id', guestId)
    .eq('variant_id', variantId)

  if (error) {
    throw new UnknownAppError(`Failed to remove assignment: ${error.message}`)
  }

  revalidatePath(`/menus/${variant.menu_id}`)
}

// ---------------------------------------------------------------------------
// Get all variants for a menu (with dish swaps)
// ---------------------------------------------------------------------------
export async function getMenuVariants(menuId: string): Promise<MenuVariantWithDishes[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: variants, error } = await db
    .from('menu_variants')
    .select('*')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })

  if (error) {
    throw new UnknownAppError(`Failed to load variants: ${error.message}`)
  }

  if (!variants || variants.length === 0) return []

  const variantIds = variants.map((v: MenuVariant) => v.id)

  const { data: dishSwaps, error: dErr } = await db
    .from('menu_variant_dishes')
    .select('*')
    .in('variant_id', variantIds)

  if (dErr) {
    throw new UnknownAppError(`Failed to load dish swaps: ${dErr.message}`)
  }

  const swapsByVariant = new Map<string, typeof dishSwaps>()
  for (const swap of dishSwaps ?? []) {
    const list = swapsByVariant.get(swap.variant_id) ?? []
    list.push(swap)
    swapsByVariant.set(swap.variant_id, list)
  }

  return variants.map((v: MenuVariant) => ({
    ...v,
    dishes: swapsByVariant.get(v.id) ?? [],
  }))
}

// ---------------------------------------------------------------------------
// Get guest variant assignments for an event
// ---------------------------------------------------------------------------
export async function getGuestVariantAssignments(
  eventId: string
): Promise<Array<GuestVariantAssignment & { variant_name: string; guest_name: string }>> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all menus for this event
  const { data: menus, error: mErr } = await db
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (mErr || !menus || menus.length === 0) return []

  const menuIds = menus.map((m: { id: string }) => m.id)

  // Get variants for those menus
  const { data: variants, error: vErr } = await db
    .from('menu_variants')
    .select('id, name')
    .in('menu_id', menuIds)

  if (vErr || !variants || variants.length === 0) return []

  const variantIds = variants.map((v: { id: string }) => v.id)
  const variantNameMap = new Map(variants.map((v: { id: string; name: string }) => [v.id, v.name]))

  // Get assignments
  const { data: assignments, error: aErr } = await db
    .from('guest_variant_assignments')
    .select('*, event_guests!inner(full_name)')
    .in('variant_id', variantIds)

  if (aErr) {
    throw new UnknownAppError(`Failed to load assignments: ${aErr.message}`)
  }

  return (assignments ?? []).map((a: any) => ({
    id: a.id,
    guest_id: a.guest_id,
    variant_id: a.variant_id,
    assigned_by: a.assigned_by,
    assigned_at: a.assigned_at,
    variant_name: variantNameMap.get(a.variant_id) ?? 'Unknown',
    guest_name: a.event_guests?.full_name ?? 'Unknown Guest',
  }))
}

// ---------------------------------------------------------------------------
// Variant shopping list: split quantities by variant track
// ---------------------------------------------------------------------------
export async function getVariantShoppingList(menuId: string): Promise<VariantShoppingEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Load variants + assignments count
  const { data: variants, error: vErr } = await db
    .from('menu_variants')
    .select('id, name')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)

  if (vErr) {
    throw new UnknownAppError(`Failed to load variants: ${vErr.message}`)
  }

  // Get menu guest count for standard track
  const { data: menu } = await db
    .from('menus')
    .select('target_guest_count')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  const totalGuests = menu?.target_guest_count ?? 0

  // Count guests per variant
  const variantGuestCounts = new Map<string, number>()
  let variantGuestsTotal = 0

  if (variants && variants.length > 0) {
    const variantIds = variants.map((v: { id: string }) => v.id)
    const { data: assignments } = await db
      .from('guest_variant_assignments')
      .select('variant_id')
      .in('variant_id', variantIds)

    for (const a of assignments ?? []) {
      const count = (variantGuestCounts.get(a.variant_id) ?? 0) + 1
      variantGuestCounts.set(a.variant_id, count)
      variantGuestsTotal++
    }
  }

  // Load dishes + components for the menu
  const { data: dishes } = await db
    .from('dishes')
    .select('id, name')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)

  const dishIds = (dishes ?? []).map((d: { id: string }) => d.id)

  const { data: allComponents } = await db
    .from('components')
    .select('id, dish_id, name, portion_quantity, portion_unit')
    .in('dish_id', dishIds)

  const componentsByDish = new Map<string, any[]>()
  for (const c of allComponents ?? []) {
    const list = componentsByDish.get(c.dish_id) ?? []
    list.push(c)
    componentsByDish.set(c.dish_id, list)
  }

  const result: VariantShoppingEntry[] = []

  // Standard track
  const standardCount = Math.max(0, totalGuests - variantGuestsTotal)
  result.push({
    variant_id: null,
    variant_name: 'Standard',
    guest_count: standardCount,
    dishes: (dishes ?? []).map((d: any) => ({
      dish_id: d.id,
      dish_name: d.name,
      components: (componentsByDish.get(d.id) ?? []).map((c: any) => ({
        component_id: c.id,
        component_name: c.name,
        portion_quantity: c.portion_quantity,
        portion_unit: c.portion_unit,
        total_portions: standardCount,
      })),
    })),
  })

  // Variant tracks
  if (variants) {
    for (const v of variants) {
      const guestCount = variantGuestCounts.get(v.id) ?? 0

      // Load substitute dishes for this variant
      const { data: swaps } = await db
        .from('menu_variant_dishes')
        .select('original_dish_id, substitute_dish_id')
        .eq('variant_id', v.id)

      const subMap = new Map<string, string | null>(
        (swaps ?? []).map((s: any) => [s.original_dish_id, s.substitute_dish_id])
      )

      // For variant track, use substitute dishes where applicable
      const variantDishIds = (dishes ?? []).map((d: any) => subMap.get(d.id) ?? d.id)

      // Load components for substitute dishes (if different from originals)
      const uniqueSubIds = [...new Set(variantDishIds)]
      const { data: varComponents } = await db
        .from('components')
        .select('id, dish_id, name, portion_quantity, portion_unit')
        .in('dish_id', uniqueSubIds)

      const varCompByDish = new Map<string, any[]>()
      for (const c of varComponents ?? []) {
        const list = varCompByDish.get(c.dish_id) ?? []
        list.push(c)
        varCompByDish.set(c.dish_id, list)
      }

      result.push({
        variant_id: v.id,
        variant_name: v.name,
        guest_count: guestCount,
        dishes: (dishes ?? []).map((d: any) => {
          const actualDishId = subMap.get(d.id) ?? d.id
          return {
            dish_id: actualDishId,
            dish_name: d.name,
            components: (varCompByDish.get(actualDishId) ?? []).map((c: any) => ({
              component_id: c.id,
              component_name: c.name,
              portion_quantity: c.portion_quantity,
              portion_unit: c.portion_unit,
              total_portions: guestCount,
            })),
          }
        }),
      })
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Variant service notes: per-seat FOH reference
// ---------------------------------------------------------------------------
export async function getVariantServiceNotes(menuId: string): Promise<VariantServiceNote[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Load variants for this menu
  const { data: variants, error: vErr } = await db
    .from('menu_variants')
    .select('id, name, swap_description')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)

  if (vErr || !variants || variants.length === 0) return []

  const variantIds = variants.map((v: { id: string }) => v.id)
  const variantMap = new Map<string, { id: string; name: string; swap_description: string | null }>(
    variants.map((v: any) => [v.id, v])
  )

  // Load assignments with guest info
  const { data: assignments, error: aErr } = await db
    .from('guest_variant_assignments')
    .select('guest_id, variant_id, event_guests!inner(full_name)')
    .in('variant_id', variantIds)

  if (aErr || !assignments || assignments.length === 0) return []

  // Load dish swaps for all variants
  const { data: dishSwaps } = await db
    .from('menu_variant_dishes')
    .select('variant_id, notes, original_dish_id, substitute_dish_id')
    .in('variant_id', variantIds)

  // Resolve dish names
  const allDishIds = new Set<string>()
  for (const s of dishSwaps ?? []) {
    if (s.original_dish_id) allDishIds.add(s.original_dish_id)
    if (s.substitute_dish_id) allDishIds.add(s.substitute_dish_id)
  }

  const dishNameMap = new Map<string, string>()
  if (allDishIds.size > 0) {
    const { data: dishRows } = await db
      .from('dishes')
      .select('id, name')
      .in('id', [...allDishIds])

    for (const d of dishRows ?? []) {
      dishNameMap.set(d.id, d.name ?? 'Unnamed dish')
    }
  }

  const swapsByVariant = new Map<string, any[]>()
  for (const s of dishSwaps ?? []) {
    const list = swapsByVariant.get(s.variant_id) ?? []
    list.push(s)
    swapsByVariant.set(s.variant_id, list)
  }

  return assignments.map((a: any) => {
    const v = variantMap.get(a.variant_id)
    const swaps = swapsByVariant.get(a.variant_id) ?? []

    return {
      guest_id: a.guest_id,
      guest_name: a.event_guests?.full_name ?? 'Unknown Guest',
      seat_label: null,
      variant_name: v?.name ?? 'Unknown',
      swap_description: v?.swap_description ?? null,
      dishes: swaps.map((s: any) => ({
        original_dish_name: dishNameMap.get(s.original_dish_id) ?? null,
        substitute_dish_name: dishNameMap.get(s.substitute_dish_id) ?? null,
        notes: s.notes,
      })),
    }
  })
}

// ---------------------------------------------------------------------------
// Delete a menu variant
// ---------------------------------------------------------------------------
export async function deleteMenuVariant(variantId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: variant, error: vErr } = await db
    .from('menu_variants')
    .select('id, menu_id')
    .eq('id', variantId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (vErr || !variant) {
    throw new UnknownAppError('Variant not found or access denied')
  }

  const { error } = await db.from('menu_variants').delete().eq('id', variantId)

  if (error) {
    throw new UnknownAppError(`Failed to delete variant: ${error.message}`)
  }

  revalidatePath(`/menus/${variant.menu_id}`)
}

// ---------------------------------------------------------------------------
// Update a menu variant
// ---------------------------------------------------------------------------
export async function updateMenuVariant(
  variantId: string,
  input: Partial<
    Pick<CreateMenuVariantInput, 'name' | 'reason' | 'swap_description' | 'price_adjustment_cents'>
  >
): Promise<MenuVariant> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: existing, error: eErr } = await db
    .from('menu_variants')
    .select('id, menu_id')
    .eq('id', variantId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eErr || !existing) {
    throw new UnknownAppError('Variant not found or access denied')
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.name !== undefined) updates.name = input.name
  if (input.reason !== undefined) updates.reason = input.reason
  if (input.swap_description !== undefined) updates.swap_description = input.swap_description
  if (input.price_adjustment_cents !== undefined)
    updates.price_adjustment_cents = input.price_adjustment_cents

  const { data: updated, error } = await db
    .from('menu_variants')
    .update(updates)
    .eq('id', variantId)
    .select('*')
    .single()

  if (error || !updated) {
    throw new UnknownAppError(`Failed to update variant: ${error?.message ?? 'unknown error'}`)
  }

  revalidatePath(`/menus/${existing.menu_id}`)
  return updated as MenuVariant
}
