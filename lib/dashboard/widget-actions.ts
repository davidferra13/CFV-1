// Dashboard Widget Data Actions
// Server actions for the 7 new dashboard widgets.
// Each function is independently authenticated and safe to call in Promise.all.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { sendPaymentReminderEmail } from '@/lib/email/notifications'
import { dateToDateString } from '@/lib/utils/format'

function _liso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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
  const db: any = createServerClient()

  const { data: summaries } = await db
    .from('event_financial_summary')
    .select('event_id, outstanding_balance_cents')
    .eq('tenant_id', user.tenantId!)
    .gt('outstanding_balance_cents', 0)
    .limit(50)

  if (!summaries || summaries.length === 0) return []

  const eventIds = summaries.map((s: any) => s.event_id).filter(Boolean)

  const { data: events } = await db
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
  const db: any = createServerClient()

  const now = new Date()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + daysAhead)

  const { data: quotes } = await db
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
  const { data: events } = await db
    .from('events')
    .select('id, occasion, client:clients(id, full_name)')
    .in('id', eventIds)

  const eventMap = new Map(((events as any[]) || []).map((e: any) => [e.id, e]))

  return quotes.map((q: any) => {
    const event: any = eventMap.get(q.event_id)
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
  const db: any = createServerClient()

  const now = new Date()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + daysAhead)

  const { data: events } = await db
    .from('events')
    .select(
      'id, occasion, event_date, guest_count, dietary_notes, client:clients(id, full_name, dietary_restrictions, allergies)'
    )
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', _liso(now))
    .lte('event_date', _liso(cutoff))
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
  const db: any = createServerClient()

  const { data: clients } = await db
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
  const db: any = createServerClient()

  const now = new Date()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + daysAhead)

  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, status, client:clients(id, full_name)')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', _liso(now))
    .lte('event_date', _liso(cutoff))
    .in('status', ['accepted', 'paid', 'confirmed'])
    .order('event_date', { ascending: true })

  if (!events || events.length === 0) return []

  // Check which events have grocery lists
  const eventIds = events.map((e: any) => e.id)
  const { data: groceryLists } = await db
    .from('grocery_lists')
    .select('event_id')
    .in('event_id', eventIds)

  const eventsWithLists = new Set((groceryLists || []).map((g: any) => g.event_id))

  return events.map((e: any) => {
    const eventDate = new Date(dateToDateString(e.event_date as Date | string) + 'T00:00:00')
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
// Quick Expense Capture
// ============================================

export interface QuickExpenseResult {
  success: boolean
  message?: string
  expense?: {
    id: string
    description: string
    amountCents: number
    date: string
    category: string
  }
}

export async function quickCaptureExpense(data: {
  amountCents: number
  description: string
  category: string
  eventId?: string
}): Promise<QuickExpenseResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  const expenseDate = _liso(new Date())

  const { data: inserted, error } = await db
    .from('expenses')
    .insert({
      tenant_id: user.tenantId!,
      description: data.description,
      amount_cents: data.amountCents,
      category: data.category,
      event_id: data.eventId || null,
      expense_date: expenseDate,
      is_business: true,
      created_by: user.id,
    })
    .select('id, description, amount_cents, expense_date, category')
    .single()

  if (error) {
    console.error('[quickCaptureExpense] Insert error:', error)
    return { success: false, message: error.message }
  }

  const { revalidatePath } = await import('next/cache')
  revalidatePath('/dashboard')

  return {
    success: true,
    expense: {
      id: inserted.id,
      description: inserted.description,
      amountCents: inserted.amount_cents,
      date: inserted.expense_date,
      category: inserted.category,
    },
  }
}

export interface RecentExpenseItem {
  id: string
  description: string
  amountCents: number
  date: string
  category: string
}

export async function getRecentExpenses(limit = 3): Promise<RecentExpenseItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('expenses')
    .select('id, description, amount_cents, expense_date, category')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getRecentExpenses] Error:', error)
    return []
  }

  return (data || []).map((e: any) => ({
    id: e.id,
    description: e.description ?? '',
    amountCents: e.amount_cents ?? 0,
    date: e.expense_date ?? '',
    category: e.category ?? 'other',
  }))
}

export async function getUpcomingEventsForExpense(): Promise<
  Array<{ id: string; occasion: string; date: string }>
> {
  const user = await requireChef()
  const db: any = createServerClient()

  const today = _liso(new Date())

  const { data, error } = await db
    .from('events')
    .select('id, occasion, event_date')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', today)
    .not('status', 'in', '("draft","cancelled")')
    .order('event_date', { ascending: true })
    .limit(10)

  if (error) {
    console.error('[getUpcomingEventsForExpense] Error:', error)
    return []
  }

  return (data || []).map((e: any) => ({
    id: e.id,
    occasion: e.occasion || 'Untitled Event',
    date: e.event_date,
  }))
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

// ============================================
// 6a. Active Shopping List (grocery list items for upcoming events)
// ============================================

export interface ActiveShoppingItem {
  id: string
  name: string
  quantity: string
  category: string
  purchased: boolean
  eventOccasion: string
  eventId: string
  substituteNote?: string
}

export async function getActiveShoppingList(daysAhead = 5): Promise<{
  items: ActiveShoppingItem[]
  eventLabel: string
  consolidatedEvents: string[]
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const now = new Date()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + daysAhead)

  // Find upcoming events with grocery lists
  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, client:clients(full_name)')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', _liso(now))
    .lte('event_date', _liso(cutoff))
    .in('status', ['accepted', 'paid', 'confirmed'])
    .order('event_date', { ascending: true })

  if (!events || events.length === 0) {
    return { items: [], eventLabel: 'No upcoming events', consolidatedEvents: [] }
  }

  const eventIds = events.map((e: any) => e.id)
  const eventMap = new Map(events.map((e: any) => [e.id, e]))

  // Fetch grocery list items for these events
  const { data: groceryItems } = await db
    .from('grocery_list_items')
    .select(
      'id, name, quantity, category, purchased, substitute_note, grocery_list:grocery_lists!inner(event_id)'
    )
    .in('grocery_lists.event_id', eventIds)
    .order('category', { ascending: true })

  if (!groceryItems || groceryItems.length === 0) {
    return { items: [], eventLabel: 'No grocery lists', consolidatedEvents: [] }
  }

  const consolidatedEvents: string[] = []
  const seenEvents = new Set<string>()

  const items: ActiveShoppingItem[] = groceryItems.map((gi: any) => {
    const eventId = gi.grocery_list?.event_id ?? ''
    const event = eventMap.get(eventId) as any
    const occasion = event?.occasion || 'Untitled Event'
    if (!seenEvents.has(eventId)) {
      seenEvents.add(eventId)
      consolidatedEvents.push(occasion)
    }
    return {
      id: gi.id,
      name: gi.name ?? '',
      quantity: gi.quantity ?? '',
      category: gi.category ?? 'Other',
      purchased: gi.purchased ?? false,
      eventOccasion: occasion,
      eventId,
      substituteNote: gi.substitute_note ?? undefined,
    }
  })

  const eventLabel =
    consolidatedEvents.length === 1 ? consolidatedEvents[0] : `${consolidatedEvents.length} events`

  return { items, eventLabel, consolidatedEvents }
}

export async function toggleShoppingItem(itemId: string, purchased: boolean): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify the item belongs to a grocery list owned by this tenant
  const { data: item } = await db
    .from('grocery_list_items')
    .select('id, grocery_list:grocery_lists!inner(tenant_id)')
    .eq('id', itemId)
    .single()

  if (!item || (item as any).grocery_list?.tenant_id !== user.tenantId) {
    throw new Error('Item not found or unauthorized')
  }

  const { error } = await db.from('grocery_list_items').update({ purchased }).eq('id', itemId)

  if (error) {
    throw new Error('Failed to update shopping item')
  }
}

// ============================================
// 7. Quick Availability Check (booked + tentative dates, next 90 days)
// ============================================

export async function getBookedDates(): Promise<{ booked: string[]; tentative: string[] }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const now = new Date()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + 90)

  const nowStr = _liso(now)
  const cutoffStr = _liso(cutoff)

  // Booked = confirmed pipeline events
  const { data: bookedEvents } = await db
    .from('events')
    .select('event_date')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', nowStr)
    .lte('event_date', cutoffStr)
    .in('status', ['accepted', 'paid', 'confirmed', 'in_progress'])

  // Tentative = draft or proposed events
  const { data: tentativeEvents } = await db
    .from('events')
    .select('event_date')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', nowStr)
    .lte('event_date', cutoffStr)
    .in('status', ['draft', 'proposed'])

  const booked: string[] = Array.from(
    new Set((bookedEvents || []).map((e: any) => dateToDateString(e.event_date as Date | string)))
  )
  const tentative: string[] = Array.from(
    new Set(
      (tentativeEvents || []).map((e: any) => dateToDateString(e.event_date as Date | string))
    )
  )

  return { booked, tentative }
}

// ============================================
// 8. Unread Hub Messages
// ============================================

export async function getUnreadHubMessages(limit = 5): Promise<UnreadHubGroup[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get hub profile for this user
  const { data: profile } = await db
    .from('hub_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) return []

  // Get groups this user is a member of with their last_read_at
  const { data: memberships } = await db
    .from('hub_group_members')
    .select('group_id, last_read_at, group:hub_groups(id, name)')
    .eq('profile_id', profile.id)

  if (!memberships || memberships.length === 0) return []

  const results: UnreadHubGroup[] = []

  for (const m of memberships) {
    const group = m.group as any
    if (!group) continue

    // Count messages after last_read_at
    let query = db
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

// ============================================
// 7. Invoice Pulse
// ============================================

export interface InvoicePulseData {
  invoices: Array<{
    id: string
    clientName: string
    amountCents: number
    status: 'draft' | 'sent' | 'overdue' | 'paid' | 'void'
    sentAt: string | null
    dueDate: string | null
    eventOccasion: string
  }>
  monthlyStats: {
    totalSentCents: number
    totalPaidCents: number
    collectionRate: number
  }
}

export async function getInvoicePulse(): Promise<InvoicePulseData> {
  const user = await requireChef()
  const db: any = createServerClient()

  const now = new Date()
  const monthStart = _liso(new Date(now.getFullYear(), now.getMonth(), 1))
  const monthEnd = _liso(new Date(now.getFullYear(), now.getMonth() + 1, 0))

  // Get all events with financial summaries (non-void, non-draft)
  const { data: summaries } = await db
    .from('event_financial_summary')
    .select(
      'event_id, quoted_price_cents, total_paid_cents, outstanding_balance_cents, payment_status'
    )
    .eq('tenant_id', user.tenantId!)
    .gt('quoted_price_cents', 0)

  if (!summaries || summaries.length === 0) {
    return {
      invoices: [],
      monthlyStats: { totalSentCents: 0, totalPaidCents: 0, collectionRate: 0 },
    }
  }

  const eventIds = summaries.map((s: any) => s.event_id).filter(Boolean)

  // Get events with their quotes and clients
  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, status, client:clients(id, full_name, email)')
    .eq('tenant_id', user.tenantId!)
    .in('id', eventIds)
    .not('status', 'in', '("draft","cancelled")')
    .limit(10)

  // Get quotes for sent_at dates
  const { data: quotes } = await db
    .from('quotes')
    .select('event_id, sent_at, valid_until, status')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', eventIds)
    .in('status', ['sent', 'accepted'])
    .order('created_at', { ascending: false })

  const quoteMap = new Map<string, any>()
  for (const q of quotes || []) {
    if (!quoteMap.has(q.event_id)) {
      quoteMap.set(q.event_id, q)
    }
  }

  const invoices: InvoicePulseData['invoices'] = []

  for (const e of events || []) {
    const fin = summaries.find((s: any) => s.event_id === e.id)
    if (!fin) continue

    const quote = quoteMap.get(e.id)
    const outstandingCents = fin.outstanding_balance_cents ?? 0

    // Determine invoice status
    let status: 'draft' | 'sent' | 'overdue' | 'paid' | 'void' = 'sent'
    const paymentStatus = fin.payment_status as string

    if (paymentStatus === 'paid') {
      status = 'paid'
    } else if (outstandingCents > 0) {
      // Check if overdue: past the valid_until date of the quote or past the event date
      const dueDate = quote?.valid_until || e.event_date
      if (dueDate && new Date(dueDate) < now) {
        status = 'overdue'
      } else {
        status = 'sent'
      }
    }

    invoices.push({
      id: e.id,
      clientName: e.client?.full_name ?? 'Unknown',
      amountCents: outstandingCents > 0 ? outstandingCents : (fin.quoted_price_cents ?? 0),
      status,
      sentAt: quote?.sent_at ?? null,
      dueDate: quote?.valid_until ?? e.event_date ?? null,
      eventOccasion: e.occasion || 'Untitled Event',
    })
  }

  // Monthly stats: events with quotes sent this month
  const { data: monthQuotes } = await db
    .from('quotes')
    .select('event_id, total_quoted_cents, status')
    .eq('tenant_id', user.tenantId!)
    .gte('sent_at', monthStart)
    .lte('sent_at', monthEnd + 'T23:59:59')
    .not('sent_at', 'is', null)

  let totalSentCents = 0
  let totalPaidCents = 0

  const monthEventIds = (monthQuotes || []).map((q: any) => q.event_id).filter(Boolean)
  totalSentCents = (monthQuotes || []).reduce(
    (sum: number, q: any) => sum + (q.total_quoted_cents ?? 0),
    0
  )

  if (monthEventIds.length > 0) {
    const { data: monthFinancials } = await db
      .from('event_financial_summary')
      .select('event_id, total_paid_cents')
      .eq('tenant_id', user.tenantId!)
      .in('event_id', monthEventIds)

    totalPaidCents = (monthFinancials || []).reduce(
      (sum: number, f: any) => sum + (f.total_paid_cents ?? 0),
      0
    )
  }

  const collectionRate =
    totalSentCents > 0 ? Math.round((totalPaidCents / totalSentCents) * 100) : 0

  return {
    invoices,
    monthlyStats: { totalSentCents, totalPaidCents, collectionRate },
  }
}

export async function sendInvoiceReminder(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get event + client details
  const { data: event, error: eventErr } = await db
    .from('events')
    .select('id, occasion, event_date, status, client:clients(id, full_name, email)')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventErr || !event) {
    return { success: false, error: 'Event not found' }
  }

  const clientEmail = event.client?.email
  if (!clientEmail) {
    return { success: false, error: 'Client has no email address' }
  }

  // Get outstanding balance
  const { data: fin } = await db
    .from('event_financial_summary')
    .select('outstanding_balance_cents, quoted_price_cents')
    .eq('event_id', eventId)
    .single()

  const outstandingCents = fin?.outstanding_balance_cents ?? fin?.quoted_price_cents ?? 0

  // Get chef name
  const { data: chef } = await db
    .from('chefs')
    .select('business_name, full_name')
    .eq('id', user.tenantId!)
    .single()

  const chefName = chef?.business_name || chef?.full_name || 'Your Chef'
  const eventDate = event.event_date ?? ''
  const daysUntilEvent = eventDate
    ? Math.max(0, Math.ceil((new Date(eventDate).getTime() - Date.now()) / 86400000))
    : 0

  try {
    await sendPaymentReminderEmail({
      clientEmail,
      clientName: event.client?.full_name ?? 'Client',
      chefName,
      occasion: event.occasion || 'Your event',
      eventDate,
      daysUntilEvent,
      amountDueCents: outstandingCents,
      depositAmountCents: null,
      eventId,
    })
  } catch (err) {
    console.error('[sendInvoiceReminder] Email send failed:', err)
    return { success: false, error: 'Failed to send reminder email' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
