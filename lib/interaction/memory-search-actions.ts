'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  SearchableSource,
  SearchResult,
  SearchFilters,
  SourcePreview,
  SearchStats,
} from './memory-search-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreResult(matchField: string, query: string, row: any): number {
  const q = query.toLowerCase()
  const val = String(row[matchField] ?? '').toLowerCase()
  if (val === q) return 1.0
  if (val.startsWith(q)) return 0.9
  if (val.includes(q)) return 0.7
  return 0.5
}

function snippet(text: string | null, query: string, maxLen = 120): string {
  if (!text) return ''
  const lower = text.toLowerCase()
  const idx = lower.indexOf(query.toLowerCase())
  if (idx === -1) return text.slice(0, maxLen)
  const start = Math.max(0, idx - 40)
  const end = Math.min(text.length, idx + query.length + 80)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < text.length ? '...' : ''
  return prefix + text.slice(start, end) + suffix
}

// ---------------------------------------------------------------------------
// 1. searchOperationalMemory
// ---------------------------------------------------------------------------

export async function searchOperationalMemory(
  query: string,
  filters?: SearchFilters,
): Promise<{ results: SearchResult[]; stats: SearchStats }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!
  const startTime = Date.now()
  const limit = filters?.limit ?? 50
  const pattern = `%${query}%`

  const activeSources: SearchableSource[] = filters?.sources ?? [
    'events', 'clients', 'recipes', 'menus', 'notes', 'communication_log', 'invoices',
  ]

  const results: SearchResult[] = []
  const bySource: Record<string, number> = {}

  // --- Events ---
  if (activeSources.includes('events')) {
    const { data: events } = await db
      .from('events')
      .select('id, title, notes, location, created_at')
      .eq('tenant_id', tenantId)
      .or(`title.ilike.${pattern},notes.ilike.${pattern},location.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(limit)

    for (const row of events ?? []) {
      const matchField = (row.title ?? '').toLowerCase().includes(query.toLowerCase())
        ? 'title'
        : (row.notes ?? '').toLowerCase().includes(query.toLowerCase())
          ? 'notes'
          : 'location'
      results.push({
        id: `evt-${row.id}`,
        source: 'events',
        title: row.title ?? 'Untitled Event',
        snippet: snippet(row[matchField], query),
        matchField,
        entityId: row.id,
        relevanceScore: scoreResult(matchField, query, row),
        createdAt: row.created_at,
      })
    }
    bySource['events'] = (events ?? []).length
  }

  // --- Clients ---
  if (activeSources.includes('clients')) {
    const { data: clientRows } = await db
      .from('clients')
      .select('id, first_name, last_name, email, notes, created_at')
      .eq('tenant_id', tenantId)
      .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},notes.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(limit)

    for (const row of clientRows ?? []) {
      const fullName = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim()
      const matchField = fullName.toLowerCase().includes(query.toLowerCase())
        ? 'name'
        : (row.email ?? '').toLowerCase().includes(query.toLowerCase())
          ? 'email'
          : 'notes'
      results.push({
        id: `cli-${row.id}`,
        source: 'clients',
        title: fullName || row.email || 'Unknown Client',
        snippet: matchField === 'name'
          ? fullName
          : snippet(row[matchField === 'email' ? 'email' : 'notes'], query),
        matchField,
        entityId: row.id,
        relevanceScore: scoreResult(matchField === 'name' ? 'first_name' : matchField, query, row),
        createdAt: row.created_at,
      })
    }
    bySource['clients'] = (clientRows ?? []).length
  }

  // --- Recipes ---
  if (activeSources.includes('recipes')) {
    const { data: recipeRows } = await db
      .from('recipes')
      .select('id, title, description, created_at')
      .eq('tenant_id', tenantId)
      .or(`title.ilike.${pattern},description.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(limit)

    for (const row of recipeRows ?? []) {
      const matchField = (row.title ?? '').toLowerCase().includes(query.toLowerCase())
        ? 'title'
        : 'description'
      results.push({
        id: `rcp-${row.id}`,
        source: 'recipes',
        title: row.title ?? 'Untitled Recipe',
        snippet: snippet(row[matchField], query),
        matchField,
        entityId: row.id,
        relevanceScore: scoreResult(matchField, query, row),
        createdAt: row.created_at,
      })
    }
    bySource['recipes'] = (recipeRows ?? []).length
  }

  // --- Menus ---
  if (activeSources.includes('menus')) {
    const { data: menuRows } = await db
      .from('menus')
      .select('id, title, created_at')
      .eq('tenant_id', tenantId)
      .ilike('title', pattern)
      .order('created_at', { ascending: false })
      .limit(limit)

    for (const row of menuRows ?? []) {
      results.push({
        id: `mnu-${row.id}`,
        source: 'menus',
        title: row.title ?? 'Untitled Menu',
        snippet: snippet(row.title, query),
        matchField: 'title',
        entityId: row.id,
        relevanceScore: scoreResult('title', query, row),
        createdAt: row.created_at,
      })
    }
    bySource['menus'] = (menuRows ?? []).length
  }

  // --- Notes (inquiry_notes) ---
  if (activeSources.includes('notes')) {
    const { data: noteRows } = await db
      .from('inquiry_notes')
      .select('id, content, created_at')
      .eq('tenant_id', tenantId)
      .ilike('content', pattern)
      .order('created_at', { ascending: false })
      .limit(limit)

    for (const row of noteRows ?? []) {
      results.push({
        id: `note-${row.id}`,
        source: 'notes',
        title: (row.content ?? '').slice(0, 60) || 'Note',
        snippet: snippet(row.content, query),
        matchField: 'content',
        entityId: row.id,
        relevanceScore: scoreResult('content', query, row),
        createdAt: row.created_at,
      })
    }
    bySource['notes'] = (noteRows ?? []).length
  }

  // --- Communication Log ---
  if (activeSources.includes('communication_log')) {
    const { data: commRows } = await db
      .from('communication_log')
      .select('id, subject, body, created_at')
      .eq('tenant_id', tenantId)
      .or(`subject.ilike.${pattern},body.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(limit)

    for (const row of commRows ?? []) {
      const matchField = (row.subject ?? '').toLowerCase().includes(query.toLowerCase())
        ? 'subject'
        : 'body'
      results.push({
        id: `comm-${row.id}`,
        source: 'communication_log',
        title: row.subject ?? 'Communication',
        snippet: snippet(row[matchField], query),
        matchField,
        entityId: row.id,
        relevanceScore: scoreResult(matchField, query, row),
        createdAt: row.created_at,
      })
    }
    bySource['communication_log'] = (commRows ?? []).length
  }

  // --- Invoices ---
  if (activeSources.includes('invoices')) {
    const { data: invRows } = await db
      .from('invoices')
      .select('id, invoice_number, notes, created_at')
      .eq('tenant_id', tenantId)
      .or(`invoice_number.ilike.${pattern},notes.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(limit)

    for (const row of invRows ?? []) {
      const matchField = (row.invoice_number ?? '').toLowerCase().includes(query.toLowerCase())
        ? 'invoice_number'
        : 'notes'
      results.push({
        id: `inv-${row.id}`,
        source: 'invoices',
        title: row.invoice_number ?? 'Invoice',
        snippet: snippet(row[matchField], query),
        matchField,
        entityId: row.id,
        relevanceScore: scoreResult(matchField, query, row),
        createdAt: row.created_at,
      })
    }
    bySource['invoices'] = (invRows ?? []).length
  }

  // Sort by relevance descending, then by date
  results.sort((a, b) => b.relevanceScore - a.relevanceScore || (b.createdAt > a.createdAt ? 1 : -1))

  // Apply date filters client-side (simpler than per-source SQL)
  let filtered = results
  if (filters?.dateFrom) {
    filtered = filtered.filter((r) => r.createdAt >= filters.dateFrom!)
  }
  if (filters?.dateTo) {
    filtered = filtered.filter((r) => r.createdAt <= filters.dateTo!)
  }

  const finalResults = filtered.slice(0, limit)

  return {
    results: finalResults,
    stats: {
      totalResults: finalResults.length,
      bySource,
      searchTime: Date.now() - startTime,
    },
  }
}

// ---------------------------------------------------------------------------
// 2. getSourcePreview
// ---------------------------------------------------------------------------

export async function getSourcePreview(
  source: SearchableSource,
  entityId: string,
): Promise<SourcePreview | null> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  switch (source) {
    case 'events': {
      const { data: evt } = await db
        .from('events')
        .select('id, title, event_date, location, notes, guest_count, status, client_id')
        .eq('id', entityId)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!evt) return null

      const related: SourcePreview['relatedEntities'] = []
      if (evt.client_id) {
        const { data: cli } = await db
          .from('clients')
          .select('id, first_name, last_name')
          .eq('id', evt.client_id)
          .maybeSingle()
        if (cli) {
          related.push({ type: 'client', id: cli.id, label: `${cli.first_name ?? ''} ${cli.last_name ?? ''}`.trim() })
        }
      }

      // Related menus
      const { data: menus } = await db
        .from('menus')
        .select('id, title')
        .eq('event_id', entityId)
        .eq('tenant_id', tenantId)
        .limit(5)
      for (const m of menus ?? []) {
        related.push({ type: 'menu', id: m.id, label: m.title ?? 'Menu' })
      }

      return {
        source: 'events',
        entityId: evt.id,
        title: evt.title ?? 'Untitled Event',
        fields: [
          { label: 'Date', value: evt.event_date ?? 'TBD' },
          { label: 'Location', value: evt.location ?? 'Not set' },
          { label: 'Guests', value: String(evt.guest_count ?? 0) },
          { label: 'Status', value: evt.status ?? 'unknown' },
          { label: 'Notes', value: evt.notes ?? '' },
        ],
        relatedEntities: related,
      }
    }

    case 'clients': {
      const { data: cli } = await db
        .from('clients')
        .select('id, first_name, last_name, email, phone, notes, created_at')
        .eq('id', entityId)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!cli) return null

      const related: SourcePreview['relatedEntities'] = []
      const { data: evts } = await db
        .from('events')
        .select('id, title')
        .eq('client_id', entityId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(5)
      for (const e of evts ?? []) {
        related.push({ type: 'event', id: e.id, label: e.title ?? 'Event' })
      }

      return {
        source: 'clients',
        entityId: cli.id,
        title: `${cli.first_name ?? ''} ${cli.last_name ?? ''}`.trim() || cli.email || 'Unknown',
        fields: [
          { label: 'Email', value: cli.email ?? '' },
          { label: 'Phone', value: cli.phone ?? '' },
          { label: 'Notes', value: cli.notes ?? '' },
          { label: 'Since', value: cli.created_at ?? '' },
        ],
        relatedEntities: related,
      }
    }

    case 'recipes': {
      const { data: rcp } = await db
        .from('recipes')
        .select('id, title, description, servings, prep_time, cook_time, created_at')
        .eq('id', entityId)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!rcp) return null

      return {
        source: 'recipes',
        entityId: rcp.id,
        title: rcp.title ?? 'Untitled Recipe',
        fields: [
          { label: 'Description', value: rcp.description ?? '' },
          { label: 'Servings', value: String(rcp.servings ?? '') },
          { label: 'Prep Time', value: rcp.prep_time ?? '' },
          { label: 'Cook Time', value: rcp.cook_time ?? '' },
          { label: 'Created', value: rcp.created_at ?? '' },
        ],
        relatedEntities: [],
      }
    }

    case 'menus': {
      const { data: mnu } = await db
        .from('menus')
        .select('id, title, event_id, created_at')
        .eq('id', entityId)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!mnu) return null

      const related: SourcePreview['relatedEntities'] = []
      if (mnu.event_id) {
        const { data: evt } = await db
          .from('events')
          .select('id, title')
          .eq('id', mnu.event_id)
          .maybeSingle()
        if (evt) {
          related.push({ type: 'event', id: evt.id, label: evt.title ?? 'Event' })
        }
      }

      return {
        source: 'menus',
        entityId: mnu.id,
        title: mnu.title ?? 'Untitled Menu',
        fields: [
          { label: 'Created', value: mnu.created_at ?? '' },
        ],
        relatedEntities: related,
      }
    }

    case 'notes': {
      const { data: note } = await db
        .from('inquiry_notes')
        .select('id, content, inquiry_id, created_at')
        .eq('id', entityId)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!note) return null

      const related: SourcePreview['relatedEntities'] = []
      if (note.inquiry_id) {
        related.push({ type: 'inquiry', id: note.inquiry_id, label: 'Linked Inquiry' })
      }

      return {
        source: 'notes',
        entityId: note.id,
        title: (note.content ?? '').slice(0, 60) || 'Note',
        fields: [
          { label: 'Content', value: note.content ?? '' },
          { label: 'Created', value: note.created_at ?? '' },
        ],
        relatedEntities: related,
      }
    }

    case 'communication_log': {
      const { data: comm } = await db
        .from('communication_log')
        .select('id, subject, body, channel, direction, client_id, created_at')
        .eq('id', entityId)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!comm) return null

      const related: SourcePreview['relatedEntities'] = []
      if (comm.client_id) {
        const { data: cli } = await db
          .from('clients')
          .select('id, first_name, last_name')
          .eq('id', comm.client_id)
          .maybeSingle()
        if (cli) {
          related.push({ type: 'client', id: cli.id, label: `${cli.first_name ?? ''} ${cli.last_name ?? ''}`.trim() })
        }
      }

      return {
        source: 'communication_log',
        entityId: comm.id,
        title: comm.subject ?? 'Communication',
        fields: [
          { label: 'Subject', value: comm.subject ?? '' },
          { label: 'Body', value: (comm.body ?? '').slice(0, 300) },
          { label: 'Channel', value: comm.channel ?? '' },
          { label: 'Direction', value: comm.direction ?? '' },
          { label: 'Date', value: comm.created_at ?? '' },
        ],
        relatedEntities: related,
      }
    }

    case 'invoices': {
      const { data: inv } = await db
        .from('invoices')
        .select('id, invoice_number, total_amount, status, due_date, event_id, client_id, notes, created_at')
        .eq('id', entityId)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!inv) return null

      const related: SourcePreview['relatedEntities'] = []
      if (inv.event_id) {
        const { data: evt } = await db
          .from('events')
          .select('id, title')
          .eq('id', inv.event_id)
          .maybeSingle()
        if (evt) {
          related.push({ type: 'event', id: evt.id, label: evt.title ?? 'Event' })
        }
      }
      if (inv.client_id) {
        const { data: cli } = await db
          .from('clients')
          .select('id, first_name, last_name')
          .eq('id', inv.client_id)
          .maybeSingle()
        if (cli) {
          related.push({ type: 'client', id: cli.id, label: `${cli.first_name ?? ''} ${cli.last_name ?? ''}`.trim() })
        }
      }

      return {
        source: 'invoices',
        entityId: inv.id,
        title: inv.invoice_number ?? 'Invoice',
        fields: [
          { label: 'Invoice #', value: inv.invoice_number ?? '' },
          { label: 'Total', value: inv.total_amount != null ? `$${inv.total_amount}` : '' },
          { label: 'Status', value: inv.status ?? '' },
          { label: 'Due Date', value: inv.due_date ?? '' },
          { label: 'Notes', value: inv.notes ?? '' },
          { label: 'Created', value: inv.created_at ?? '' },
        ],
        relatedEntities: related,
      }
    }

    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// 3. getRecentSearches
// ---------------------------------------------------------------------------

export async function getRecentSearches(): Promise<{ query: string; resultCount: number; searchedAt: string }[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('search_log')
    .select('query, result_count, searched_at')
    .eq('tenant_id', user.tenantId!)
    .order('searched_at', { ascending: false })
    .limit(20)

  if (error) throw error

  return (data ?? []).map((row: any) => ({
    query: row.query,
    resultCount: row.result_count,
    searchedAt: row.searched_at,
  }))
}

// ---------------------------------------------------------------------------
// 4. logSearch
// ---------------------------------------------------------------------------

export async function logSearch(query: string, resultCount: number): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!query.trim()) return

  const { error } = await db
    .from('search_log')
    .insert({
      tenant_id: user.tenantId!,
      query: query.trim(),
      result_count: resultCount,
    })

  if (error) throw error
}

// ---------------------------------------------------------------------------
// 5. getSearchSuggestions
// ---------------------------------------------------------------------------

export async function getSearchSuggestions(partial: string): Promise<string[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  if (!partial.trim()) return []

  const pattern = `%${partial}%`
  const suggestions: string[] = []

  // Recent searches matching partial
  const { data: recentRows } = await db
    .from('search_log')
    .select('query')
    .eq('tenant_id', tenantId)
    .ilike('query', pattern)
    .order('searched_at', { ascending: false })
    .limit(10)

  const seen = new Set<string>()
  for (const row of recentRows ?? []) {
    const q = (row.query as string).trim().toLowerCase()
    if (!seen.has(q)) {
      seen.add(q)
      suggestions.push(row.query)
    }
  }

  // Event titles matching partial
  const { data: eventTitles } = await db
    .from('events')
    .select('title')
    .eq('tenant_id', tenantId)
    .ilike('title', pattern)
    .limit(5)

  for (const row of eventTitles ?? []) {
    const t = (row.title as string).trim().toLowerCase()
    if (t && !seen.has(t)) {
      seen.add(t)
      suggestions.push(row.title)
    }
  }

  // Client names matching partial
  const { data: clientNames } = await db
    .from('clients')
    .select('first_name, last_name')
    .eq('tenant_id', tenantId)
    .or(`first_name.ilike.${pattern},last_name.ilike.${pattern}`)
    .limit(5)

  for (const row of clientNames ?? []) {
    const name = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim().toLowerCase()
    if (name && !seen.has(name)) {
      seen.add(name)
      suggestions.push(`${row.first_name ?? ''} ${row.last_name ?? ''}`.trim())
    }
  }

  // Recipe titles matching partial
  const { data: recipeTitles } = await db
    .from('recipes')
    .select('title')
    .eq('tenant_id', tenantId)
    .ilike('title', pattern)
    .limit(5)

  for (const row of recipeTitles ?? []) {
    const t = (row.title as string).trim().toLowerCase()
    if (t && !seen.has(t)) {
      seen.add(t)
      suggestions.push(row.title)
    }
  }

  return suggestions.slice(0, 15)
}
