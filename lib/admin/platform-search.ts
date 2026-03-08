'use server'

// Platform-wide search — search across chefs, clients, events, recipes, inquiries

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/admin'

export type SearchResult = {
  type: 'chef' | 'client' | 'event' | 'recipe' | 'inquiry'
  id: string
  title: string
  subtitle: string | null
  chefId: string | null
  chefName: string | null
}

export async function platformSearch(query: string): Promise<SearchResult[]> {
  await requireAdmin()
  if (!query || query.trim().length < 2) return []

  const supabase = createAdminClient()
  const q = query.trim()
  const pattern = `%${q}%`
  const results: SearchResult[] = []

  // Search in parallel across all entity types
  const [chefsR, clientsR, eventsR, recipesR, inquiriesR] = await Promise.all([
    supabase
      .from('chefs')
      .select('id, business_name, email')
      .or(`business_name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(10),
    supabase
      .from('clients')
      .select('id, full_name, email, tenant_id')
      .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(10),
    supabase.from('events').select('id, occasion, tenant_id').ilike('occasion', pattern).limit(10),
    supabase.from('recipes').select('id, name, tenant_id').ilike('name', pattern).limit(10),
    supabase
      .from('inquiries')
      .select('id, client_name, client_email, occasion, tenant_id')
      .or(`client_name.ilike.${pattern},client_email.ilike.${pattern},occasion.ilike.${pattern}`)
      .limit(10),
  ])

  // Gather all tenant IDs for chef name resolution
  const allTenantIds = new Set<string>()
  for (const c of clientsR.data ?? []) allTenantIds.add(c.tenant_id)
  for (const e of eventsR.data ?? []) allTenantIds.add(e.tenant_id)
  for (const r of recipesR.data ?? []) allTenantIds.add(r.tenant_id)
  for (const i of inquiriesR.data ?? []) allTenantIds.add(i.tenant_id)

  let chefMap = new Map<string, string>()
  if (allTenantIds.size > 0) {
    const { data: chefNames } = await supabase
      .from('chefs')
      .select('id, business_name')
      .in('id', [...allTenantIds])
    chefMap = new Map((chefNames ?? []).map((c) => [c.id, c.business_name ?? 'Unknown']))
  }

  // Build results
  for (const c of chefsR.data ?? []) {
    results.push({
      type: 'chef',
      id: c.id,
      title: c.business_name ?? 'Unnamed Chef',
      subtitle: c.email,
      chefId: c.id,
      chefName: c.business_name,
    })
  }
  for (const c of clientsR.data ?? []) {
    results.push({
      type: 'client',
      id: c.id,
      title: c.full_name ?? 'Unnamed Client',
      subtitle: c.email,
      chefId: c.tenant_id,
      chefName: chefMap.get(c.tenant_id) ?? null,
    })
  }
  for (const e of eventsR.data ?? []) {
    results.push({
      type: 'event',
      id: e.id,
      title: e.occasion ?? 'Untitled Event',
      subtitle: null,
      chefId: e.tenant_id,
      chefName: chefMap.get(e.tenant_id) ?? null,
    })
  }
  for (const r of recipesR.data ?? []) {
    results.push({
      type: 'recipe',
      id: r.id,
      title: r.name,
      subtitle: null,
      chefId: r.tenant_id,
      chefName: chefMap.get(r.tenant_id) ?? null,
    })
  }
  for (const i of inquiriesR.data ?? []) {
    results.push({
      type: 'inquiry',
      id: i.id,
      title: i.client_name ?? i.occasion ?? 'Inquiry',
      subtitle: i.client_email,
      chefId: i.tenant_id,
      chefName: chefMap.get(i.tenant_id) ?? null,
    })
  }

  return results.slice(0, 50)
}
