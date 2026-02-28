import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { detectOverlaps, type TimeRange } from './overlap-detection'

const TimeBlockSchema = z
  .object({
    title: z.string().min(1),
    startAt: z.string(),
    endAt: z.string(),
    blockType: z.enum(['prep', 'travel', 'personal', 'admin', 'hold']).default('personal'),
    notes: z.string().max(1000).optional(),
  })
  .refine((value) => Date.parse(value.endAt) > Date.parse(value.startAt), {
    message: 'End time must be after start time',
    path: ['endAt'],
  })

export type TimeBlock = {
  id: string
  tenant_id: string
  title: string
  start_at: string
  end_at: string
  block_type: 'prep' | 'travel' | 'personal' | 'admin' | 'hold'
  notes: string | null
  created_at: string
}

type AvailabilityWindow = {
  startAt: string
  endAt: string
}

function isMissingRelation(error: any): boolean {
  return error?.code === '42P01'
}

function mergeBusyRanges(ranges: TimeRange[]): TimeRange[] {
  if (ranges.length === 0) return []
  const sorted = [...ranges].sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
  const merged: TimeRange[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]
    const last = merged[merged.length - 1]
    if (Date.parse(current.startAt) <= Date.parse(last.endAt)) {
      if (Date.parse(current.endAt) > Date.parse(last.endAt)) {
        last.endAt = current.endAt
      }
    } else {
      merged.push({ ...current })
    }
  }

  return merged
}

function buildWorkdayWindow(date: string): { startAt: string; endAt: string } {
  return {
    startAt: `${date}T08:00:00`,
    endAt: `${date}T20:00:00`,
  }
}

export async function listTimeBlocks(rangeStart: string, rangeEnd: string): Promise<TimeBlock[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('time_blocks' as any)
    .select('id, tenant_id, title, start_at, end_at, block_type, notes, created_at')
    .eq('tenant_id', user.tenantId!)
    .gte('start_at', `${rangeStart}T00:00:00`)
    .lte('end_at', `${rangeEnd}T23:59:59`)
    .order('start_at', { ascending: true })

  if (error) {
    if (isMissingRelation(error)) return []
    throw new Error(`Failed to load time blocks: ${error.message}`)
  }

  return (data || []) as TimeBlock[]
}

export async function createTimeBlock(input: z.infer<typeof TimeBlockSchema>) {
  const user = await requireChef()
  const validated = TimeBlockSchema.parse(input)
  const supabase: any = createServerClient()

  const date = validated.startAt.slice(0, 10)
  const existing = await listTimeBlocks(date, date)
  const existingRanges: TimeRange[] = existing.map((item) => ({
    id: item.id,
    source: item.title,
    startAt: item.start_at,
    endAt: item.end_at,
  }))
  const newRange: TimeRange = {
    source: 'new',
    startAt: validated.startAt,
    endAt: validated.endAt,
  }

  const overlaps = detectOverlaps([...existingRanges, newRange])

  if (overlaps.some((pair) => pair.first.source === 'new' || pair.second.source === 'new')) {
    throw new Error('Time block overlaps an existing block')
  }

  const { data, error } = await supabase
    .from('time_blocks' as any)
    .insert({
      tenant_id: user.tenantId!,
      title: validated.title,
      start_at: validated.startAt,
      end_at: validated.endAt,
      block_type: validated.blockType,
      notes: validated.notes || null,
      created_by: user.id,
    })
    .select('id, tenant_id, title, start_at, end_at, block_type, notes, created_at')
    .single()

  if (error || !data) {
    throw new Error(`Failed to create time block: ${error?.message || 'Unknown error'}`)
  }

  revalidatePath('/schedule')
  revalidatePath('/scheduling')
  return data as TimeBlock
}

export async function deleteTimeBlock(timeBlockId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('time_blocks' as any)
    .delete()
    .eq('id', timeBlockId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    throw new Error(`Failed to delete time block: ${error.message}`)
  }

  revalidatePath('/schedule')
  revalidatePath('/scheduling')
  return { success: true }
}

export async function getSchedulingAvailability(date: string): Promise<{
  date: string
  windows: AvailabilityWindow[]
  busy: TimeRange[]
  overlaps: ReturnType<typeof detectOverlaps>
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const dayStart = `${date}T00:00:00`
  const dayEnd = `${date}T23:59:59`

  const [timeBlocksResult, eventsResult] = await Promise.all([
    supabase
      .from('time_blocks' as any)
      .select('id, title, start_at, end_at')
      .eq('tenant_id', user.tenantId!)
      .gte('start_at', dayStart)
      .lte('end_at', dayEnd),
    supabase
      .from('events')
      .select('id, occasion, event_date, serve_time, arrival_time, status')
      .eq('tenant_id', user.tenantId!)
      .eq('event_date', date)
      .not('status', 'in', '("cancelled")'),
  ])

  if (eventsResult.error) {
    throw new Error(`Failed to load events for availability: ${eventsResult.error.message}`)
  }
  if (timeBlocksResult.error && !isMissingRelation(timeBlocksResult.error)) {
    throw new Error(
      `Failed to load time blocks for availability: ${timeBlocksResult.error.message}`
    )
  }

  const blockRanges: TimeRange[] = ((timeBlocksResult.data || []) as Array<any>).map((block) => ({
    id: block.id,
    source: `time_block:${block.title}`,
    startAt: block.start_at,
    endAt: block.end_at,
  }))

  const eventRanges: TimeRange[] = ((eventsResult.data || []) as Array<any>).map((event) => {
    const serveTime = event.serve_time || '18:00'
    const arrivalTime = event.arrival_time || serveTime
    const startAt = `${date}T${arrivalTime}:00`
    const endDate = new Date(`${date}T${serveTime}:00`)
    endDate.setHours(endDate.getHours() + 3)
    return {
      id: event.id,
      source: `event:${event.occasion || 'Event'}`,
      startAt,
      endAt: endDate.toISOString().slice(0, 19),
    }
  })

  const busy = mergeBusyRanges([...blockRanges, ...eventRanges])
  const overlaps = detectOverlaps([...blockRanges, ...eventRanges])
  const workday = buildWorkdayWindow(date)
  const windows: AvailabilityWindow[] = []

  let cursor = workday.startAt
  for (const range of busy) {
    if (Date.parse(range.endAt) <= Date.parse(workday.startAt)) continue
    if (Date.parse(range.startAt) >= Date.parse(workday.endAt)) continue
    const clampedStart =
      Date.parse(range.startAt) < Date.parse(workday.startAt) ? workday.startAt : range.startAt
    const clampedEnd =
      Date.parse(range.endAt) > Date.parse(workday.endAt) ? workday.endAt : range.endAt
    if (Date.parse(clampedStart) > Date.parse(cursor)) {
      windows.push({ startAt: cursor, endAt: clampedStart })
    }
    if (Date.parse(clampedEnd) > Date.parse(cursor)) {
      cursor = clampedEnd
    }
  }

  if (Date.parse(cursor) < Date.parse(workday.endAt)) {
    windows.push({ startAt: cursor, endAt: workday.endAt })
  }

  return {
    date,
    windows,
    busy,
    overlaps,
  }
}
