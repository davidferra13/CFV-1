// Dashboard Widget Data Actions
// Server actions for the 7 new dashboard widgets.
// Each function is independently authenticated and safe to call in Promise.all.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ============================================
// 1. Upcoming Payments Due
// ============================================

export interface PaymentDueItem {
  eventId: string
  occasion: string
  eventDate: string
  clientName: string
  clientId: string
  outstandingCents: number
  status: string
}

export async function getUpcomingPaymentsDue(limit = 5): Promise<PaymentDueItem[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: summaries } = await supabase
    .from('event_financial_summary')
    .select('event_id, outstanding_balance_cents')
    .eq('tenant_id', user.tenantId!)
    .gt('outstanding_balance_cents', 0)

  if (!summaries || summaries.length === 0) return []

  const eventIds = summaries.map((s: any) => s.event_id).filter(Boolean)

  const { data: events } = await supabase
    .from('events')
    .select('id, occasion, event_date, status, client:clients(id, full_name)')
    .eq('tenant_id', user.tenantId!)
    .in('id', eventIds)
    .not('status', 'in', '("draft","cancelled")')
    .order('event_date', { ascending: true })
    .limit(limit)

  return (events || []).map((e: any) => {
    const fin = summaries.find((s: any) => s.event_id === e.id)
    return {
      eventId: e.id,
      occasion: e.occasion || 'Untitled Event',
      eventDate: e.event_date,
      clientName: e.client?.full_name ?? 'Unknown',
      clientId: e.client?.id ?? '',
      outstandingCents: fin?.outstanding_balance_cents ?? 0,
      status: e.status,
    }
  })
}

// ============================================
// 2. Expiring Quotes
// ============================================

export interface ExpiringQuote {
  quoteId: string
  eventId: string
  occasion: string
  clientName: string
  clientId: string
  validUntil: string
  daysLeft: number
  totalCents: number
}

export async function getExpiringQuotes(daysAhead = 7): Promise<ExpiringQuote[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const now = new Date()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + daysAhead)

  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, event_id, valid_until, total_cents')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'sent')
    .lte('valid_until', cutoff.toISOString())
    .gte('valid_until', now.toISOString())
    .order('valid_until', { ascending: true })
    .limit(10)

  if (!quotes || quotes.length === 0) return []

  const eventIds = quotes.map((q: any) => q.event_id).filter(Boolean)
  const { data: events } = await supabase
    .from('events')
    .select('id, occasion, client:clients(id, full_name)')
    .in('id', eventIds)

  const eventMap = new Map((events || []).map((e: any) => [e.id, e]))

  return quotes.map((q: any) => {
    const event = eventMap.get(q.event_id)
    const validDate = new Date(q.valid_until)
    const daysLeft = Math.max(
      0,
      Math.ceil((validDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    )
    return {
      quoteId: q.id,
      eventId: q.event_id,
      occasion: event?.occasion || 'Untitled Event',
      clientName: event?.client?.full_name ?? 'Unknown',
      clientId: event?.client?.id ?? '',
      validUntil: q.valid_until,
      daysLeft,
      totalCents: q.total_cents ?? 0,
    }
  })
}

// ============================================
// 3. Dietary/Allergy Alert Summary (next 7 days)
// ============================================

export interface DietaryAlertItem {
  eventId: string
  occasion: string
  eventDate: string
  clientName: string
  guestCount: number
  allergies: string[]
  restrictions: string[]
  dietaryNotes: string | null
}

export async function getDietaryAlertSummary(daysAhead = 7): Promise<DietaryAlertItem[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const now = new Date()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + daysAhead)

  const { data: events } = await supabase
    .from('events')
    .select(
      'id, occasion, event_date, guest_count, dietary_notes, client:clients(id, full_name, dietary_restrictions, allergies)'
    )
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', now.toISOString().split('T')[0])
    .lte('event_date', cutoff.toISOString().split('T')[0])
    .in('status', ['accepted', 'paid', 'confirmed', 'in_progress'])
    .order('event_date', { ascending: true })

  if (!events || events.length === 0) return []

  const results: DietaryAlertItem[] = []

  for (const e of events) {
    const client = e.client as any
    const allergies: string[] = []
    const restrictions: string[] = []

    if (client?.allergies) {
      const raw = Array.isArray(client.allergies) ? client.allergies : [client.allergies]
      allergies.push(...raw.filter(Boolean))
    }
    if (client?.dietary_restrictions) {
      const raw = Array.isArray(client.dietary_restrictions)
        ? client.dietary_restrictions
        : [client.dietary_restrictions]
      restrictions.push(...raw.filter(Boolean))
    }

    // Only include events that have dietary info worth alerting
    if (allergies.length > 0 || restrictions.length > 0 || e.dietary_notes) {
      results.push({
        eventId: e.id,
        occasion: e.occasion || 'Untitled Event',
        eventDate: e.event_date,
        clientName: client?.full_name ?? 'Unknown',
        guestCount: e.guest_count ?? 0,
        allergies,
        restrictions,
        dietaryNotes: e.dietary_notes,
      })
    }
  }

  return results
}

// ============================================
// 4. Client Birthdays/Anniversaries (next 14 days)
// ============================================

export interface UpcomingBirthday {
  clientId: string
  clientName: string
  milestone: string
  daysUntil: number
}

export async function getUpcomingBirthdays(daysAhead = 14): Promise<UpcomingBirthday[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, personal_milestones')
    .eq('tenant_id', user.tenantId!)
    .not('personal_milestones', 'is', null)

  if (!clients || clients.length === 0) return []

  const today = new Date()
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() + daysAhead)
  const results: UpcomingBirthday[] = []

  const months: [string, number][] = [
    ['january', 1],
    ['february', 2],
    ['march', 3],
    ['april', 4],
    ['may', 5],
    ['june', 6],
    ['july', 7],
    ['august', 8],
    ['september', 9],
    ['october', 10],
    ['november', 11],
    ['december', 12],
  ]

  for (const c of clients) {
    const raw = c.personal_milestones
    const text = (Array.isArray(raw) ? raw.join(' ') : String(raw ?? '')).toLowerCase()
    if (!text.trim()) continue

    for (const [monthName, monthNum] of months) {
      const regex = new RegExp(`${monthName}\\s+(\\d{1,2})`, 'gi')
      let match
      while ((match = regex.exec(text)) !== null) {
        const day = parseInt(match[1], 10)
        if (day < 1 || day > 31) continue

        // Build date for this year
        const thisYear = new Date(today.getFullYear(), monthNum - 1, day)
        // If date already passed this year, try next year
        const candidate =
          thisYear < today ? new Date(today.getFullYear() + 1, monthNum - 1, day) : thisYear

        const daysUntil = Math.ceil((candidate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        if (daysUntil >= 0 && daysUntil <= daysAhead) {
          results.push({
            clientId: c.id,
            clientName: c.full_name ?? 'Unknown',
            milestone: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${day}`,
            daysUntil,
          })
        }
      }
    }
  }

  return results.sort((a, b) => a.daysUntil - b.daysUntil)
}

// ============================================
// 5. Shopping Window (events in next 3 days without grocery lists)
// ============================================

export interface ShoppingWindowItem {
  eventId: string
  occasion: string
  eventDate: string
  clientName: string
  daysUntil: number
  hasGroceryList: boolean
  status: string
}

export async function getShoppingWindowItems(daysAhead = 3): Promise<ShoppingWindowItem[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const now = new Date()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + daysAhead)

  const { data: events } = await supabase
    .from('events')
    .select('id, occasion, event_date, status, client:clients(id, full_name)')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', now.toISOString().split('T')[0])
    .lte('event_date', cutoff.toISOString().split('T')[0])
    .in('status', ['accepted', 'paid', 'confirmed'])
    .order('event_date', { ascending: true })

  if (!events || events.length === 0) return []

  // Check which events have grocery lists
  const eventIds = events.map((e: any) => e.id)
  const { data: groceryLists } = await supabase
    .from('grocery_lists')
    .select('event_id')
    .in('event_id', eventIds)

  const eventsWithLists = new Set((groceryLists || []).map((g: any) => g.event_id))

  return events.map((e: any) => {
    const eventDate = new Date(e.event_date + 'T00:00:00')
    const daysUntil = Math.max(
      0,
      Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    )
    return {
      eventId: e.id,
      occasion: e.occasion || 'Untitled Event',
      eventDate: e.event_date,
      clientName: e.client?.full_name ?? 'Unknown',
      daysUntil,
      hasGroceryList: eventsWithLists.has(e.id),
      status: e.status,
    }
  })
}

// ============================================
// 6. Unread Hub Messages
// ============================================

export interface UnreadHubGroup {
  groupId: string
  groupName: string
  unreadCount: number
  lastMessageAt: string
  lastMessagePreview: string
}

export async function getUnreadHubMessages(limit = 5): Promise<UnreadHubGroup[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get hub profile for this user
  const { data: profile } = await supabase
    .from('hub_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) return []

  // Get groups this user is a member of with their last_read_at
  const { data: memberships } = await supabase
    .from('hub_group_members')
    .select('group_id, last_read_at, group:hub_groups(id, name)')
    .eq('profile_id', profile.id)

  if (!memberships || memberships.length === 0) return []

  const results: UnreadHubGroup[] = []

  for (const m of memberships) {
    const group = m.group as any
    if (!group) continue

    // Count messages after last_read_at
    let query = supabase
      .from('hub_group_messages')
      .select('id, content, created_at', { count: 'exact' })
      .eq('group_id', m.group_id)
      .neq('sender_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (m.last_read_at) {
      query = query.gt('created_at', m.last_read_at)
    }

    const { data: messages, count } = await query

    if (count && count > 0) {
      const latest = messages?.[0]
      results.push({
        groupId: m.group_id,
        groupName: group.name ?? 'Unnamed Group',
        unreadCount: count,
        lastMessageAt: latest?.created_at ?? '',
        lastMessagePreview: (latest?.content ?? '').slice(0, 80),
      })
    }
  }

  return results
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
    .slice(0, limit)
}
