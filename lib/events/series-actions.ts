'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ─── Types ──────────────────────────────────────────────────────────

export type EventSeries = {
  id: string
  tenant_id: string
  client_id: string | null
  name: string
  description: string | null
  service_mode: string
  status: string
  start_date: string | null
  end_date: string | null
  base_guest_count: number | null
  quoted_total_cents: number | null
  deposit_total_cents: number | null
  recurrence_rule: Record<string, unknown> | null
  created_at: string
  updated_at: string
  // Computed
  event_count?: number
}

export type SeriesWithEvents = EventSeries & {
  events: Array<{
    id: string
    occasion: string | null
    event_date: string | null
    status: string | null
    guest_count: number | null
  }>
}

// ─── Schemas ────────────────────────────────────────────────────────

const CreateSeriesSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  serviceMode: z.enum(['one_time', 'recurring', 'multi_day', 'package']).default('one_time'),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  baseGuestCount: z.number().int().positive().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
})

const UpdateSeriesSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(['active', 'paused', 'completed', 'cancelled']).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  baseGuestCount: z.number().int().positive().optional().nullable(),
})

// ─── CRUD ───────────────────────────────────────────────────────────

export async function createEventSeries(
  input: z.infer<typeof CreateSeriesSchema>
): Promise<EventSeries> {
  const user = await requireChef()
  const validated = CreateSeriesSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_series')
    .insert({
      tenant_id: user.tenantId!,
      created_by: user.id,
      name: validated.name,
      description: validated.description ?? null,
      service_mode: validated.serviceMode,
      status: 'active',
      start_date: validated.startDate ?? null,
      end_date: validated.endDate ?? null,
      base_guest_count: validated.baseGuestCount ?? null,
      client_id: validated.clientId ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create series: ${error.message}`)

  revalidatePath('/events/series')
  return data as EventSeries
}

export async function updateEventSeries(
  input: z.infer<typeof UpdateSeriesSchema>
): Promise<EventSeries> {
  const user = await requireChef()
  const validated = UpdateSeriesSchema.parse(input)
  const db: any = createServerClient()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (validated.name !== undefined) updates.name = validated.name
  if (validated.description !== undefined) updates.description = validated.description
  if (validated.status !== undefined) updates.status = validated.status
  if (validated.startDate !== undefined) updates.start_date = validated.startDate
  if (validated.endDate !== undefined) updates.end_date = validated.endDate
  if (validated.baseGuestCount !== undefined) updates.base_guest_count = validated.baseGuestCount

  const { data, error } = await db
    .from('event_series')
    .update(updates)
    .eq('id', validated.id)
    .eq('tenant_id', user.tenantId!)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update series: ${error.message}`)

  revalidatePath('/events/series')
  return data as EventSeries
}

export async function getEventSeriesList(): Promise<EventSeries[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: series, error } = await db
    .from('event_series')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load series: ${error.message}`)

  // Get event counts per series
  const seriesIds = (series ?? []).map((s: any) => s.id)
  if (seriesIds.length === 0) return []

  const { data: eventCounts } = await db
    .from('events')
    .select('event_series_id')
    .in('event_series_id', seriesIds)
    .eq('tenant_id', user.tenantId!)

  const countMap = new Map<string, number>()
  for (const row of eventCounts ?? []) {
    const sid = row.event_series_id
    countMap.set(sid, (countMap.get(sid) ?? 0) + 1)
  }

  return (series ?? []).map((s: any) => ({
    ...s,
    event_count: countMap.get(s.id) ?? 0,
  })) as EventSeries[]
}

export async function getEventSeriesDetail(seriesId: string): Promise<SeriesWithEvents | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: series } = await db
    .from('event_series')
    .select('*')
    .eq('id', seriesId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!series) return null

  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, status, guest_count')
    .eq('event_series_id', seriesId)
    .eq('tenant_id', user.tenantId!)
    .order('event_date', { ascending: true })

  return {
    ...series,
    events: events ?? [],
  } as SeriesWithEvents
}

export async function getActiveSeriesOptions(): Promise<
  Array<{ id: string; name: string; event_count: number }>
> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('event_series')
    .select('id, name')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'active')
    .order('name', { ascending: true })

  if (!data || data.length === 0) return []

  const seriesIds = data.map((s: any) => s.id)
  const { data: eventCounts } = await db
    .from('events')
    .select('event_series_id')
    .in('event_series_id', seriesIds)

  const countMap = new Map<string, number>()
  for (const row of eventCounts ?? []) {
    countMap.set(row.event_series_id, (countMap.get(row.event_series_id) ?? 0) + 1)
  }

  return data.map((s: any) => ({
    id: s.id,
    name: s.name,
    event_count: countMap.get(s.id) ?? 0,
  }))
}

export async function linkEventToSeries(input: {
  eventId: string
  seriesId: string | null
}): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  await db
    .from('events')
    .update({ event_series_id: input.seriesId })
    .eq('id', input.eventId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath(`/events/${input.eventId}`)
  revalidatePath('/events/series')
}
