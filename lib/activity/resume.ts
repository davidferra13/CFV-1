// "Pick Up Where You Left Off" resume logic.
// Computes in-progress items by querying existing operational tables.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import type { ResumeItem } from './chef-types'

type SupabaseClient = any

type EventRow = {
  id: string
  status: string
  occasion: string | null
  event_date: string | null
  guest_count: number | null
  updated_at: string
  clients: { full_name: string } | null
}

type MenuRow = {
  id: string
  name: string | null
  status: string
  updated_at: string
  events: { occasion: string | null; clients: { full_name: string } | null } | null
}

type InquiryRow = {
  id: string
  status: string
  channel: string
  confirmed_occasion: string | null
  next_action_required: string | null
  next_action_by: string | null
  follow_up_due_at: string | null
  updated_at: string
  clients: { full_name: string } | null
}

type QuoteRow = {
  id: string
  status: string
  quote_name: string | null
  total_quoted_cents: number | null
  valid_until: string | null
  updated_at: string
  clients: { full_name: string } | null
  events: { occasion: string | null } | null
}

type NoteRow = {
  id: string
  client_id: string
  note_text: string
  category: string
  pinned: boolean
  created_at: string
  clients: { full_name: string } | null
}

export async function getResumeItems(): Promise<ResumeItem[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const [events, menus, inquiries, quotes, recentNotes] = await Promise.all([
    getActiveEvents(supabase, tenantId),
    getActiveMenus(supabase, tenantId),
    getActiveInquiries(supabase, tenantId),
    getActiveQuotes(supabase, tenantId),
    getRecentPinnedNotes(supabase, tenantId),
  ])

  const items = [...events, ...menus, ...inquiries, ...quotes, ...recentNotes]
  items.sort((a, b) => {
    const aTime = a.lastActionAt ? new Date(a.lastActionAt).getTime() : 0
    const bTime = b.lastActionAt ? new Date(b.lastActionAt).getTime() : 0
    return bTime - aTime
  })
  return items.slice(0, 15)
}

async function getActiveEvents(supabase: SupabaseClient, tenantId: string): Promise<ResumeItem[]> {
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, status, occasion, event_date, guest_count, updated_at, clients:client_id(full_name)'
    )
    .eq('tenant_id', tenantId)
    .in('status', ['draft', 'proposed', 'accepted', 'paid', 'confirmed', 'in_progress'])
    .order('updated_at', { ascending: false })
    .limit(10)

  if (error || !data) return []

  return (data as unknown as EventRow[]).map((e) => {
    const clientName = e.clients?.full_name || 'Unknown client'
    const dateStr = e.event_date
      ? new Date(e.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'No date'
    const guestStr = e.guest_count ? `${e.guest_count} guests` : ''

    return {
      id: e.id,
      type: 'event',
      title: e.occasion || 'Untitled event',
      subtitle: [clientName, dateStr, guestStr].filter(Boolean).join(' | '),
      status: e.status,
      statusColor: EVENT_STATUS_COLORS[e.status] || 'stone',
      lastActionAt: e.updated_at,
      href: `/pipeline/events/${e.id}`,
      context: { client_name: clientName, event_date: e.event_date, guest_count: e.guest_count },
    }
  })
}

async function getActiveMenus(supabase: SupabaseClient, tenantId: string): Promise<ResumeItem[]> {
  const { data, error } = await supabase
    .from('menus')
    .select('id, name, status, updated_at, events:event_id(occasion, clients:client_id(full_name))')
    .eq('tenant_id', tenantId)
    .in('status', ['draft', 'shared'])
    .order('updated_at', { ascending: false })
    .limit(10)

  if (error || !data) return []

  const rows = data as unknown as MenuRow[]
  const menuIds = rows.map((m) => m.id)
  const { data: dishes } =
    menuIds.length > 0
      ? await supabase.from('dishes').select('menu_id').in('menu_id', menuIds)
      : { data: [] }

  const dishCounts: Record<string, number> = {}
  for (const d of (dishes || []) as Array<{ menu_id: string }>) {
    dishCounts[d.menu_id] = (dishCounts[d.menu_id] || 0) + 1
  }

  return rows.map((m) => {
    const eventName = m.events?.occasion
    const clientName = m.events?.clients?.full_name
    const count = dishCounts[m.id] || 0
    const parts = [
      eventName ? `for "${eventName}"` : 'standalone',
      clientName,
      `${count} dish${count !== 1 ? 'es' : ''}`,
    ].filter(Boolean)

    return {
      id: m.id,
      type: 'menu',
      title: m.name || 'Untitled menu',
      subtitle: parts.join(' | '),
      status: m.status,
      statusColor: m.status === 'draft' ? 'amber' : 'brand',
      lastActionAt: m.updated_at,
      href: `/culinary/menus/${m.id}`,
      context: { event_name: eventName, client_name: clientName, dish_count: count },
    }
  })
}

async function getActiveInquiries(
  supabase: SupabaseClient,
  tenantId: string
): Promise<ResumeItem[]> {
  const { data, error } = await supabase
    .from('inquiries')
    .select(
      'id, status, channel, confirmed_occasion, next_action_required, next_action_by, follow_up_due_at, updated_at, clients:client_id(full_name)'
    )
    .eq('tenant_id', tenantId)
    .in('status', ['new', 'awaiting_client', 'awaiting_chef', 'quoted'])
    .order('updated_at', { ascending: false })
    .limit(10)

  if (error || !data) return []

  return (data as unknown as InquiryRow[]).map((inq) => {
    const clientName = inq.clients?.full_name || 'Unknown'
    const action =
      inq.next_action_required || statusToAction(inq.status, inq.next_action_by || undefined)
    const followUp = inq.follow_up_due_at
      ? `follow-up ${formatRelativeDate(inq.follow_up_due_at)}`
      : ''
    const parts = [clientName, `via ${inq.channel}`, action, followUp].filter(Boolean)

    return {
      id: inq.id,
      type: 'inquiry',
      title: inq.confirmed_occasion || `Inquiry from ${clientName}`,
      subtitle: parts.join(' | '),
      status: inq.status,
      statusColor: inq.status === 'new' ? 'red' : inq.next_action_by === 'chef' ? 'amber' : 'brand',
      lastActionAt: inq.follow_up_due_at || inq.updated_at,
      href: `/pipeline/inquiries/${inq.id}`,
      context: {
        client_name: clientName,
        channel: inq.channel,
        next_action: inq.next_action_required,
        follow_up_due: inq.follow_up_due_at,
      },
    }
  })
}

async function getActiveQuotes(supabase: SupabaseClient, tenantId: string): Promise<ResumeItem[]> {
  const { data, error } = await supabase
    .from('quotes')
    .select(
      'id, status, quote_name, total_quoted_cents, valid_until, updated_at, clients:client_id(full_name), events:event_id(occasion)'
    )
    .eq('tenant_id', tenantId)
    .in('status', ['draft', 'sent'])
    .order('updated_at', { ascending: false })
    .limit(10)

  if (error || !data) return []

  return (data as unknown as QuoteRow[]).map((q) => {
    const clientName = q.clients?.full_name || 'Unknown'
    const eventName = q.events?.occasion
    const amount = q.total_quoted_cents ? `$${(q.total_quoted_cents / 100).toLocaleString()}` : ''
    const expiry = q.valid_until ? `expires ${formatRelativeDate(q.valid_until)}` : ''
    const parts = [clientName, eventName, amount, expiry].filter(Boolean)

    return {
      id: q.id,
      type: 'quote',
      title: q.quote_name || `Quote for ${clientName}`,
      subtitle: parts.join(' | '),
      status: q.status,
      statusColor: q.status === 'draft' ? 'amber' : 'purple',
      lastActionAt: q.updated_at,
      href: `/pipeline/quotes/${q.id}`,
      context: {
        client_name: clientName,
        event_name: eventName,
        total_cents: q.total_quoted_cents,
      },
    }
  })
}

async function getRecentPinnedNotes(
  supabase: SupabaseClient,
  tenantId: string
): Promise<ResumeItem[]> {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('client_notes')
    .select('id, client_id, note_text, category, pinned, created_at, clients:client_id(full_name)')
    .eq('tenant_id', tenantId)
    .or(`pinned.eq.true,created_at.gte.${threeDaysAgo}`)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5)

  if (error || !data) return []

  return (data as unknown as NoteRow[]).map((n) => {
    const clientName = n.clients?.full_name || 'Unknown'
    const preview = n.note_text.length > 80 ? `${n.note_text.slice(0, 80)}...` : n.note_text

    return {
      id: n.id,
      type: 'note',
      title: `${n.pinned ? '[Pinned] ' : ''}Note on ${clientName}`,
      subtitle: preview,
      status: n.category,
      statusColor: NOTE_CATEGORY_COLORS[n.category] || 'stone',
      lastActionAt: n.created_at,
      href: `/clients/${n.client_id}`,
      context: { client_name: clientName, category: n.category, pinned: n.pinned },
    }
  })
}

const EVENT_STATUS_COLORS: Record<string, ResumeItem['statusColor']> = {
  draft: 'amber',
  proposed: 'brand',
  accepted: 'green',
  paid: 'green',
  confirmed: 'green',
  in_progress: 'purple',
}

const NOTE_CATEGORY_COLORS: Record<string, ResumeItem['statusColor']> = {
  general: 'stone',
  dietary: 'green',
  preference: 'brand',
  logistics: 'amber',
  relationship: 'purple',
}

function statusToAction(status: string, nextActionBy?: string): string {
  if (status === 'new') return 'needs review'
  if (status === 'awaiting_chef') return 'your turn'
  if (status === 'awaiting_client') return 'waiting on client'
  if (status === 'quoted') return 'quote sent'
  if (nextActionBy === 'chef') return 'your turn'
  return ''
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000))

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'tomorrow'
  return `in ${diffDays}d`
}
