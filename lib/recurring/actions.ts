'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/lib/notifications/actions'
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
  revalidatePath('/clients/recurring')
  if (clientId) {
    revalidatePath(`/clients/${clientId}`)
    revalidatePath(`/clients/${clientId}/recurring`)
  }
}

export async function createRecurringService(input: RecurringServiceInput) {
  const chef = await requireChef()
  const db: any = createServerClient()
  const data = RecurringServiceSchema.parse(input)

  const { data: inserted, error } = await db
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
  const db: any = createServerClient()
  const data = RecurringServiceUpdateSchema.parse(input)

  const updatePayload: Record<string, unknown> = { ...data }
  if ('day_of_week' in data) {
    updatePayload.day_of_week = data.day_of_week?.length ? data.day_of_week : null
  }
  if ('end_date' in data) {
    updatePayload.end_date = data.end_date ?? null
  }

  const { data: updated, error } = await db
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
  const db: any = createServerClient()

  const { data: ended, error } = await db
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
  const db: any = createServerClient()

  let q = db
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

const ChefMealRequestStatusSchema = z.enum(['reviewed', 'scheduled', 'declined'])
const FulfillMealRequestSchema = z.object({
  request_id: z.string().uuid(),
  served_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  client_reaction: z.enum(['loved', 'liked', 'neutral', 'disliked']).optional(),
  notes: z.string().max(2000).optional(),
})
const SendRecurringRecommendationSchema = z.object({
  client_id: z.string().uuid(),
  draft: z.string().min(20).max(8000),
  target_week_start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})
const BulkUpdateWeekMealRequestsSchema = z.object({
  client_id: z.string().uuid(),
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['reviewed', 'scheduled']),
})
const SendWeekRecommendationFromBoardSchema = z.object({
  client_id: z.string().uuid(),
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(2000).optional(),
})

export type ClientMealRequestStatus = z.infer<typeof ChefMealRequestStatusSchema>
export type FulfillMealRequestInput = z.infer<typeof FulfillMealRequestSchema>
export type SendRecurringRecommendationInput = z.infer<typeof SendRecurringRecommendationSchema>
export type BulkUpdateWeekMealRequestsInput = z.infer<typeof BulkUpdateWeekMealRequestsSchema>
export type SendWeekRecommendationFromBoardInput = z.infer<
  typeof SendWeekRecommendationFromBoardSchema
>
export type ClientMealRequest = {
  id: string
  client_id: string
  request_type: 'repeat_dish' | 'new_idea' | 'avoid_dish'
  dish_name: string
  notes: string | null
  requested_for_week_start: string | null
  priority: 'low' | 'normal' | 'high'
  status: 'requested' | 'reviewed' | 'scheduled' | 'fulfilled' | 'declined' | 'withdrawn'
  reviewed_at: string | null
  created_at: string
}
export type RecurringMenuRecommendation = {
  id: string
  client_id: string
  week_start: string | null
  recommendation_text: string
  status: 'sent' | 'approved' | 'revision_requested'
  client_response_notes: string | null
  sent_at: string
  responded_at: string | null
  created_at: string
}
export type RecurringCollaborationItem = {
  id: string
  type: 'meal_request' | 'recommendation_response'
  client_id: string
  client_name: string
  title: string
  status: string
  priority: 'low' | 'normal' | 'high' | null
  week_start: string | null
  created_at: string
}
export type RecurringCollaborationCommandCenter = {
  openMealRequestCount: number
  pendingRecommendationResponseCount: number
  totalOpenItems: number
  items: RecurringCollaborationItem[]
}
export type RecurringPlanningBoardRecommendationStatus =
  | 'not_sent'
  | 'sent'
  | 'approved'
  | 'revision_requested'
export type RecurringPlanningBoardClientRow = {
  client_id: string
  client_name: string
  week_start: string
  session_count: number
  projected_revenue_cents: number
  next_session_date: string | null
  service_labels: string[]
  open_request_count: number
  high_priority_request_count: number
  pending_recommendation_response_count: number
  repeat_signals: string[]
  avoid_signals: string[]
  recommendation_status: RecurringPlanningBoardRecommendationStatus
}
export type RecurringPlanningBoardWeek = {
  week_start: string
  week_end: string
  client_count: number
  session_count: number
  projected_revenue_cents: number
  open_request_count: number
  high_priority_request_count: number
  pending_recommendation_response_count: number
  clients: RecurringPlanningBoardClientRow[]
}
export type RecurringPlanningBoardBacklogItem = {
  client_id: string
  client_name: string
  open_request_count: number
  high_priority_request_count: number
  repeat_signals: string[]
  avoid_signals: string[]
}
export type RecurringPlanningBoardSnapshot = {
  generated_at: string
  horizon_weeks: number
  total_active_clients: number
  total_weekly_sessions: number
  total_projected_revenue_cents: number
  total_open_requests: number
  total_pending_recommendation_responses: number
  weeks: RecurringPlanningBoardWeek[]
  backlog_requests: RecurringPlanningBoardBacklogItem[]
}

type ClientNotificationRecipient = {
  auth_user_id: string | null
  full_name: string | null
}

async function getClientNotificationRecipient(
  db: any,
  clientId: string,
  tenantId: string
): Promise<ClientNotificationRecipient | null> {
  const { data, error } = await db
    .from('clients')
    .select('auth_user_id, full_name')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) return null
  return data as ClientNotificationRecipient
}

export async function logServedDish(input: ServedDishInput) {
  const chef = await requireChef()
  const db: any = createServerClient()
  const data = ServedDishSchema.parse(input)

  const { error } = await db.from('served_dish_history').insert({
    ...data,
    chef_id: chef.id,
    recipe_id: data.recipe_id ?? null,
    event_id: data.event_id ?? null,
    client_reaction: data.client_reaction ?? null,
  })

  if (error) throw new Error(error.message)
  revalidateRecurringPaths(input.client_id)
}

export async function listClientMealRequests(clientId: string, limit = 120) {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = (chef as any).tenantId ?? chef.id

  const { data, error } = await db
    .from('client_meal_requests')
    .select(
      'id, client_id, request_type, dish_name, notes, requested_for_week_start, priority, status, reviewed_at, created_at'
    )
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(Math.max(1, Math.min(limit, 250)))

  if (error) throw new Error(error.message)
  return (data ?? []) as ClientMealRequest[]
}

export async function listRecurringRecommendationsForClient(clientId: string, limit = 40) {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = (chef as any).tenantId ?? chef.id

  const { data, error } = await db
    .from('recurring_menu_recommendations')
    .select(
      'id, client_id, week_start, recommendation_text, status, client_response_notes, sent_at, responded_at, created_at'
    )
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(Math.max(1, Math.min(limit, 100)))

  if (error) throw new Error(error.message)
  return (data ?? []) as RecurringMenuRecommendation[]
}

export async function getRecurringCollaborationCommandCenter(limit = 18) {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = (chef as any).tenantId ?? chef.id
  const safeLimit = Math.max(1, Math.min(limit, 50))

  const [{ data: openRequests, error: requestError }, { data: pendingResponses, error: recError }] =
    await Promise.all([
      db
        .from('client_meal_requests')
        .select(
          'id, client_id, dish_name, status, priority, requested_for_week_start, created_at, clients(full_name)'
        )
        .eq('tenant_id', tenantId)
        .in('status', ['requested', 'reviewed', 'scheduled'])
        .order('created_at', { ascending: false })
        .limit(safeLimit),
      db
        .from('recurring_menu_recommendations')
        .select('id, client_id, week_start, status, created_at, clients(full_name)')
        .eq('tenant_id', tenantId)
        .eq('status', 'sent')
        .order('created_at', { ascending: false })
        .limit(safeLimit),
    ])

  if (requestError) throw new Error(requestError.message)
  if (recError) throw new Error(recError.message)

  const requestItems: RecurringCollaborationItem[] = ((openRequests ?? []) as any[]).map((row) => ({
    id: String(row.id),
    type: 'meal_request',
    client_id: String(row.client_id),
    client_name: String(row.clients?.full_name ?? 'Client'),
    title: String(row.dish_name),
    status: String(row.status),
    priority:
      row.priority === 'low' || row.priority === 'normal' || row.priority === 'high'
        ? row.priority
        : null,
    week_start:
      typeof row.requested_for_week_start === 'string' ? row.requested_for_week_start : null,
    created_at: String(row.created_at),
  }))

  const responseItems: RecurringCollaborationItem[] = ((pendingResponses ?? []) as any[]).map(
    (row) => ({
      id: String(row.id),
      type: 'recommendation_response',
      client_id: String(row.client_id),
      client_name: String(row.clients?.full_name ?? 'Client'),
      title: 'Waiting on recommendation response',
      status: String(row.status),
      priority: null,
      week_start: typeof row.week_start === 'string' ? row.week_start : null,
      created_at: String(row.created_at),
    })
  )

  const items = [...requestItems, ...responseItems]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, safeLimit)

  return {
    openMealRequestCount: requestItems.length,
    pendingRecommendationResponseCount: responseItems.length,
    totalOpenItems: requestItems.length + responseItems.length,
    items,
  } as RecurringCollaborationCommandCenter
}

export async function bulkUpdateClientWeekMealRequests(input: BulkUpdateWeekMealRequestsInput) {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = (chef as any).tenantId ?? chef.id
  const validated = BulkUpdateWeekMealRequestsSchema.parse(input)

  const normalizedWeekStart = toIsoDate(
    startOfWeek(parseISO(`${validated.week_start}T00:00:00`), { weekStartsOn: 1 })
  )
  const weekEnd = toIsoDate(addDays(parseISO(`${normalizedWeekStart}T00:00:00`), 6))
  const fromStatuses = validated.status === 'reviewed' ? ['requested'] : ['requested', 'reviewed']

  const { data: targetRequests, error: selectError } = await db
    .from('client_meal_requests')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('client_id', validated.client_id)
    .in('status', fromStatuses)
    .gte('requested_for_week_start', normalizedWeekStart)
    .lte('requested_for_week_start', weekEnd)
    .order('created_at', { ascending: true })

  if (selectError) {
    throw new Error(selectError.message)
  }

  const requestIds = (targetRequests ?? [])
    .map((row: any) => (typeof row.id === 'string' ? row.id : null))
    .filter((value: string | null): value is string => Boolean(value))

  if (requestIds.length === 0) {
    return {
      success: true,
      updatedCount: 0,
      status: validated.status,
      weekStart: normalizedWeekStart,
    }
  }

  const { error: updateError } = await db
    .from('client_meal_requests')
    .update({
      status: validated.status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: chef.id,
    })
    .eq('tenant_id', tenantId)
    .in('id', requestIds)

  if (updateError) {
    throw new Error(updateError.message)
  }

  if (validated.status === 'scheduled') {
    try {
      const recipient = await getClientNotificationRecipient(db, validated.client_id, tenantId)
      if (recipient?.auth_user_id) {
        await createNotification({
          tenantId,
          recipientId: recipient.auth_user_id,
          category: 'event',
          action: 'meal_request_scheduled_to_client',
          title: `Your requests for week of ${normalizedWeekStart} were scheduled`,
          body: `${requestIds.length} request${requestIds.length === 1 ? '' : 's'} moved into schedule.`,
          clientId: validated.client_id,
          actionUrl: '/my-profile',
          metadata: {
            weekStart: normalizedWeekStart,
            updatedCount: requestIds.length,
          },
        })
      }
    } catch (notifyErr) {
      console.error(
        '[bulkUpdateClientWeekMealRequests] Notification failed (non-blocking):',
        notifyErr
      )
    }
  }

  revalidateRecurringPaths(validated.client_id)
  revalidatePath('/my-profile')
  return {
    success: true,
    updatedCount: requestIds.length,
    status: validated.status,
    weekStart: normalizedWeekStart,
  }
}

export async function sendWeekRecommendationFromBoard(input: SendWeekRecommendationFromBoardInput) {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = (chef as any).tenantId ?? chef.id
  const validated = SendWeekRecommendationFromBoardSchema.parse(input)

  const weekStart = toIsoDate(
    startOfWeek(parseISO(`${validated.week_start}T00:00:00`), { weekStartsOn: 1 })
  )
  const weekEnd = toIsoDate(addDays(parseISO(`${weekStart}T00:00:00`), 6))

  const { data: existing, error: existingError } = await db
    .from('recurring_menu_recommendations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('client_id', validated.client_id)
    .eq('week_start', weekStart)
    .eq('status', 'sent')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }
  if (existing?.id) {
    throw new Error('A recommendation for this week is already awaiting response')
  }

  const [{ data: client, error: clientError }, { data: services, error: serviceError }] =
    await Promise.all([
      db
        .from('clients')
        .select('id, full_name, favorite_dishes')
        .eq('id', validated.client_id)
        .eq('tenant_id', tenantId)
        .single(),
      db
        .from('recurring_services')
        .select('service_type, frequency, day_of_week, start_date, end_date, notes, status')
        .eq('chef_id', chef.id)
        .eq('client_id', validated.client_id)
        .eq('status', 'active'),
    ])

  if (clientError || !client) {
    throw new Error(clientError?.message ?? 'Client not found')
  }
  if (serviceError) {
    throw new Error(serviceError.message)
  }

  const activeServices = (services ?? []) as Array<{
    service_type: string
    frequency: 'weekly' | 'biweekly' | 'monthly'
    day_of_week: unknown
    start_date: string
    end_date: string | null
    notes: string | null
    status: string
  }>
  if (activeServices.length === 0) {
    throw new Error('No active recurring services found for this client')
  }

  const [{ data: history, error: historyError }, { data: requestSignals, error: requestError }] =
    await Promise.all([
      db
        .from('served_dish_history')
        .select('dish_name, client_reaction, served_date')
        .eq('chef_id', chef.id)
        .eq('client_id', validated.client_id)
        .order('served_date', { ascending: false })
        .limit(200),
      db
        .from('client_meal_requests')
        .select('dish_name, request_type, status')
        .eq('tenant_id', tenantId)
        .eq('client_id', validated.client_id)
        .in('status', ['requested', 'reviewed', 'scheduled'])
        .order('created_at', { ascending: false })
        .limit(120),
    ])

  if (historyError) throw new Error(historyError.message)
  if (requestError) throw new Error(requestError.message)

  const favoriteDishes = Array.isArray(client.favorite_dishes)
    ? client.favorite_dishes.filter((dish: unknown): dish is string => typeof dish === 'string')
    : []
  const menuSignals = buildMenuSuggestionBundle(
    (history ?? []) as Array<{
      dish_name: string
      client_reaction?: 'loved' | 'liked' | 'neutral' | 'disliked' | null
      served_date: string
    }>,
    favoriteDishes,
    {
      recommendationCount: 6,
      requestSignals: (requestSignals ?? []) as Array<{
        dish_name: string
        request_type: 'repeat_dish' | 'new_idea' | 'avoid_dish' | null
        status:
          | 'requested'
          | 'reviewed'
          | 'scheduled'
          | 'fulfilled'
          | 'declined'
          | 'withdrawn'
          | null
      }>,
    }
  )

  const serviceDates = Array.from(
    new Set(
      activeServices.flatMap((service) =>
        getUpcomingServiceDates(
          {
            frequency: service.frequency,
            day_of_week: service.day_of_week,
            start_date: service.start_date,
            end_date: service.end_date,
          },
          {
            fromDate: parseISO(`${weekStart}T00:00:00`),
            horizonWeeks: 2,
            maxResults: 24,
          }
        ).filter((date) => date >= weekStart && date <= weekEnd)
      )
    )
  ).sort((a, b) => a.localeCompare(b))

  const serviceLabel =
    activeServices.length === 1
      ? (SERVICE_TYPE_LABELS[activeServices[0].service_type] ?? 'Recurring Service')
      : 'Recurring Service Plan'
  const serviceNotes = [validated.note, ...activeServices.map((service) => service.notes)]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(' | ')
  const cappedServiceNotes =
    serviceNotes.length > 1200 ? `${serviceNotes.slice(0, 1200).trim()}...` : serviceNotes

  const draft = buildRecommendationDraftText({
    clientName: client.full_name || 'there',
    serviceLabel,
    serviceDates,
    recommendedDishes: menuSignals.recommended,
    avoidDishes: menuSignals.avoid.slice(0, 4),
    notes: cappedServiceNotes || null,
  })

  const sent = await sendRecurringRecommendationToClient({
    client_id: validated.client_id,
    draft,
    target_week_start: weekStart,
  })

  revalidatePath('/clients/recurring')
  return {
    success: true,
    recommendationId: sent.recommendationId,
    weekStart,
  }
}

type MutableRecurringBoardRow = {
  client_id: string
  client_name: string
  week_start: string
  session_count: number
  projected_revenue_cents: number
  next_session_date: string | null
  service_labels: Set<string>
  open_request_count: number
  high_priority_request_count: number
  pending_recommendation_response_count: number
  repeat_signal_counts: Map<string, number>
  avoid_signal_counts: Map<string, number>
  recommendation_status: RecurringPlanningBoardRecommendationStatus
}

type MutableRecurringBacklogItem = {
  client_id: string
  client_name: string
  open_request_count: number
  high_priority_request_count: number
  repeat_signal_counts: Map<string, number>
  avoid_signal_counts: Map<string, number>
}

function toTopSignals(counts: Map<string, number>, limit = 3): string[] {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([dish]) => dish)
}

export async function getRecurringPlanningBoardSnapshot(
  horizonWeeks = 6
): Promise<RecurringPlanningBoardSnapshot> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = (chef as any).tenantId ?? chef.id
  const safeHorizonWeeks = Math.max(2, Math.min(horizonWeeks, 12))
  const horizonStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const horizonEnd = addDays(horizonStart, safeHorizonWeeks * 7 - 1)

  const [
    { data: services, error: servicesError },
    { data: openRequests, error: requestsError },
    { data: recommendations, error: recommendationsError },
  ] = await Promise.all([
    db
      .from('recurring_services')
      .select(
        'id, client_id, service_type, frequency, day_of_week, rate_cents, start_date, end_date, status, clients(full_name)'
      )
      .eq('chef_id', chef.id)
      .eq('status', 'active')
      .order('start_date', { ascending: true }),
    db
      .from('client_meal_requests')
      .select(
        'id, client_id, dish_name, request_type, priority, status, requested_for_week_start, created_at, clients(full_name)'
      )
      .eq('tenant_id', tenantId)
      .in('status', ['requested', 'reviewed', 'scheduled'])
      .order('created_at', { ascending: false })
      .limit(500),
    db
      .from('recurring_menu_recommendations')
      .select('id, client_id, week_start, status, created_at, clients(full_name)')
      .eq('tenant_id', tenantId)
      .in('status', ['sent', 'approved', 'revision_requested'])
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  if (servicesError) throw new Error(servicesError.message)
  if (requestsError) throw new Error(requestsError.message)
  if (recommendationsError) throw new Error(recommendationsError.message)

  const rowMap = new Map<string, MutableRecurringBoardRow>()
  const backlogMap = new Map<string, MutableRecurringBacklogItem>()
  const activeClients = new Set<string>()

  function inHorizonWeek(weekStartIso: string): boolean {
    const weekDate = parseISO(`${weekStartIso}T00:00:00`)
    return !isBefore(weekDate, horizonStart) && !isAfter(weekDate, horizonEnd)
  }

  function normalizeWeekStartFromDate(dateIso: string): string {
    return toIsoDate(startOfWeek(parseISO(`${dateIso}T00:00:00`), { weekStartsOn: 1 }))
  }

  function ensureRow(
    clientId: string,
    clientName: string,
    weekStart: string
  ): MutableRecurringBoardRow {
    const key = `${weekStart}:${clientId}`
    const existing = rowMap.get(key)
    if (existing) return existing
    const row: MutableRecurringBoardRow = {
      client_id: clientId,
      client_name: clientName || 'Client',
      week_start: weekStart,
      session_count: 0,
      projected_revenue_cents: 0,
      next_session_date: null,
      service_labels: new Set<string>(),
      open_request_count: 0,
      high_priority_request_count: 0,
      pending_recommendation_response_count: 0,
      repeat_signal_counts: new Map<string, number>(),
      avoid_signal_counts: new Map<string, number>(),
      recommendation_status: 'not_sent',
    }
    rowMap.set(key, row)
    return row
  }

  function ensureBacklog(clientId: string, clientName: string): MutableRecurringBacklogItem {
    const existing = backlogMap.get(clientId)
    if (existing) return existing
    const backlog: MutableRecurringBacklogItem = {
      client_id: clientId,
      client_name: clientName || 'Client',
      open_request_count: 0,
      high_priority_request_count: 0,
      repeat_signal_counts: new Map<string, number>(),
      avoid_signal_counts: new Map<string, number>(),
    }
    backlogMap.set(clientId, backlog)
    return backlog
  }

  for (const service of (services ?? []) as any[]) {
    const clientId = String(service.client_id)
    const clientName = String(service.clients?.full_name ?? 'Client')
    activeClients.add(clientId)

    const upcomingDates = getUpcomingServiceDates(
      {
        frequency: service.frequency,
        day_of_week: service.day_of_week,
        start_date: service.start_date,
        end_date: service.end_date,
      },
      { horizonWeeks: safeHorizonWeeks, maxResults: 60 }
    )

    for (const date of upcomingDates) {
      const weekStart = normalizeWeekStartFromDate(date)
      if (!inHorizonWeek(weekStart)) continue
      const row = ensureRow(clientId, clientName, weekStart)
      row.session_count += 1
      row.projected_revenue_cents += Number(service.rate_cents ?? 0)
      row.service_labels.add(
        SERVICE_TYPE_LABELS[service.service_type] ?? String(service.service_type)
      )
      if (!row.next_session_date || isBefore(parseISO(date), parseISO(row.next_session_date))) {
        row.next_session_date = date
      }
    }
  }

  for (const request of (openRequests ?? []) as any[]) {
    const clientId = String(request.client_id)
    const clientName = String(request.clients?.full_name ?? 'Client')
    const requestedFor =
      typeof request.requested_for_week_start === 'string' ? request.requested_for_week_start : null

    const dishName = String(request.dish_name ?? '').trim()
    const requestType = String(request.request_type ?? '')
    const isHighPriority = request.priority === 'high'

    if (requestedFor) {
      const weekStart = normalizeWeekStartFromDate(requestedFor)
      if (inHorizonWeek(weekStart)) {
        const row = ensureRow(clientId, clientName, weekStart)
        row.open_request_count += 1
        if (isHighPriority) row.high_priority_request_count += 1
        if (dishName && requestType === 'repeat_dish') {
          row.repeat_signal_counts.set(dishName, (row.repeat_signal_counts.get(dishName) ?? 0) + 1)
        }
        if (dishName && requestType === 'avoid_dish') {
          row.avoid_signal_counts.set(dishName, (row.avoid_signal_counts.get(dishName) ?? 0) + 1)
        }
        continue
      }
    }

    const backlog = ensureBacklog(clientId, clientName)
    backlog.open_request_count += 1
    if (isHighPriority) backlog.high_priority_request_count += 1
    if (dishName && requestType === 'repeat_dish') {
      backlog.repeat_signal_counts.set(
        dishName,
        (backlog.repeat_signal_counts.get(dishName) ?? 0) + 1
      )
    }
    if (dishName && requestType === 'avoid_dish') {
      backlog.avoid_signal_counts.set(
        dishName,
        (backlog.avoid_signal_counts.get(dishName) ?? 0) + 1
      )
    }
  }

  const latestRecommendationByKey = new Map<
    string,
    { status: RecurringPlanningBoardRecommendationStatus; createdAt: string; clientName: string }
  >()
  for (const recommendation of (recommendations ?? []) as any[]) {
    const clientId = String(recommendation.client_id)
    const clientName = String(recommendation.clients?.full_name ?? 'Client')
    const weekStart =
      typeof recommendation.week_start === 'string'
        ? normalizeWeekStartFromDate(recommendation.week_start)
        : null
    const status = recommendation.status as RecurringPlanningBoardRecommendationStatus
    if (!weekStart || !inHorizonWeek(weekStart)) continue

    const key = `${weekStart}:${clientId}`
    const previous = latestRecommendationByKey.get(key)
    if (
      !previous ||
      new Date(recommendation.created_at).getTime() > new Date(previous.createdAt).getTime()
    ) {
      latestRecommendationByKey.set(key, {
        status,
        createdAt: String(recommendation.created_at),
        clientName,
      })
    }
  }

  for (const [key, recommendation] of latestRecommendationByKey.entries()) {
    const [weekStart, clientId] = key.split(':')
    const row = ensureRow(clientId, recommendation.clientName, weekStart)
    row.recommendation_status = recommendation.status
    if (recommendation.status === 'sent') {
      row.pending_recommendation_response_count = 1
    }
  }

  const weekMap = new Map<string, RecurringPlanningBoardWeek>()
  for (const row of rowMap.values()) {
    const mappedRow: RecurringPlanningBoardClientRow = {
      client_id: row.client_id,
      client_name: row.client_name,
      week_start: row.week_start,
      session_count: row.session_count,
      projected_revenue_cents: row.projected_revenue_cents,
      next_session_date: row.next_session_date,
      service_labels: Array.from(row.service_labels.values()).sort((a, b) => a.localeCompare(b)),
      open_request_count: row.open_request_count,
      high_priority_request_count: row.high_priority_request_count,
      pending_recommendation_response_count: row.pending_recommendation_response_count,
      repeat_signals: toTopSignals(row.repeat_signal_counts, 3),
      avoid_signals: toTopSignals(row.avoid_signal_counts, 3),
      recommendation_status: row.recommendation_status,
    }

    const week = weekMap.get(row.week_start)
    if (week) {
      week.clients.push(mappedRow)
      week.client_count += 1
      week.session_count += mappedRow.session_count
      week.projected_revenue_cents += mappedRow.projected_revenue_cents
      week.open_request_count += mappedRow.open_request_count
      week.high_priority_request_count += mappedRow.high_priority_request_count
      week.pending_recommendation_response_count += mappedRow.pending_recommendation_response_count
      continue
    }

    weekMap.set(row.week_start, {
      week_start: row.week_start,
      week_end: toIsoDate(addDays(parseISO(`${row.week_start}T00:00:00`), 6)),
      client_count: 1,
      session_count: mappedRow.session_count,
      projected_revenue_cents: mappedRow.projected_revenue_cents,
      open_request_count: mappedRow.open_request_count,
      high_priority_request_count: mappedRow.high_priority_request_count,
      pending_recommendation_response_count: mappedRow.pending_recommendation_response_count,
      clients: [mappedRow],
    })
  }

  const weeks = Array.from(weekMap.values())
    .sort((a, b) => new Date(a.week_start).getTime() - new Date(b.week_start).getTime())
    .map((week) => ({
      ...week,
      clients: week.clients.sort((a, b) => {
        if (b.high_priority_request_count !== a.high_priority_request_count) {
          return b.high_priority_request_count - a.high_priority_request_count
        }
        if (b.open_request_count !== a.open_request_count) {
          return b.open_request_count - a.open_request_count
        }
        if (b.session_count !== a.session_count) {
          return b.session_count - a.session_count
        }
        return a.client_name.localeCompare(b.client_name)
      }),
    }))

  const backlogRequests = Array.from(backlogMap.values())
    .map((item) => ({
      client_id: item.client_id,
      client_name: item.client_name,
      open_request_count: item.open_request_count,
      high_priority_request_count: item.high_priority_request_count,
      repeat_signals: toTopSignals(item.repeat_signal_counts, 3),
      avoid_signals: toTopSignals(item.avoid_signal_counts, 3),
    }))
    .sort((a, b) => {
      if (b.high_priority_request_count !== a.high_priority_request_count) {
        return b.high_priority_request_count - a.high_priority_request_count
      }
      if (b.open_request_count !== a.open_request_count) {
        return b.open_request_count - a.open_request_count
      }
      return a.client_name.localeCompare(b.client_name)
    })

  return {
    generated_at: new Date().toISOString(),
    horizon_weeks: safeHorizonWeeks,
    total_active_clients: activeClients.size,
    total_weekly_sessions: weeks.reduce((sum, week) => sum + week.session_count, 0),
    total_projected_revenue_cents: weeks.reduce(
      (sum, week) => sum + week.projected_revenue_cents,
      0
    ),
    total_open_requests: (openRequests ?? []).length,
    total_pending_recommendation_responses: weeks.reduce(
      (sum, week) => sum + week.pending_recommendation_response_count,
      0
    ),
    weeks,
    backlog_requests: backlogRequests,
  }
}

export async function updateClientMealRequestStatus(
  requestId: string,
  status: ClientMealRequestStatus
) {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = (chef as any).tenantId ?? chef.id
  const nextStatus = ChefMealRequestStatusSchema.parse(status)

  const { data: updated, error } = await db
    .from('client_meal_requests')
    .update({
      status: nextStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: chef.id,
    })
    .eq('id', requestId)
    .eq('tenant_id', tenantId)
    .in('status', ['requested', 'reviewed', 'scheduled'])
    .select('client_id, dish_name')
    .single()

  if (error || !updated) throw new Error(error?.message ?? 'Unable to update request status')

  if (nextStatus === 'scheduled' || nextStatus === 'declined') {
    try {
      const recipient = await getClientNotificationRecipient(db, updated.client_id, tenantId)
      if (recipient?.auth_user_id) {
        await createNotification({
          tenantId,
          recipientId: recipient.auth_user_id,
          category: 'event',
          action:
            nextStatus === 'scheduled'
              ? 'meal_request_scheduled_to_client'
              : 'meal_request_declined_to_client',
          title:
            nextStatus === 'scheduled'
              ? `${updated.dish_name} has been scheduled`
              : `${updated.dish_name} is unavailable this cycle`,
          body:
            nextStatus === 'scheduled'
              ? 'Your chef scheduled this request for an upcoming service.'
              : 'Your chef declined this request and may suggest an alternative.',
          clientId: updated.client_id,
          actionUrl: '/my-profile',
          metadata: {
            requestId,
            dishName: updated.dish_name,
            status: nextStatus,
          },
        })
      }
    } catch (notifyErr) {
      console.error(
        '[updateClientMealRequestStatus] Notification failed (non-blocking):',
        notifyErr
      )
    }
  }

  revalidateRecurringPaths(updated.client_id)
  revalidatePath('/my-profile')
}

export async function fulfillClientMealRequest(input: FulfillMealRequestInput) {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = (chef as any).tenantId ?? chef.id
  const validated = FulfillMealRequestSchema.parse(input)

  const { data: requestRow, error: requestError } = await db
    .from('client_meal_requests')
    .select('id, tenant_id, client_id, dish_name, notes, status, reviewed_at, reviewed_by')
    .eq('id', validated.request_id)
    .eq('tenant_id', tenantId)
    .single()

  if (requestError || !requestRow) {
    throw new Error(requestError?.message ?? 'Meal request not found')
  }
  if (['declined', 'withdrawn', 'fulfilled'].includes(requestRow.status)) {
    throw new Error('This request cannot be fulfilled in its current state')
  }

  const composedNotes =
    [requestRow.notes, validated.notes]
      .filter((value): value is string => Boolean(value && value.trim()))
      .join(' | ') || null

  const { data: fulfillUpdated, error: updateRequestError } = await db
    .from('client_meal_requests')
    .update({
      status: 'fulfilled',
      reviewed_at: new Date().toISOString(),
      reviewed_by: chef.id,
    })
    .eq('id', validated.request_id)
    .eq('tenant_id', tenantId)
    .in('status', ['requested', 'reviewed', 'scheduled'])
    .select('id')
    .single()

  if (updateRequestError || !fulfillUpdated) {
    throw new Error(updateRequestError?.message ?? 'Unable to fulfill this request')
  }

  const { error: insertHistoryError } = await db.from('served_dish_history').insert({
    chef_id: chef.id,
    client_id: requestRow.client_id,
    dish_name: requestRow.dish_name,
    served_date: validated.served_date,
    client_reaction: validated.client_reaction ?? null,
    notes: composedNotes,
  })

  if (insertHistoryError) {
    // Best-effort rollback if the history insert fails after status update.
    await db
      .from('client_meal_requests')
      .update({
        status: requestRow.status,
        reviewed_at: requestRow.reviewed_at,
        reviewed_by: requestRow.reviewed_by,
      })
      .eq('id', validated.request_id)
      .eq('tenant_id', tenantId)
    throw new Error(insertHistoryError.message)
  }

  try {
    const recipient = await getClientNotificationRecipient(db, requestRow.client_id, tenantId)
    if (recipient?.auth_user_id) {
      await createNotification({
        tenantId,
        recipientId: recipient.auth_user_id,
        category: 'event',
        action: 'meal_request_fulfilled_to_client',
        title: `${requestRow.dish_name} has been prepared`,
        body: `Marked fulfilled for ${validated.served_date}.`,
        clientId: requestRow.client_id,
        actionUrl: '/my-profile',
        metadata: {
          requestId: validated.request_id,
          dishName: requestRow.dish_name,
          servedDate: validated.served_date,
          reaction: validated.client_reaction ?? null,
        },
      })
    }
  } catch (notifyErr) {
    console.error('[fulfillClientMealRequest] Notification failed (non-blocking):', notifyErr)
  }

  revalidateRecurringPaths(requestRow.client_id)
  revalidatePath('/my-profile')
}

export async function deleteServedDishEntry(id: string) {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('served_dish_history')
    .delete()
    .eq('id', id)
    .eq('chef_id', chef.id)

  if (error) throw new Error(error.message)
}

export async function sendRecurringRecommendationToClient(input: SendRecurringRecommendationInput) {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = (chef as any).tenantId ?? chef.id
  const validated = SendRecurringRecommendationSchema.parse(input)

  const recipient = await getClientNotificationRecipient(db, validated.client_id, tenantId)
  if (!recipient?.auth_user_id) {
    throw new Error('Client portal account not found for this contact')
  }

  const draftPreview = validated.draft.replace(/\s+/g, ' ').trim().slice(0, 420)
  const targetWeekLabel = validated.target_week_start
    ? ` for week of ${validated.target_week_start}`
    : ''

  const { data: recommendationRow, error: recommendationError } = await db
    .from('recurring_menu_recommendations')
    .insert({
      tenant_id: tenantId,
      client_id: validated.client_id,
      week_start: validated.target_week_start ?? null,
      recommendation_text: validated.draft.trim(),
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_by: chef.id,
    })
    .select('id')
    .single()

  if (recommendationError || !recommendationRow) {
    throw new Error(recommendationError?.message ?? 'Failed to store recommendation')
  }

  await createNotification({
    tenantId,
    recipientId: recipient.auth_user_id,
    category: 'event',
    action: 'meal_recommendation_sent_to_client',
    title: `New menu recommendation${targetWeekLabel}`,
    body: draftPreview,
    clientId: validated.client_id,
    actionUrl: '/my-profile',
    metadata: {
      recommendationId: recommendationRow.id,
      clientId: validated.client_id,
      targetWeekStart: validated.target_week_start ?? null,
      draftLength: validated.draft.length,
      source: 'recurring_service_planning',
    },
  })

  revalidatePath('/my-profile')
  revalidatePath('/clients/recurring')
  revalidatePath(`/clients/${validated.client_id}/recurring`)
  return { success: true, recommendationId: recommendationRow.id }
}

export async function getServedHistoryForClient(clientId: string, weeks = 12) {
  const chef = await requireChef()
  const db: any = createServerClient()

  const since = addWeeks(new Date(), -weeks).toISOString().slice(0, 10)

  const { data, error } = await db
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
  const db: any = createServerClient()
  const tenantId = (chef as any).tenantId ?? chef.id

  const [{ data: history }, { data: client }, { data: requestSignals }] = await Promise.all([
    db
      .from('served_dish_history')
      .select('dish_name, recipe_id, client_reaction, served_date')
      .eq('chef_id', chef.id)
      .eq('client_id', clientId)
      .order('served_date', { ascending: false }),
    db
      .from('clients')
      .select('favorite_dishes')
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .single(),
    db
      .from('client_meal_requests')
      .select('dish_name, request_type, status')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .in('status', ['requested', 'reviewed', 'scheduled'])
      .order('created_at', { ascending: false })
      .limit(120),
  ])

  const rows = history ?? []
  const favoriteDishes = Array.isArray(client?.favorite_dishes)
    ? client.favorite_dishes.filter((dish: unknown): dish is string => typeof dish === 'string')
    : []
  const bundle = buildMenuSuggestionBundle(rows, favoriteDishes, {
    recommendationCount: 5,
    requestSignals: (requestSignals ?? []) as Array<{
      dish_name: string
      request_type: 'repeat_dish' | 'new_idea' | 'avoid_dish' | null
      status: 'requested' | 'reviewed' | 'scheduled' | 'fulfilled' | 'declined' | 'withdrawn' | null
    }>,
  })

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
  const db: any = createServerClient()
  const tenantId = (chef as any).tenantId ?? chef.id

  const [{ data: services }, { data: history }, { data: client }, { data: requestSignals }] =
    await Promise.all([
      db
        .from('recurring_services')
        .select(
          'id, service_type, frequency, day_of_week, rate_cents, start_date, end_date, notes, status'
        )
        .eq('chef_id', chef.id)
        .eq('client_id', clientId)
        .in('status', ['active', 'paused'])
        .order('start_date', { ascending: true }),
      db
        .from('served_dish_history')
        .select('dish_name, client_reaction, served_date')
        .eq('chef_id', chef.id)
        .eq('client_id', clientId)
        .order('served_date', { ascending: false }),
      db
        .from('clients')
        .select('full_name, favorite_dishes')
        .eq('id', clientId)
        .eq('tenant_id', tenantId)
        .single(),
      db
        .from('client_meal_requests')
        .select('dish_name, request_type, status')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .in('status', ['requested', 'reviewed', 'scheduled'])
        .order('created_at', { ascending: false })
        .limit(120),
    ])

  const favoriteDishes = Array.isArray(client?.favorite_dishes)
    ? client.favorite_dishes.filter((dish: unknown): dish is string => typeof dish === 'string')
    : []
  const menuSignals = buildMenuSuggestionBundle(history ?? [], favoriteDishes, {
    recommendationCount: 5,
    requestSignals: (requestSignals ?? []) as Array<{
      dish_name: string
      request_type: 'repeat_dish' | 'new_idea' | 'avoid_dish' | null
      status: 'requested' | 'reviewed' | 'scheduled' | 'fulfilled' | 'declined' | 'withdrawn' | null
    }>,
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
