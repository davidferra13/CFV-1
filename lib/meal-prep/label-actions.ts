'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { addDays, format } from 'date-fns'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LabelDish {
  name: string
  servings: number
  reheatingInstructions: string
  allergens: string[]
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
}

export interface GenerateLabelsInput {
  dishes: LabelDish[]
  prepDate: string
  shelfLifeDays: number
  clientName?: string
  chefName: string
  includeNutrition: boolean
}

export interface ContainerLabel {
  dishName: string
  preparedDate: string
  useByDate: string
  reheatingInstructions: string
  allergens: string[]
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  chefName: string
  clientName?: string
  servingNumber: number
  totalServings: number
}

// ─── Generate Labels ────────────────────────────────────────────────────────

export async function generateLabels(
  data: GenerateLabelsInput
): Promise<ContainerLabel[]> {
  await requireChef()

  const prepDate = new Date(data.prepDate)
  const useByDate = addDays(prepDate, data.shelfLifeDays || 5)

  const labels: ContainerLabel[] = []

  for (const dish of data.dishes) {
    const servingCount = Math.max(1, dish.servings)
    for (let i = 1; i <= servingCount; i++) {
      labels.push({
        dishName: dish.name || 'Untitled Dish',
        preparedDate: format(prepDate, 'MMM d, yyyy'),
        useByDate: format(useByDate, 'MMM d, yyyy'),
        reheatingInstructions: dish.reheatingInstructions || '',
        allergens: dish.allergens || [],
        calories: data.includeNutrition ? dish.calories : undefined,
        protein: data.includeNutrition ? dish.protein : undefined,
        carbs: data.includeNutrition ? dish.carbs : undefined,
        fat: data.includeNutrition ? dish.fat : undefined,
        chefName: data.chefName,
        clientName: data.clientName || undefined,
        servingNumber: i,
        totalServings: servingCount,
      })
    }
  }

  return labels
}

// ─── Generate Labels from Event ─────────────────────────────────────────────

export async function generateLabelsFromEvent(eventId: string): Promise<{
  dishes: LabelDish[]
  clientName: string | null
  chefName: string
}> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get event with client info
  const { data: event, error: evErr } = await supabase
    .from('events')
    .select('id, occasion, client_id, tenant_id')
    .eq('id', eventId)
    .eq('tenant_id', user.entityId)
    .single()

  if (evErr || !event) throw new Error('Event not found')

  // Get client name
  let clientName: string | null = null
  if (event.client_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('full_name')
      .eq('id', event.client_id)
      .single()
    clientName = client?.full_name ?? null
  }

  // Get chef name
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name, full_name')
    .eq('id', user.entityId)
    .single()
  const chefName = chef?.business_name || chef?.full_name || 'Chef'

  // Get menus for this event
  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('event_id', eventId)

  if (!menus || menus.length === 0) {
    return { dishes: [], clientName, chefName }
  }

  const menuIds = menus.map((m) => m.id)

  // Get dishes from those menus
  const { data: dishRows } = await supabase
    .from('dishes')
    .select('name, allergen_flags, description')
    .in('menu_id', menuIds)

  const dishes: LabelDish[] = (dishRows || []).map((d) => ({
    name: d.name || 'Untitled Dish',
    servings: 1,
    reheatingInstructions: '',
    allergens: d.allergen_flags || [],
    calories: undefined,
    protein: undefined,
    carbs: undefined,
    fat: undefined,
  }))

  return { dishes, clientName, chefName }
}

// ─── Generate Labels from Meal Prep Week ────────────────────────────────────
// The meal_prep_weeks table does not exist in the current schema.
// This stub is here for future use when that table is added.

export async function generateLabelsFromMealPrepWeek(
  _weekId: string
): Promise<{
  dishes: LabelDish[]
  clientName: string | null
  chefName: string
}> {
  await requireChef()
  // meal_prep_weeks table does not exist yet
  return { dishes: [], clientName: null, chefName: 'Chef' }
}

// ─── Save Label Preset ──────────────────────────────────────────────────────
// Stores reheating instructions per dish name in the chef's local storage
// or a future label_presets table. For now, returns success with the data
// so the client can persist it in localStorage.

export async function saveLabelPreset(data: {
  dishName: string
  reheatingInstructions: string
  shelfLifeDays: number
  allergens: string[]
}): Promise<{ success: true; preset: typeof data }> {
  await requireChef()

  // Validate inputs
  if (!data.dishName.trim()) {
    throw new Error('Dish name is required')
  }

  return { success: true, preset: data }
}
