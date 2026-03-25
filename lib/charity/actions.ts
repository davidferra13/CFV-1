'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { buildCharityOrFilter, isCharityRelated } from './charity-keywords'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CharityEvent = {
  id: string
  occasion: string | null
  event_date: string | null
  status: string
  guest_count: number | null
  client_name: string | null
}

export type CharityMenu = {
  id: string
  name: string
  description: string | null
  created_at: string
  event_id: string | null
}

export type CharityLedgerEntry = {
  id: string
  description: string | null
  amount_cents: number
  entry_type: string
  created_at: string
  event_id: string | null
}

export type CharityMiscItem = {
  id: string
  entity_type: 'client_note' | 'inquiry_note' | 'inquiry' | 'client_tag' | 'prospect' | 'message'
  label: string
  snippet: string
  link_href: string
  created_at: string
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function getCharityEvents(): Promise<CharityEvent[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const orFilter = buildCharityOrFilter([
    'occasion',
    'special_requests',
    'kitchen_notes',
    'site_notes',
  ])

  const { data, error } = await db
    .from('events')
    .select('id, occasion, event_date, status, guest_count, client:clients(full_name)')
    .eq('tenant_id', user.tenantId!)
    .or(orFilter)
    .eq('is_demo', false)
    .is('deleted_at' as any, null)
    .order('event_date', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[getCharityEvents]', error)
    return []
  }

  return (data ?? []).map((e: any) => ({
    id: e.id,
    occasion: e.occasion,
    event_date: e.event_date,
    status: e.status,
    guest_count: e.guest_count,
    client_name: e.client?.full_name ?? null,
  }))
}

// ─── Menus ────────────────────────────────────────────────────────────────────

export async function getCharityMenus(): Promise<CharityMenu[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const orFilter = buildCharityOrFilter(['name', 'description', 'notes'])

  const { data, error } = await db
    .from('menus')
    .select('id, name, description, created_at, event_id')
    .eq('tenant_id', user.tenantId!)
    .or(orFilter)
    .is('deleted_at' as any, null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[getCharityMenus]', error)
    return []
  }

  return (data ?? []).map((m: any) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    created_at: m.created_at,
    event_id: m.event_id,
  }))
}

// ─── Financials ───────────────────────────────────────────────────────────────

export async function getCharityFinancials(): Promise<CharityLedgerEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const orFilter = buildCharityOrFilter(['description', 'internal_notes'])

  const { data, error } = await db
    .from('ledger_entries')
    .select('id, description, amount_cents, entry_type, created_at, event_id')
    .eq('tenant_id', user.tenantId!)
    .or(orFilter)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[getCharityFinancials]', error)
    return []
  }

  return (data ?? []).map((le: any) => ({
    id: le.id,
    description: le.description,
    amount_cents: le.amount_cents,
    entry_type: le.entry_type,
    created_at: le.created_at,
    event_id: le.event_id,
  }))
}

// ─── Misc (notes, tags, inquiries) ───────────────────────────────────────────

export async function getCharityMisc(): Promise<CharityMiscItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // All queries are independent - run in parallel
  const [
    { data: clientNotes },
    { data: inquiryNotes },
    { data: inquiries },
    { data: tags },
    { data: prospectText },
    { data: prospectAll },
    { data: messages },
  ] = await Promise.all([
    // Client notes
    db
      .from('client_notes')
      .select('id, note_text, client_id, created_at')
      .eq('tenant_id', user.tenantId!)
      .or(buildCharityOrFilter(['note_text']))
      .limit(20),
    // Inquiry notes
    db
      .from('inquiry_notes')
      .select('id, note_text, inquiry_id, created_at')
      .eq('tenant_id', user.tenantId!)
      .or(buildCharityOrFilter(['note_text']))
      .limit(20),
    // Inquiries (source_message, confirmed_occasion)
    db
      .from('inquiries')
      .select('id, source_message, confirmed_occasion, created_at')
      .eq('tenant_id', user.tenantId!)
      .or(buildCharityOrFilter(['source_message', 'confirmed_occasion']))
      .is('deleted_at' as any, null)
      .limit(20),
    // Client tags
    db
      .from('client_tags')
      .select('id, tag, client_id, created_at')
      .eq('tenant_id', user.tenantId!)
      .or(buildCharityOrFilter(['tag']))
      .limit(20),
    // Prospects - text columns (uses chef_id, not tenant_id)
    db
      .from('prospects')
      .select('id, name, notes, talking_points, created_at')
      .eq('chef_id', user.tenantId!)
      .or(buildCharityOrFilter(['notes', 'talking_points', 'description']))
      .limit(20),
    // Prospects - all (for array field post-filtering)
    db
      .from('prospects')
      .select('id, name, tags, event_types_hosted, created_at')
      .eq('chef_id', user.tenantId!)
      .limit(200),
    // Messages (capped at 15 to avoid noise)
    db
      .from('messages')
      .select('id, subject, body, client_id, inquiry_id, created_at')
      .eq('tenant_id', user.tenantId!)
      .or(buildCharityOrFilter(['subject', 'body']))
      .order('created_at', { ascending: false })
      .limit(15),
  ])

  const results: CharityMiscItem[] = []

  for (const n of clientNotes ?? []) {
    results.push({
      id: n.id,
      entity_type: 'client_note',
      label: 'Client Note',
      snippet: (n.note_text ?? '').slice(0, 120),
      link_href: `/clients/${n.client_id}`,
      created_at: n.created_at,
    })
  }

  for (const n of inquiryNotes ?? []) {
    results.push({
      id: n.id,
      entity_type: 'inquiry_note',
      label: 'Inquiry Note',
      snippet: (n.note_text ?? '').slice(0, 120),
      link_href: `/inquiries/${n.inquiry_id}`,
      created_at: n.created_at,
    })
  }

  for (const inq of inquiries ?? []) {
    results.push({
      id: inq.id,
      entity_type: 'inquiry',
      label: 'Inquiry',
      snippet: (inq.confirmed_occasion || inq.source_message || '').slice(0, 120),
      link_href: `/inquiries/${inq.id}`,
      created_at: inq.created_at,
    })
  }

  for (const t of tags ?? []) {
    results.push({
      id: t.id,
      entity_type: 'client_tag',
      label: `Tag: ${t.tag}`,
      snippet: t.tag,
      link_href: `/clients/${t.client_id}`,
      created_at: t.created_at,
    })
  }

  // Prospects from text column matches
  const prospectIds = new Set<string>()
  for (const p of prospectText ?? []) {
    prospectIds.add(p.id)
    results.push({
      id: p.id,
      entity_type: 'prospect',
      label: `Prospect: ${p.name}`,
      snippet: (p.notes || p.talking_points || '').slice(0, 120),
      link_href: `/prospecting`,
      created_at: p.created_at,
    })
  }

  // Prospects from array field matches (post-filter, deduplicated)
  for (const p of prospectAll ?? []) {
    if (prospectIds.has(p.id)) continue
    const tagsMatch = (p.tags ?? []).some((t: string) => isCharityRelated(t))
    const eventTypesMatch = (p.event_types_hosted ?? []).some((e: string) => isCharityRelated(e))
    if (tagsMatch || eventTypesMatch) {
      results.push({
        id: p.id,
        entity_type: 'prospect',
        label: `Prospect: ${p.name}`,
        snippet: (p.tags ?? [])
          .concat(p.event_types_hosted ?? [])
          .join(', ')
          .slice(0, 120),
        link_href: `/prospecting`,
        created_at: p.created_at,
      })
    }
  }

  for (const m of messages ?? []) {
    const linkTarget = m.inquiry_id
      ? `/inquiries/${m.inquiry_id}`
      : m.client_id
        ? `/clients/${m.client_id}`
        : '/inbox'
    results.push({
      id: m.id,
      entity_type: 'message',
      label: m.subject ? `Message: ${m.subject.slice(0, 60)}` : 'Message',
      snippet: (m.body ?? '').slice(0, 120),
      link_href: linkTarget,
      created_at: m.created_at,
    })
  }

  return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}
