'use server'

// Client-Facing Intelligence - Event Recap, Menu Explanation
// PRIVACY: Handles client/event data → local Ollama only.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ============================================
// 1. EVENT RECAP SUMMARY (pure DB - no Ollama)
// ============================================

export interface EventRecapResult {
  eventName: string
  clientName: string
  date: string | null
  guestCount: number
  status: string
  menuItems: string[]
  financials: {
    quotedCents: number
    paidCents: number
    outstandingCents: number
  }
  summary: string
}

export async function getEventRecap(eventName: string): Promise<EventRecapResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Find event
  const { data: events } = await db
    .from('events')
    .select(
      'id, occasion, event_date, guest_count, status, quoted_price_cents, client:clients(full_name)'
    )
    .eq('tenant_id', user.tenantId!)
    .ilike('occasion', `%${eventName}%`)
    .order('event_date', { ascending: false })
    .limit(1)

  if (!events || events.length === 0) {
    return {
      eventName,
      clientName: '',
      date: null,
      guestCount: 0,
      status: '',
      menuItems: [],
      financials: { quotedCents: 0, paidCents: 0, outstandingCents: 0 },
      summary: `No event found matching "${eventName}".`,
    }
  }

  const event = events[0] as any
  const clientName = event.client?.full_name ?? 'Unknown'

  // Load menu items
  const { data: menuItems } = await (db
    .from('menu_items' as any)
    .select('name')
    .eq('event_id', event.id) as any)

  // Load payments
  const { data: payments } = await db
    .from('ledger_entries')
    .select('amount_cents')
    .eq('tenant_id', user.tenantId!)
    .eq('event_id', event.id)
    .eq('entry_type', 'payment')

  const paidCents = (payments ?? []).reduce((sum: number, p: any) => sum + (p.amount_cents ?? 0), 0)
  const quotedCents = event.quoted_price_cents ?? 0
  const outstandingCents = Math.max(0, quotedCents - paidCents)

  const items = (menuItems ?? []).map((m: any) => m.name).filter(Boolean)

  return {
    eventName: event.occasion ?? eventName,
    clientName,
    date: event.event_date,
    guestCount: event.guest_count ?? 0,
    status: event.status,
    menuItems: items,
    financials: { quotedCents, paidCents, outstandingCents },
    summary: `"${event.occasion ?? eventName}" for ${clientName} on ${event.event_date ?? '(no date)'} - ${event.guest_count ?? '?'} guests, ${event.status}. ${items.length > 0 ? `Menu: ${items.join(', ')}.` : 'No menu items yet.'} Quoted: $${(quotedCents / 100).toFixed(2)}, Paid: $${(paidCents / 100).toFixed(2)}${outstandingCents > 0 ? `, Outstanding: $${(outstandingCents / 100).toFixed(2)}` : ''}.`,
  }
}

// ============================================
// 2. MENU EXPLANATION (pure DB - no Ollama)
// ============================================

export interface MenuExplanationResult {
  menuName: string
  eventName: string | null
  courses: Array<{
    name: string
    description: string | null
    dietaryTags: string[]
  }>
  summary: string
}

export async function explainMenu(menuName: string): Promise<MenuExplanationResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Find menu
  const { data: menus } = await db
    .from('menus')
    .select('id, name, event_id')
    .eq('tenant_id', user.tenantId!)
    .ilike('name', `%${menuName}%`)
    .limit(1)

  if (!menus || menus.length === 0) {
    return {
      menuName,
      eventName: null,
      courses: [],
      summary: `No menu found matching "${menuName}".`,
    }
  }

  const menu = menus[0]

  // Get event name if linked
  let eventName: string | null = null
  if (menu.event_id) {
    const { data: event } = await db
      .from('events')
      .select('occasion')
      .eq('id', menu.event_id)
      .single()
    eventName = event?.occasion ?? null
  }

  // Load menu items
  const { data: items } = await (db
    .from('menu_items' as any)
    .select('name, description, course, dietary_tags')
    .eq('menu_id', menu.id)
    .order('sort_order', { ascending: true }) as any)

  const courses = (items ?? []).map((item: any) => ({
    name: item.name ?? 'Unnamed',
    description: item.description ?? null,
    dietaryTags: item.dietary_tags ?? [],
  }))

  return {
    menuName: menu.name,
    eventName,
    courses,
    summary:
      courses.length > 0
        ? `"${menu.name}"${eventName ? ` (for ${eventName})` : ''}: ${courses.length} items. ${courses.map((c: any) => c.name).join(', ')}.`
        : `"${menu.name}" has no items yet.`,
  }
}
