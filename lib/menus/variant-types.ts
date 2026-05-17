/** Menu Variant Accommodations - Type definitions */

export type MenuVariant = {
  id: string
  menu_id: string
  tenant_id: string
  name: string
  reason: string | null
  swap_description: string | null
  price_adjustment_cents: number
  created_at: string
  updated_at: string
}

export type MenuVariantDish = {
  id: string
  variant_id: string
  original_dish_id: string
  substitute_dish_id: string | null
  notes: string | null
  created_at: string
}

export type GuestVariantAssignment = {
  id: string
  guest_id: string
  variant_id: string
  assigned_by: string | null
  assigned_at: string
}

/** Variant with its dish swaps joined */
export type MenuVariantWithDishes = MenuVariant & {
  dishes: MenuVariantDish[]
}

/** Guest assignment with variant name for display */
export type GuestVariantDisplay = GuestVariantAssignment & {
  variant_name: string
  guest_name: string
}

/** Per-seat service note for front-of-house */
export type VariantServiceNote = {
  guest_id: string
  guest_name: string
  seat_label: string | null
  variant_name: string
  swap_description: string | null
  dishes: Array<{
    original_dish_name: string | null
    substitute_dish_name: string | null
    notes: string | null
  }>
}

/** Shopping list entry split by variant track */
export type VariantShoppingEntry = {
  variant_id: string | null
  variant_name: string
  guest_count: number
  dishes: Array<{
    dish_id: string
    dish_name: string | null
    components: Array<{
      component_id: string
      component_name: string
      portion_quantity: string | null
      portion_unit: string | null
      total_portions: number
    }>
  }>
}

export type CreateMenuVariantInput = {
  name: string
  reason?: string
  swap_description?: string
  price_adjustment_cents?: number
  dishes?: Array<{
    original_dish_id: string
    substitute_dish_id?: string
    notes?: string
  }>
}
