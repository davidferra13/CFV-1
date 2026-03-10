'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ───────────────────────────────────────────────────────

export type ClientMealPrepSubscription = {
  id: string
  status: 'active' | 'paused' | 'ended'
  deliveryDay: number
  deliveryWindowStart: string
  deliveryWindowEnd: string
  deliveryAddress: string | null
  deliveryInstructions: string | null
  containersOut: number
  containersReturned: number
  containerDepositCents: number
  rotationWeeks: number
  currentRotationWeek: number
  rateCents: number
  frequency: string
  chefName: string | null
  currentWeek: ClientMealPrepWeek | null
  upcomingWeeks: ClientMealPrepWeek[]
}

export type ClientMealPrepWeek = {
  id: string
  rotationWeek: number
  menuTitle: string | null
  customDishes: Array<{ name: string; description?: string; servings?: number }>
  notes: string | null
  preppedAt: string | null
  deliveredAt: string | null
  containersSent: number
  containersBack: number
}

export type ClientDeliveryScheduleEntry = {
  date: string
  windowStart: string
  windowEnd: string
  address: string | null
}

export type ClientMealHistoryEntry = {
  weekId: string
  deliveredAt: string
  menuTitle: string | null
  dishes: Array<{ name: string; description?: string; servings?: number }>
  feedback: string | null
}

export type ClientPreferencesInput = {
  dietary_restrictions?: string[]
  allergies?: string[]
  dislikes?: string[]
  favorite_cuisines?: string[]
  notes?: string
}

// ─── Actions ─────────────────────────────────────────────────────

export async function getMyMealPrepSubscription(): Promise<ClientMealPrepSubscription | null> {
  const user = await requireClient()
  const supabase: any = createServerClient()

  // Find active/paused program for this client
  const { data: program, error: progErr } = await supabase
    .from('meal_prep_programs')
    .select(
      `
      *,
      recurring_service:recurring_services(id, frequency, rate_cents, service_type),
      client:clients(tenant_id)
    `
    )
    .eq('client_id', user.entityId)
    .in('status', ['active', 'paused'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (progErr || !program) return null

  // Get chef name
  const tenantId = program.client?.tenant_id || program.tenant_id
  let chefName: string | null = null
  if (tenantId) {
    const { data: chef } = await supabase
      .from('chefs')
      .select('business_name')
      .eq('id', tenantId)
      .single()
    chefName = chef?.business_name || null
  }

  // Get all weeks for this program
  const { data: weeks } = await supabase
    .from('meal_prep_weeks')
    .select('*, menu:menus(title)')
    .eq('program_id', program.id)
    .order('rotation_week', { ascending: true })

  const mappedWeeks: ClientMealPrepWeek[] = (weeks || []).map(mapWeek)

  // Current week = the current_rotation_week value
  const currentWeek =
    mappedWeeks.find((w) => w.rotationWeek === program.current_rotation_week) || null

  // Upcoming = next 4 rotation weeks (wrap around if needed)
  const upcomingWeeks = mappedWeeks
    .filter((w) => w.rotationWeek > program.current_rotation_week)
    .slice(0, 4)

  return {
    id: program.id,
    status: program.status,
    deliveryDay: program.delivery_day,
    deliveryWindowStart: program.delivery_window_start,
    deliveryWindowEnd: program.delivery_window_end,
    deliveryAddress: program.delivery_address,
    deliveryInstructions: program.delivery_instructions,
    containersOut: program.containers_out || 0,
    containersReturned: program.containers_returned || 0,
    containerDepositCents: program.container_deposit_cents || 0,
    rotationWeeks: program.rotation_weeks,
    currentRotationWeek: program.current_rotation_week,
    rateCents: program.recurring_service?.rate_cents || 0,
    frequency: program.recurring_service?.frequency || 'weekly',
    chefName,
    currentWeek,
    upcomingWeeks,
  }
}

export async function getMyUpcomingMeals(): Promise<ClientMealPrepWeek[]> {
  const user = await requireClient()
  const supabase: any = createServerClient()

  const { data: program } = await supabase
    .from('meal_prep_programs')
    .select('id, current_rotation_week')
    .eq('client_id', user.entityId)
    .in('status', ['active', 'paused'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!program) return []

  const { data: weeks } = await supabase
    .from('meal_prep_weeks')
    .select('*, menu:menus(title)')
    .eq('program_id', program.id)
    .gte('rotation_week', program.current_rotation_week)
    .order('rotation_week', { ascending: true })
    .limit(2)

  return (weeks || []).map(mapWeek)
}

export async function getMyDeliverySchedule(): Promise<ClientDeliveryScheduleEntry[]> {
  const user = await requireClient()
  const supabase: any = createServerClient()

  const { data: program } = await supabase
    .from('meal_prep_programs')
    .select('delivery_day, delivery_window_start, delivery_window_end, delivery_address')
    .eq('client_id', user.entityId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!program) return []

  // Generate next 4 delivery dates based on delivery_day
  const entries: ClientDeliveryScheduleEntry[] = []
  const today = new Date()

  for (let i = 0; i < 4; i++) {
    const daysUntilDelivery = ((program.delivery_day - today.getDay() + 7) % 7) + i * 7
    const date = new Date(today)
    date.setDate(today.getDate() + daysUntilDelivery)

    entries.push({
      date: date.toISOString().split('T')[0],
      windowStart: program.delivery_window_start,
      windowEnd: program.delivery_window_end,
      address: program.delivery_address,
    })
  }

  return entries
}

export async function getMyMealHistory(limit = 20): Promise<ClientMealHistoryEntry[]> {
  const user = await requireClient()
  const supabase: any = createServerClient()

  const { data: program } = await supabase
    .from('meal_prep_programs')
    .select('id')
    .eq('client_id', user.entityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!program) return []

  const { data: weeks } = await supabase
    .from('meal_prep_weeks')
    .select('*, menu:menus(title)')
    .eq('program_id', program.id)
    .not('delivered_at', 'is', null)
    .order('delivered_at', { ascending: false })
    .limit(limit)

  return (weeks || []).map((w: any) => ({
    weekId: w.id,
    deliveredAt: w.delivered_at,
    menuTitle: w.menu?.title || null,
    dishes: Array.isArray(w.custom_dishes) ? w.custom_dishes : [],
    feedback: w.notes,
  }))
}

export async function skipWeek(
  programId: string,
  weekDate: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireClient()
  const supabase: any = createServerClient()

  // Verify program belongs to this client
  const { data: program, error: progErr } = await supabase
    .from('meal_prep_programs')
    .select('id, tenant_id, status')
    .eq('id', programId)
    .eq('client_id', user.entityId)
    .single()

  if (progErr || !program) {
    return { success: false, error: 'Program not found' }
  }

  if (program.status !== 'active') {
    return { success: false, error: 'Program is not active' }
  }

  // Notify chef about the skip request (non-blocking)
  try {
    const { createNotification } = await import('@/lib/notifications/actions')
    await createNotification({
      tenantId: program.tenant_id,
      recipientId: program.tenant_id,
      category: 'client',
      action: 'system_alert',
      title: 'Meal prep skip request',
      body: `Client requested to skip the week of ${weekDate}.`,
      actionUrl: `/meal-prep/${programId}`,
    })
  } catch (err) {
    console.error('[non-blocking] Skip notification failed', err)
  }

  revalidatePath('/my-meals')
  return { success: true }
}

export async function pauseMySubscription(
  programId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireClient()
  const supabase: any = createServerClient()

  const { data: program, error: progErr } = await supabase
    .from('meal_prep_programs')
    .select('id, tenant_id, status')
    .eq('id', programId)
    .eq('client_id', user.entityId)
    .single()

  if (progErr || !program) {
    return { success: false, error: 'Program not found' }
  }

  if (program.status !== 'active') {
    return { success: false, error: 'Program is not active' }
  }

  const { error } = await supabase
    .from('meal_prep_programs')
    .update({ status: 'paused' })
    .eq('id', programId)
    .eq('client_id', user.entityId)

  if (error) {
    return { success: false, error: 'Failed to pause subscription' }
  }

  // Notify chef (non-blocking)
  try {
    const { createNotification } = await import('@/lib/notifications/actions')
    await createNotification({
      tenantId: program.tenant_id,
      recipientId: program.tenant_id,
      category: 'client',
      action: 'system_alert',
      title: 'Meal prep subscription paused',
      body: 'Client paused their meal prep subscription.',
      actionUrl: `/meal-prep/${programId}`,
    })
  } catch (err) {
    console.error('[non-blocking] Pause notification failed', err)
  }

  revalidatePath('/my-meals')
  return { success: true }
}

export async function resumeMySubscription(
  programId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireClient()
  const supabase: any = createServerClient()

  const { data: program, error: progErr } = await supabase
    .from('meal_prep_programs')
    .select('id, tenant_id, status')
    .eq('id', programId)
    .eq('client_id', user.entityId)
    .single()

  if (progErr || !program) {
    return { success: false, error: 'Program not found' }
  }

  if (program.status !== 'paused') {
    return { success: false, error: 'Program is not paused' }
  }

  const { error } = await supabase
    .from('meal_prep_programs')
    .update({ status: 'active' })
    .eq('id', programId)
    .eq('client_id', user.entityId)

  if (error) {
    return { success: false, error: 'Failed to resume subscription' }
  }

  // Notify chef (non-blocking)
  try {
    const { createNotification } = await import('@/lib/notifications/actions')
    await createNotification({
      tenantId: program.tenant_id,
      recipientId: program.tenant_id,
      category: 'client',
      action: 'system_alert',
      title: 'Meal prep subscription resumed',
      body: 'Client resumed their meal prep subscription.',
      actionUrl: `/meal-prep/${programId}`,
    })
  } catch (err) {
    console.error('[non-blocking] Resume notification failed', err)
  }

  revalidatePath('/my-meals')
  return { success: true }
}

export async function updateMyPreferences(
  input: ClientPreferencesInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireClient()
  const supabase: any = createServerClient()

  const updates: Record<string, any> = {}
  if (input.dietary_restrictions !== undefined)
    updates.dietary_restrictions = input.dietary_restrictions
  if (input.allergies !== undefined) updates.allergies = input.allergies
  if (input.dislikes !== undefined) updates.dislikes = input.dislikes
  if (input.favorite_cuisines !== undefined) updates.favorite_cuisines = input.favorite_cuisines
  if (input.notes !== undefined) updates.notes = input.notes

  const { error } = await supabase.from('clients').update(updates).eq('id', user.entityId)

  if (error) {
    return { success: false, error: 'Failed to update preferences' }
  }

  revalidatePath('/my-meals')
  revalidatePath('/my-meals/preferences')
  revalidatePath('/my-profile')
  return { success: true }
}

export async function updateMyDeliveryAddress(
  programId: string,
  address: string,
  instructions?: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireClient()
  const supabase: any = createServerClient()

  const updates: Record<string, any> = {
    delivery_address: address,
  }
  if (instructions !== undefined) {
    updates.delivery_instructions = instructions
  }

  const { error } = await supabase
    .from('meal_prep_programs')
    .update(updates)
    .eq('id', programId)
    .eq('client_id', user.entityId)

  if (error) {
    return { success: false, error: 'Failed to update delivery address' }
  }

  revalidatePath('/my-meals')
  return { success: true }
}

export async function submitMealFeedback(
  weekId: string,
  dishName: string,
  rating: 'loved' | 'liked' | 'neutral' | 'disliked'
): Promise<{ success: boolean; error?: string }> {
  const user = await requireClient()
  const supabase: any = createServerClient()

  // Verify the week belongs to a program owned by this client
  const { data: week, error: weekErr } = await supabase
    .from('meal_prep_weeks')
    .select('id, program_id, custom_dishes, notes')
    .eq('id', weekId)
    .single()

  if (weekErr || !week) {
    return { success: false, error: 'Week not found' }
  }

  const { data: program } = await supabase
    .from('meal_prep_programs')
    .select('id, client_id')
    .eq('id', week.program_id)
    .eq('client_id', user.entityId)
    .single()

  if (!program) {
    return { success: false, error: 'Not authorized' }
  }

  // Store feedback in the notes field (append)
  const existingNotes = week.notes || ''
  const feedbackLine = `[Feedback] ${dishName}: ${rating}`
  const updatedNotes = existingNotes ? `${existingNotes}\n${feedbackLine}` : feedbackLine

  const { error } = await supabase
    .from('meal_prep_weeks')
    .update({ notes: updatedNotes })
    .eq('id', weekId)

  if (error) {
    return { success: false, error: 'Failed to save feedback' }
  }

  revalidatePath('/my-meals/history')
  return { success: true }
}

// ─── Helpers ─────────────────────────────────────────────────────

function mapWeek(w: any): ClientMealPrepWeek {
  return {
    id: w.id,
    rotationWeek: w.rotation_week,
    menuTitle: w.menu?.title || null,
    customDishes: Array.isArray(w.custom_dishes) ? w.custom_dishes : [],
    notes: w.notes,
    preppedAt: w.prepped_at,
    deliveredAt: w.delivered_at,
    containersSent: w.containers_sent || 0,
    containersBack: w.containers_back || 0,
  }
}
