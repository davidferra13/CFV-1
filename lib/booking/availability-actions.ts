// Booking Availability - Server Actions
// Chef-side: manage weekly rules, date overrides, daily caps.
// Public: compute available time slots for a given date + event type.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'

// ---- Types ----

export type AvailabilityRule = {
  id: string
  chef_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
}

export type DateOverride = {
  id: string
  chef_id: string
  override_date: string
  is_available: boolean
  start_time: string | null
  end_time: string | null
  reason: string | null
}

export type DailyCaps = {
  max_per_day: number
  max_per_week: number
}

export type TimeSlot = {
  start: string // HH:MM
  end: string // HH:MM
}

// ---- Schemas ----

const AvailabilityRuleSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  is_available: z.boolean(),
})

const DateOverrideSchema = z.object({
  override_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  is_available: z.boolean(),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional()
    .nullable(),
  end_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional()
    .nullable(),
  reason: z.string().max(200).optional().or(z.literal('')),
})

const DailyCapsSchema = z.object({
  max_per_day: z.number().int().min(1).max(20).default(2),
  max_per_week: z.number().int().min(1).max(50).default(10),
})

// ---- Chef Actions ----

export async function getAvailabilityRules(): Promise<AvailabilityRule[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('booking_availability_rules')
    .select('*')
    .eq('chef_id', user.entityId)
    .order('day_of_week', { ascending: true })

  if (error) {
    console.error('[getAvailabilityRules] Error:', error)
    return []
  }

  return (data ?? []) as AvailabilityRule[]
}

export async function setAvailabilityRules(
  rules: z.infer<typeof AvailabilityRuleSchema>[]
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const validated = rules.map((r) => AvailabilityRuleSchema.parse(r))

  // Delete existing rules and insert new ones (upsert by day_of_week)
  const { error: deleteError } = await supabase
    .from('booking_availability_rules')
    .delete()
    .eq('chef_id', user.entityId)

  if (deleteError) return { success: false, error: deleteError.message }

  if (validated.length > 0) {
    const { error: insertError } = await supabase.from('booking_availability_rules').insert(
      validated.map((r) => ({
        chef_id: user.entityId,
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time,
        is_available: r.is_available,
      }))
    )

    if (insertError) return { success: false, error: insertError.message }
  }

  revalidateTag('chef-booking-profile')
  return { success: true }
}

export async function getDateOverrides(): Promise<DateOverride[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('booking_date_overrides')
    .select('*')
    .eq('chef_id', user.entityId)
    .order('override_date', { ascending: true })

  if (error) {
    console.error('[getDateOverrides] Error:', error)
    return []
  }

  return (data ?? []) as DateOverride[]
}

export async function addDateOverride(
  input: z.infer<typeof DateOverrideSchema>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const validated = DateOverrideSchema.parse(input)
  const supabase: any = createServerClient()

  const { error } = await supabase.from('booking_date_overrides').insert({
    chef_id: user.entityId,
    override_date: validated.override_date,
    is_available: validated.is_available,
    start_time: validated.start_time || null,
    end_time: validated.end_time || null,
    reason: validated.reason?.trim() || null,
  })

  if (error) return { success: false, error: error.message }

  revalidateTag('chef-booking-profile')
  return { success: true }
}

export async function removeDateOverride(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('booking_date_overrides')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) return { success: false, error: error.message }

  revalidateTag('chef-booking-profile')
  return { success: true }
}

export async function getDailyCaps(): Promise<DailyCaps> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('booking_daily_caps')
    .select('max_per_day, max_per_week')
    .eq('chef_id', user.entityId)
    .single()

  return {
    max_per_day: data?.max_per_day ?? 2,
    max_per_week: data?.max_per_week ?? 10,
  }
}

export async function setDailyCaps(
  input: z.infer<typeof DailyCapsSchema>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const validated = DailyCapsSchema.parse(input)
  const supabase: any = createServerClient()

  const { error } = await supabase.from('booking_daily_caps').upsert(
    {
      chef_id: user.entityId,
      max_per_day: validated.max_per_day,
      max_per_week: validated.max_per_week,
    },
    { onConflict: 'chef_id' }
  )

  if (error) return { success: false, error: error.message }

  revalidateTag('chef-booking-profile')
  return { success: true }
}

// ---- Public Actions (no auth) ----

/**
 * Compute available time slots for a specific date and event type.
 * Considers: weekly availability rules, date overrides, existing events,
 * buffer times, daily caps, and minimum notice hours.
 */
export async function getAvailableSlots(
  chefId: string,
  date: string,
  eventTypeId: string
): Promise<TimeSlot[]> {
  const supabase = createAdminClient()

  // 1. Load event type for duration and buffer info
  const { data: eventType } = await supabase
    .from('booking_event_types')
    .select('duration_minutes, buffer_before_minutes, buffer_after_minutes, min_notice_hours')
    .eq('id', eventTypeId)
    .eq('chef_id', chefId)
    .eq('is_active', true)
    .single()

  if (!eventType) return []

  const durationMinutes = eventType.duration_minutes as number
  const bufferBefore = (eventType.buffer_before_minutes as number) || 0
  const bufferAfter = (eventType.buffer_after_minutes as number) || 0
  const minNoticeHours = (eventType.min_notice_hours as number) || 0

  // 2. Check min notice
  const now = new Date()
  const requestedDate = new Date(`${date}T00:00:00.000Z`)
  const hoursUntil = (requestedDate.getTime() - now.getTime()) / (1000 * 60 * 60)
  if (hoursUntil < minNoticeHours) return []

  // 3. Check date override first (takes priority over weekly rules)
  const { data: overrides } = await supabase
    .from('booking_date_overrides')
    .select('is_available, start_time, end_time')
    .eq('chef_id', chefId)
    .eq('override_date', date)

  const overrideList = (overrides ?? []) as Array<{
    is_available: boolean
    start_time: string | null
    end_time: string | null
  }>

  // If there's a "not available" override with no time range, the whole day is blocked
  const fullDayBlock = overrideList.find((o) => !o.is_available && !o.start_time && !o.end_time)
  if (fullDayBlock) return []

  // 4. Check manual availability blocks
  const { data: manualBlocks } = await supabase
    .from('chef_availability_blocks')
    .select('block_type')
    .eq('chef_id', chefId)
    .eq('block_date', date)

  const hasFullDayBlock = (manualBlocks ?? []).some((b: any) => b.block_type === 'full_day')
  if (hasFullDayBlock) return []

  // 5. Get the day's availability window
  const dayOfWeek = new Date(`${date}T12:00:00Z`).getUTCDay()
  let windowStart = '09:00'
  let windowEnd = '21:00'

  // If there's an "available" override with time range, use that
  const availOverride = overrideList.find((o) => o.is_available && o.start_time && o.end_time)

  if (availOverride) {
    windowStart = (availOverride.start_time as string).slice(0, 5)
    windowEnd = (availOverride.end_time as string).slice(0, 5)
  } else {
    // Fall back to weekly rule
    const { data: rule } = await supabase
      .from('booking_availability_rules')
      .select('start_time, end_time, is_available')
      .eq('chef_id', chefId)
      .eq('day_of_week', dayOfWeek)
      .single()

    if (rule) {
      if (!(rule.is_available as boolean)) return []
      windowStart = (rule.start_time as string).slice(0, 5)
      windowEnd = (rule.end_time as string).slice(0, 5)
    }
    // If no rule exists, use defaults (9am-9pm)
  }

  // 6. Check daily cap
  const { data: caps } = await supabase
    .from('booking_daily_caps')
    .select('max_per_day')
    .eq('chef_id', chefId)
    .single()

  const maxPerDay = (caps?.max_per_day as number) || 2

  const { data: existingEvents } = await supabase
    .from('events')
    .select('id, serve_time')
    .eq('tenant_id', chefId)
    .eq('event_date', date)
    .in('status', ['draft', 'proposed', 'accepted', 'paid', 'confirmed', 'in_progress'])

  const eventCount = (existingEvents ?? []).length
  if (eventCount >= maxPerDay) return []

  // 7. Generate time slots
  const slotInterval = 30 // minutes between slot starts
  const slots: TimeSlot[] = []

  const [startH, startM] = windowStart.split(':').map(Number)
  const [endH, endM] = windowEnd.split(':').map(Number)
  const windowStartMin = startH * 60 + startM
  const windowEndMin = endH * 60 + endM

  // Existing event times (for overlap detection)
  const busyRanges: Array<{ start: number; end: number }> = []
  for (const event of existingEvents ?? []) {
    const serveTime = event.serve_time as string
    if (!serveTime) continue
    const [h, m] = serveTime.split(':').map(Number)
    const eventStart = h * 60 + m
    // Assume 3hr service with buffers
    busyRanges.push({
      start: eventStart - bufferBefore,
      end: eventStart + 180 + bufferAfter,
    })
  }

  for (
    let slotStart = windowStartMin;
    slotStart + durationMinutes <= windowEndMin;
    slotStart += slotInterval
  ) {
    const slotEnd = slotStart + durationMinutes

    // Check if this slot (including buffers) overlaps with any existing event
    const slotWithBufferStart = slotStart - bufferBefore
    const slotWithBufferEnd = slotEnd + bufferAfter

    const hasConflict = busyRanges.some(
      (busy) => slotWithBufferStart < busy.end && slotWithBufferEnd > busy.start
    )

    if (!hasConflict) {
      const startStr = `${String(Math.floor(slotStart / 60)).padStart(2, '0')}:${String(slotStart % 60).padStart(2, '0')}`
      const endStr = `${String(Math.floor(slotEnd / 60)).padStart(2, '0')}:${String(slotEnd % 60).padStart(2, '0')}`
      slots.push({ start: startStr, end: endStr })
    }
  }

  return slots
}
