'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  addDays,
  addWeeks,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfWeek,
  subDays,
} from 'date-fns'
import { SERVICE_TYPE_LABELS } from '@/lib/recurring/constants'
import {
  buildMenuSuggestionBundle,
  buildRecommendationDraftText,
  formatServiceDays,
  getUpcomingServiceDates,
} from '@/lib/recurring/planning'

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
const RecurringServiceUpdateSchema = RecurringServiceSchema.partial()

export type RecurringServiceInput = z.infer<typeof RecurringServiceSchema>

function revalidateRecurringPaths(clientId?: string | null) {
  revalidatePath('/clients')
  if (clientId) {
    revalidatePath(`/clients/${clientId}`)
    revalidatePath(`/clients/${clientId}/recurring`)
  }
}

export async function createRecurringService(input: RecurringServiceInput) {
  const chef = await requireChef()
  const supabase: any = createServerClient()
  const data = RecurringServiceSchema.parse(input)

  const { data: inserted, error } = await supabase
    .from('recurring_services')
    .insert({
      ...data,
      chef_id: chef.id,
      day_of_week: data.day_of_week?.length ? data.day_of_week : null,
      end_date: data.end_date ?? null,
    })
    .select('client_id')
    .single()

  if (error) throw new Error(error.message)
  revalidateRecurringPaths(inserted?.client_id)
}

export async function updateRecurringService(id: string, input: Partial<RecurringServiceInput>) {
  const chef = await requireChef()
  const supabase: any = createServerClient()
  const data = RecurringServiceUpdateSchema.parse(input)

  const updatePayload: Record<string, unknown> = { ...data }
  if ('day_of_week' in data) {
    updatePayload.day_of_week = data.day_of_week?.length ? data.day_of_week : null
  }
  if ('end_date' in data) {
    updatePayload.end_date = data.end_date ?? null
  }

  const { data: updated, error } = await supabase
    .from('recurring_services')
    .update(updatePayload)
    .eq('id', id)
    .eq('chef_id', chef.id)
    .select('client_id')
    .single()

  if (error) throw new Error(error.message)
  revalidateRecurringPaths(updated?.client_id)
}

export async function pauseRecurringService(id: string) {
  return updateRecurringService(id, { status: 'paused' })
}

export async function endRecurringService(id: string) {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data: ended, error } = await supabase
    .from('recurring_services')
    .update({ status: 'ended', end_date: new Date().toISOString().slice(0, 10) })
    .eq('id', id)
    .eq('chef_id', chef.id)
    .select('client_id')
    .single()

  if (error) throw new Error(error.message)
  revalidateRecurringPaths(ended?.client_id)
}

export async function listRecurringServices(clientId?: string) {
  const chef = await requireChef()
  const supabase: any = createServerClient()

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

export async function logServedDish(input: ServedDishInput) {
  const chef = await requireChef()
  const supabase: any = createServerClient()
  const data = ServedDishSchema.parse(input)

  const { error } = await supabase.from('served_dish_history').insert({
    ...data,
    chef_id: chef.id,
    recipe_id: data.recipe_id ?? null,
    event_id: data.event_id ?? null,
    client_reaction: data.client_reaction ?? null,
  })

  if (error) throw new Error(error.message)
  revalidateRecurringPaths(input.client_id)
}

export async function deleteServedDishEntry(id: string) {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('served_dish_history')
    .delete()
    .eq('id', id)
    .eq('chef_id', chef.id)

  if (error) throw new Error(error.message)
}

export async function getServedHistoryForClient(clientId: string, weeks = 12) {
  const chef = await requireChef()
  const supabase: any = createServerClient()

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
  const supabase: any = createServerClient()

  const [{ data: history }, { data: client }] = await Promise.all([
    supabase
      .from('served_dish_history')
      .select('dish_name, recipe_id, client_reaction, served_date')
      .eq('chef_id', chef.id)
      .eq('client_id', clientId)
      .order('served_date', { ascending: false }),
    supabase
      .from('clients')
      .select('favorite_dishes')
      .eq('id', clientId)
      .eq('tenant_id', chef.id)
      .single(),
  ])

  const rows = history ?? []
  const favoriteDishes = Array.isArray(client?.favorite_dishes)
    ? client.favorite_dishes.filter((dish: unknown): dish is string => typeof dish === 'string')
    : []
  const bundle = buildMenuSuggestionBundle(rows, favoriteDishes, { recommendationCount: 5 })

  return {
    loved: bundle.likedBacklog.slice(0, 5).map((dish_name) => ({ dish_name })),
    disliked: bundle.avoid,
    recentlyServed: bundle.recentlyServed,
    recommended: bundle.recommended,
  }
}

export interface RecurringServiceForecast {
  serviceId: string
  serviceType: string
  serviceLabel: string
  status: string
  frequency: string
  daysLabel: string
  rateCents: number
  projectedSessionCount: number
  projectedRevenueCents: number
  upcomingDates: string[]
  nextServiceDate: string | null
  recommendationSendDate: string | null
  recommendationDraft: string
  recommendedDishes: string[]
  avoidDishes: string[]
}

export interface RecurringPlanningSnapshot {
  clientName: string
  serviceForecasts: RecurringServiceForecast[]
  totalProjectedRevenueCents: number
  menuSignals: {
    recommended: string[]
    avoid: string[]
    recentlyServed: string[]
    likedBacklog: string[]
  }
}

function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function getWeekDatesForService(upcomingDates: string[]): string[] {
  if (upcomingDates.length === 0) return []
  const nextService = parseISO(upcomingDates[0])
  const weekStart = startOfWeek(nextService, { weekStartsOn: 1 })
  const weekEnd = addDays(weekStart, 6)
  return upcomingDates.filter((date) => {
    const candidate = parseISO(date)
    return !isBefore(candidate, weekStart) && !isAfter(candidate, weekEnd)
  })
}

export async function getRecurringPlanningSnapshot(clientId: string, horizonWeeks = 6) {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const [{ data: services }, { data: history }, { data: client }] = await Promise.all([
    supabase
      .from('recurring_services')
      .select(
        'id, service_type, frequency, day_of_week, rate_cents, start_date, end_date, notes, status'
      )
      .eq('chef_id', chef.id)
      .eq('client_id', clientId)
      .in('status', ['active', 'paused'])
      .order('start_date', { ascending: true }),
    supabase
      .from('served_dish_history')
      .select('dish_name, client_reaction, served_date')
      .eq('chef_id', chef.id)
      .eq('client_id', clientId)
      .order('served_date', { ascending: false }),
    supabase
      .from('clients')
      .select('full_name, favorite_dishes')
      .eq('id', clientId)
      .eq('tenant_id', chef.id)
      .single(),
  ])

  const favoriteDishes = Array.isArray(client?.favorite_dishes)
    ? client.favorite_dishes.filter((dish: unknown): dish is string => typeof dish === 'string')
    : []
  const menuSignals = buildMenuSuggestionBundle(history ?? [], favoriteDishes, {
    recommendationCount: 5,
  })
  const clientName = client?.full_name || 'there'

  const serviceForecasts: RecurringServiceForecast[] = (services ?? []).map((service: any) => {
    const upcomingDates = getUpcomingServiceDates(
      {
        frequency: service.frequency,
        day_of_week: service.day_of_week,
        start_date: service.start_date,
        end_date: service.end_date,
      },
      { horizonWeeks, maxResults: 24 }
    )
    const projectedSessionCount = upcomingDates.length
    const projectedRevenueCents = projectedSessionCount * (service.rate_cents ?? 0)
    const nextServiceDate = upcomingDates[0] ?? null
    const recommendationSendDate = nextServiceDate
      ? toIsoDate(subDays(parseISO(nextServiceDate), 7))
      : null

    const weekDates = getWeekDatesForService(upcomingDates)
    const draftDates = weekDates.length > 0 ? weekDates : upcomingDates.slice(0, 1)

    const recommendationDraft = buildRecommendationDraftText({
      clientName,
      serviceLabel: SERVICE_TYPE_LABELS[service.service_type] ?? 'Recurring Service',
      serviceDates: draftDates,
      recommendedDishes: menuSignals.recommended,
      avoidDishes: menuSignals.avoid.slice(0, 4),
      notes: service.notes ?? null,
    })

    return {
      serviceId: service.id,
      serviceType: service.service_type,
      serviceLabel: SERVICE_TYPE_LABELS[service.service_type] ?? service.service_type,
      status: service.status,
      frequency: service.frequency,
      daysLabel: formatServiceDays(service.day_of_week, service.start_date),
      rateCents: service.rate_cents ?? 0,
      projectedSessionCount,
      projectedRevenueCents,
      upcomingDates,
      nextServiceDate,
      recommendationSendDate,
      recommendationDraft,
      recommendedDishes: menuSignals.recommended,
      avoidDishes: menuSignals.avoid,
    }
  })

  return {
    clientName,
    serviceForecasts,
    totalProjectedRevenueCents: serviceForecasts.reduce(
      (sum, service) => sum + service.projectedRevenueCents,
      0
    ),
    menuSignals,
  } as RecurringPlanningSnapshot
}
