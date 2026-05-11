// Client Browse Dates Actions - Check chef availability for booking

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type AvailableDate = {
  date: string
  isBlocked: boolean
  blockType: 'full_day' | 'partial' | null
  hasEvent: boolean
}

export async function getChefAvailability(
  month: number,
  year: number
): Promise<{ dates: AvailableDate[]; chefName: string | null }> {
  const user = await requireClient()
  const db: any = createServerClient()

  // Get client's chef (tenant)
  const { data: client } = await db
    .from('clients')
    .select('tenant_id')
    .eq('id', user.entityId)
    .single()

  if (!client?.tenant_id) return { dates: [], chefName: null }

  const chefId = client.tenant_id

  // Get chef name
  const { data: chef } = await db.from('chefs').select('business_name').eq('id', chefId).single()

  // Build month date range
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)
  const startStr = startDate.toISOString().split('T')[0]
  const endStr = endDate.toISOString().split('T')[0]

  // Get blocked dates
  const { data: blocks } = await db
    .from('chef_availability_blocks')
    .select('block_date, block_type')
    .eq('chef_id', chefId)
    .gte('block_date', startStr)
    .lte('block_date', endStr)

  const blockMap = new Map<string, string>(
    (blocks ?? []).map((b: any) => [b.block_date, b.block_type])
  )

  // Get dates with existing events for this client
  const { data: events } = await db
    .from('events')
    .select('event_date')
    .eq('client_id', user.entityId)
    .gte('event_date', startStr)
    .lte('event_date', endStr)

  const eventDates = new Set((events ?? []).map((e: any) => e.event_date))

  // Build all days in month
  const dates: AvailableDate[] = []
  const current = new Date(startDate)
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0]
    const blockType = blockMap.get(dateStr) as 'full_day' | 'partial' | undefined
    dates.push({
      date: dateStr,
      isBlocked: !!blockType,
      blockType: blockType || null,
      hasEvent: eventDates.has(dateStr),
    })
    current.setDate(current.getDate() + 1)
  }

  return { dates, chefName: chef?.business_name || null }
}
