'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'

export interface SearchResult {
  id: string
  type: 'client' | 'event' | 'inquiry' | 'menu' | 'recipe'
  title: string
  snippet?: string
  url: string
  metadata?: Record<string, string>
}

export interface SearchResponse {
  results: SearchResult[]
  grouped: Record<string, SearchResult[]>
}

export async function universalSearch(query: string): Promise<SearchResponse> {
  if (!query || query.length < 2) return { results: [], grouped: {} }

  const chef = await requireChef()
  const supabase = createServerClient()
  const q = `%${query}%`
  const results: SearchResult[] = []

  // Search clients (full_name, email, phone — scoped by tenant_id)
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, email, phone')
    .eq('tenant_id', chef.tenantId!)
    .or(`full_name.ilike.${q},email.ilike.${q},phone.ilike.${q}`)
    .limit(5)

  if (clients) {
    for (const c of clients) {
      results.push({
        id: c.id,
        type: 'client',
        title: c.full_name,
        snippet: c.email || c.phone || undefined,
        url: `/clients/${c.id}`,
      })
    }
  }

  // Search events (occasion, event_date, status — scoped by tenant_id)
  const { data: events } = await supabase
    .from('events')
    .select('id, occasion, event_date, status')
    .eq('tenant_id', chef.tenantId!)
    .ilike('occasion', q)
    .limit(5)

  if (events) {
    for (const e of events) {
      results.push({
        id: e.id,
        type: 'event',
        title: e.occasion || `Event ${e.event_date}`,
        snippet: `${e.event_date} - ${e.status}`,
        url: `/events/${e.id}`,
        metadata: { badge: e.status },
      })
    }
  }

  // Search inquiries (source_message, confirmed_occasion — scoped by tenant_id)
  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('id, source_message, confirmed_occasion, confirmed_date, status')
    .eq('tenant_id', chef.tenantId!)
    .or(`source_message.ilike.${q},confirmed_occasion.ilike.${q}`)
    .limit(5)

  if (inquiries) {
    for (const i of inquiries) {
      results.push({
        id: i.id,
        type: 'inquiry',
        title: i.confirmed_occasion || 'Inquiry',
        snippet: `${i.confirmed_date || 'No date'} - ${i.status}`,
        url: `/inquiries/${i.id}`,
        metadata: { badge: i.status },
      })
    }
  }

  // Search menus (name — scoped by tenant_id)
  const { data: menus } = await supabase
    .from('menus')
    .select('id, name')
    .eq('tenant_id', chef.tenantId!)
    .ilike('name', q)
    .limit(5)

  if (menus) {
    for (const m of menus) {
      results.push({
        id: m.id,
        type: 'menu',
        title: m.name,
        url: `/menus/${m.id}`,
      })
    }
  }

  // Search recipes (name — scoped by tenant_id)
  const { data: recipes } = await supabase
    .from('recipes')
    .select('id, name')
    .eq('tenant_id', chef.tenantId!)
    .ilike('name', q)
    .limit(5)

  if (recipes) {
    for (const r of recipes) {
      results.push({
        id: r.id,
        type: 'recipe',
        title: r.name,
        url: `/recipes/${r.id}`,
      })
    }
  }

  // Group results by type
  const grouped: Record<string, SearchResult[]> = {}
  for (const r of results) {
    const key = r.type.charAt(0).toUpperCase() + r.type.slice(1) + 's'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(r)
  }

  return { results, grouped }
}
