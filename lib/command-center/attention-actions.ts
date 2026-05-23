'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getAttentionItems, type AttentionItem } from './attention-aggregator'

// ---- Types ----

export type TodayEvent = {
  id: string
  occasion: string | null
  clientName: string | null
  guestCount: number | null
  startTime: string | null
  eventDate: string
}

export type WeekDay = {
  date: string
  dayName: string
  eventCount: number
  isToday: boolean
}

export type CommandCenterPayload = {
  attentionItems: AttentionItem[]
  todayEvents: TodayEvent[]
  todayRevenueCents: number
  weekDays: WeekDay[]
  metrics: {
    activeEvents: number
    openInquiries: number
    outstandingCents: number
  }
  chefFirstName: string
  greeting: string
}

// ---- Helpers ----

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

// ---- Main action ----

export async function getCommandCenterData(): Promise<CommandCenterPayload> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // Parallel fetch all data
  const [
    attentionItems,
    todayEventsResult,
    todayRevenueResult,
    activeEventsResult,
    openInquiriesResult,
    outstandingResult,
  ] = await Promise.all([
    getAttentionItems(tenantId).catch(() => [] as AttentionItem[]),

    // Today's events with details
    db
      .from('events')
      .select('id, occasion, event_date, start_time, guest_count, client:clients(full_name)')
      .eq('tenant_id', tenantId)
      .eq('event_date', today)
      .not('status', 'in', '(cancelled,completed)')
      .order('start_time', { ascending: true })
      .then(({ data }: any) => data || [])
      .catch(() => []),

    // Revenue expected today (from events today)
    db
      .from('events')
      .select('quoted_price_cents')
      .eq('tenant_id', tenantId)
      .eq('event_date', today)
      .not('status', 'in', '(cancelled,completed)')
      .then(({ data }: any) =>
        (data || []).reduce((sum: number, r: any) => sum + (r.quoted_price_cents || 0), 0)
      )
      .catch(() => 0),

    // Active events count
    db
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('status', 'in', '(cancelled,completed)')
      .then(({ count }: any) => count ?? 0)
      .catch(() => 0),

    // Open inquiries count
    db
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['new', 'awaiting_chef', 'awaiting_client'])
      .then(({ count }: any) => count ?? 0)
      .catch(() => 0),

    // Outstanding balance
    db
      .from('event_financial_summary')
      .select('outstanding_balance_cents')
      .eq('tenant_id', tenantId)
      .gt('outstanding_balance_cents', 0)
      .then(({ data }: any) =>
        (data || []).reduce((sum: number, r: any) => sum + (r.outstanding_balance_cents || 0), 0)
      )
      .catch(() => 0),
  ])

  // Build today's events list
  const todayEvents: TodayEvent[] = todayEventsResult.map((e: any) => ({
    id: e.id,
    occasion: e.occasion,
    clientName: e.client?.full_name || null,
    guestCount: e.guest_count,
    startTime: e.start_time,
    eventDate: e.event_date,
  }))

  // Build 7-day week horizon
  const weekDays: WeekDay[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() + i * 86400000)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    weekDays.push({
      date: dateStr,
      dayName: getDayName(d),
      eventCount: 0,
      isToday: i === 0,
    })
  }

  // Fetch event counts for the week
  const weekStart = weekDays[0].date
  const weekEnd = weekDays[6].date
  const weekEventsResult = await db
    .from('events')
    .select('event_date')
    .eq('tenant_id', tenantId)
    .gte('event_date', weekStart)
    .lte('event_date', weekEnd)
    .not('status', 'in', '(cancelled,completed)')
    .catch(() => ({ data: [] }))

  for (const evt of weekEventsResult?.data || []) {
    const day = weekDays.find((d: WeekDay) => d.date === evt.event_date)
    if (day) day.eventCount++
  }

  const firstName = (user.email ?? '').split('@')[0].split('.')[0]

  return {
    attentionItems,
    todayEvents,
    todayRevenueCents: todayRevenueResult,
    weekDays,
    metrics: {
      activeEvents: activeEventsResult,
      openInquiries: openInquiriesResult,
      outstandingCents: outstandingResult,
    },
    chefFirstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
    greeting: getGreeting(),
  }
}
