'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { addDays, addWeeks, addMonths, format } from 'date-fns'

// ============================================
// RECURRING SERVICES
// ============================================

const RecurringServiceSchema = z.object({
  client_id: z.string().uuid(),
  service_type: z
    .enum(['weekly_meal_prep', 'weekly_dinners', 'daily_meals', 'biweekly_prep', 'other'])
    .default('weekly_meal_prep'),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']).default('weekly'),
  day_of_week: z.array(z.number().min(0).max(6)).optional(),
  typical_guest_count: z.number().int().min(1).optional(),
  rate_cents: z.number().int().min(0),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'paused', 'ended']).default('active'),
})

export type RecurringServiceInput = z.infer<typeof RecurringServiceSchema>

// Exported from lib/recurring/constants.ts (can't export objects from 'use server' files)
const SERVICE_TYPE_LABELS: Record<string, string> = {
  weekly_meal_prep: 'Weekly Meal Prep',
  weekly_dinners: 'Weekly Dinners',
  daily_meals: 'Daily Meals',
  biweekly_prep: 'Bi-Weekly Prep',
  other: 'Other',
}
void SERVICE_TYPE_LABELS // suppress unused warning

export async function createRecurringService(input: RecurringServiceInput) {
  const chef = await requireChef()
  const supabase = await createServerClient()
  const data = RecurringServiceSchema.parse(input)

  const { error } = await supabase.from('recurring_services').insert({
    ...data,
    chef_id: chef.id,
    day_of_week: data.day_of_week ?? null,
    end_date: data.end_date ?? null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/clients')
}

export async function updateRecurringService(id: string, input: Partial<RecurringServiceInput>) {
  const chef = await requireChef()
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('recurring_services')
    .update(input)
    .eq('id', id)
    .eq('chef_id', chef.id)

  if (error) throw new Error(error.message)
  revalidatePath('/clients')
}

export async function pauseRecurringService(id: string) {
  return updateRecurringService(id, { status: 'paused' })
}

export async function endRecurringService(id: string) {
  const chef = await requireChef()
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('recurring_services')
    .update({ status: 'ended', end_date: new Date().toISOString().slice(0, 10) })
    .eq('id', id)
    .eq('chef_id', chef.id)

  if (error) throw new Error(error.message)
  revalidatePath('/clients')
}

export async function listRecurringServices(clientId?: string) {
  const chef = await requireChef()
  const supabase = await createServerClient()

  let q = supabase
    .from('recurring_services')
    .select('*, clients(full_name, email)')
    .eq('chef_id', chef.id)
    .order('start_date', { ascending: false })

  if (clientId) q = q.eq('client_id', clientId)

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

// ============================================
// SERVED DISH HISTORY
// ============================================

const ServedDishSchema = z.object({
  client_id: z.string().uuid(),
  dish_name: z.string().min(1, 'Dish name is required'),
  recipe_id: z.string().uuid().optional(),
  served_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  event_id: z.string().uuid().optional(),
  client_reaction: z.enum(['loved', 'liked', 'neutral', 'disliked']).optional(),
  notes: z.string().optional(),
})

export type ServedDishInput = z.infer<typeof ServedDishSchema>

// Exported from lib/recurring/constants.ts (can't export objects from 'use server' files)
const REACTION_LABELS: Record<string, string> = {
  loved: 'Loved it',
  liked: 'Liked it',
  neutral: 'Neutral',
  disliked: 'Disliked',
}
void REACTION_LABELS // suppress unused warning

export async function logServedDish(input: ServedDishInput) {
  const chef = await requireChef()
  const supabase = await createServerClient()
  const data = ServedDishSchema.parse(input)

  const { error } = await supabase.from('served_dish_history').insert({
    ...data,
    chef_id: chef.id,
    recipe_id: data.recipe_id ?? null,
    event_id: data.event_id ?? null,
    client_reaction: data.client_reaction ?? null,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/clients/${input.client_id}`)
}

export async function deleteServedDishEntry(id: string) {
  const chef = await requireChef()
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('served_dish_history')
    .delete()
    .eq('id', id)
    .eq('chef_id', chef.id)

  if (error) throw new Error(error.message)
}

export async function getServedHistoryForClient(clientId: string, weeks = 12) {
  const chef = await requireChef()
  const supabase = await createServerClient()

  const since = addWeeks(new Date(), -weeks).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('served_dish_history')
    .select('*')
    .eq('chef_id', chef.id)
    .eq('client_id', clientId)
    .gte('served_date', since)
    .order('served_date', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getSuggestedMenuItems(clientId: string) {
  const chef = await requireChef()
  const supabase = await createServerClient()

  // Get all history for this client
  const { data: history } = await supabase
    .from('served_dish_history')
    .select('dish_name, recipe_id, client_reaction, served_date')
    .eq('chef_id', chef.id)
    .eq('client_id', clientId)
    .order('served_date', { ascending: false })

  const rows = history ?? []

  // Build sets for logic
  const disliked = new Set(
    rows.filter((r: any) => r.client_reaction === 'disliked').map((r: any) => r.dish_name)
  )
  const loved = rows.filter((r: any) => r.client_reaction === 'loved')
  const recentNames = new Set(rows.slice(0, 20).map((r: any) => r.dish_name)) // served in recent 20 records

  // Loved dishes not served recently
  const lovedNotRecent = loved
    .filter(
      (r: any) =>
        !recentNames.has(r.dish_name) ||
        loved.indexOf(r) === loved.findIndex((x: any) => x.dish_name === r.dish_name)
    )
    .slice(0, 5)

  return {
    loved: lovedNotRecent,
    disliked: [...disliked],
    recentlyServed: [...recentNames].slice(0, 10),
  }
}
