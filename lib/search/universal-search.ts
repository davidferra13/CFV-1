'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { dateToDateString } from '@/lib/utils/format'
import { navGroups, standaloneBottom, standaloneTop } from '@/components/navigation/nav-config'

export interface SearchResult {
  id: string
  type:
    | 'page'
    | 'client'
    | 'event'
    | 'inquiry'
    | 'menu'
    | 'recipe'
    | 'quote'
    | 'expense'
    | 'partner'
    | 'staff'
    | 'note'
    | 'message'
    | 'conversation'
    | 'connection'
    | 'handoff'
    | 'collab_space'
    | 'hub_message'
    | 'contract'
  title: string
  snippet?: string
  url: string
  metadata?: Record<string, string>
}

export interface SearchResponse {
  results: SearchResult[]
  grouped: Record<string, SearchResult[]>
}

/**
 * Simple fuzzy match: checks if all characters of the needle appear in order
 * within the haystack. Returns a score (0 = no match, higher = better).
 * Exact substring match scores highest; fuzzy order-preserved match scores lower.
 */
function fuzzyScore(haystack: string, needle: string): number {
  if (haystack.includes(needle)) return 100
  let hi = 0
  let matched = 0
  for (let ni = 0; ni < needle.length; ni++) {
    while (hi < haystack.length) {
      if (haystack[hi] === needle[ni]) {
        matched++
        hi++
        break
      }
      hi++
    }
  }
  if (matched < needle.length * 0.7) return 0 // require at least 70% character match in order
  return Math.round((matched / needle.length) * 50)
}

export async function universalSearch(query: string): Promise<SearchResponse> {
  if (!query || query.length < 2) return { results: [], grouped: {} }

  const chef = await requireChef()
  const db: any = createServerClient()
  // Escape PostgREST filter metacharacters to prevent filter string injection
  const safeQuery = query.replace(/[%_,.()"'\\]/g, '')
  const q = `%${safeQuery}%`
  const needle = query.trim().toLowerCase()
  const results: SearchResult[] = []
  const makeId = (type: SearchResult['type'], id: string) => `${type}:${id}`

  // Search pages/routes from navigation config (plus key public pages).
  const pageMap = new Map<string, { title: string; snippet?: string; keywords: Set<string> }>()
  const addPage = (href: string, title: string, snippet?: string, keywords: string[] = []) => {
    const existing = pageMap.get(href)
    if (!existing) {
      pageMap.set(href, { title, snippet, keywords: new Set(keywords) })
      return
    }
    existing.keywords.add(title)
    if (snippet) existing.keywords.add(snippet)
    for (const keyword of keywords) existing.keywords.add(keyword)
  }

  for (const top of standaloneTop) {
    addPage(top.href, top.label, 'Navigation', [top.href])
  }
  for (const group of navGroups) {
    for (const item of group.items) {
      addPage(item.href, item.label, group.label, [item.href, group.label, item.label])
      for (const child of item.children ?? []) {
        addPage(child.href, child.label, `${group.label} > ${item.label}`, [
          child.href,
          group.label,
          item.label,
          child.label,
        ])
      }
    }
  }
  for (const bottom of standaloneBottom) {
    addPage(bottom.href, bottom.label, 'Navigation', [bottom.href])
  }
  addPage('/', 'Home', 'Public website', ['landing', 'homepage'])
  addPage('/pricing', 'Pricing', 'Public website', ['plans', 'cost'])
  addPage('/contact', 'Contact', 'Public website', ['contact form'])
  addPage('/privacy', 'Privacy', 'Public website', ['policy'])
  addPage('/terms', 'Terms', 'Public website', ['terms of service'])

  // Fuzzy page matching: score each page, include if score > 0, sort by score
  const pageHits: Array<{
    href: string
    page: typeof pageMap extends Map<string, infer V> ? V : never
    score: number
  }> = []
  for (const [href, page] of pageMap.entries()) {
    const haystack = [page.title, page.snippet || '', href, ...Array.from(page.keywords)]
      .join(' ')
      .toLowerCase()
    const score = fuzzyScore(haystack, needle)
    if (score > 0) pageHits.push({ href, page, score })
  }
  pageHits.sort((a, b) => b.score - a.score)
  for (const hit of pageHits.slice(0, 15)) {
    results.push({
      id: makeId('page', hit.href),
      type: 'page',
      title: hit.page.title,
      snippet: hit.page.snippet,
      url: hit.href,
    })
  }

  // Search clients (full_name, email, phone - scoped by tenant_id).
  const { data: clients } = await db
    .from('clients')
    .select('id, full_name, email, phone')
    .eq('tenant_id', chef.tenantId!)
    .or(`full_name.ilike.${q},email.ilike.${q},phone.ilike.${q}`)
    .limit(8)

  if (clients) {
    for (const client of clients) {
      results.push({
        id: makeId('client', client.id),
        type: 'client',
        title: client.full_name,
        snippet: client.email || client.phone || undefined,
        url: `/clients/${client.id}`,
      })
    }
  }

  // Search events (occasion, notes, address, status - scoped by tenant_id).
  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, status, location_address, special_requests, ambiance_notes')
    .eq('tenant_id', chef.tenantId!)
    .or(
      `occasion.ilike.${q},location_address.ilike.${q},special_requests.ilike.${q},ambiance_notes.ilike.${q}`
    )
    .limit(8)

  if (events) {
    for (const event of events) {
      results.push({
        id: makeId('event', event.id),
        type: 'event',
        title: event.occasion || `Event ${dateToDateString(event.event_date as Date | string)}`,
        snippet: `${dateToDateString(event.event_date as Date | string)} - ${event.status}`,
        url: `/events/${event.id}`,
        metadata: { badge: event.status },
      })
    }
  }

  // Search inquiries (message, occasion, status - scoped by tenant_id).
  const { data: inquiries } = await db
    .from('inquiries')
    .select('id, source_message, confirmed_occasion, confirmed_date, status')
    .eq('tenant_id', chef.tenantId!)
    .or(`source_message.ilike.${q},confirmed_occasion.ilike.${q}`)
    .limit(8)

  if (inquiries) {
    for (const inquiry of inquiries) {
      results.push({
        id: makeId('inquiry', inquiry.id),
        type: 'inquiry',
        title: inquiry.confirmed_occasion || 'Inquiry',
        snippet: `${inquiry.confirmed_date || 'No date'} - ${inquiry.status}`,
        url: `/inquiries/${inquiry.id}`,
        metadata: { badge: inquiry.status },
      })
    }
  }

  // Search menus (name, description, notes - scoped by tenant_id).
  const { data: menus } = await db
    .from('menus')
    .select('id, name, description, notes, status')
    .eq('tenant_id', chef.tenantId!)
    .or(`name.ilike.${q},description.ilike.${q},notes.ilike.${q}`)
    .limit(8)

  if (menus) {
    for (const menu of menus) {
      results.push({
        id: makeId('menu', menu.id),
        type: 'menu',
        title: menu.name,
        snippet: menu.description || menu.notes || undefined,
        url: `/menus/${menu.id}`,
        metadata: { badge: menu.status },
      })
    }
  }

  // Search recipes (name, description, notes - scoped by tenant_id).
  const { data: recipes } = await db
    .from('recipes')
    .select('id, name, description, notes, category')
    .eq('tenant_id', chef.tenantId!)
    .or(`name.ilike.${q},description.ilike.${q},notes.ilike.${q}`)
    .limit(8)

  if (recipes) {
    for (const recipe of recipes) {
      results.push({
        id: makeId('recipe', recipe.id),
        type: 'recipe',
        title: recipe.name,
        snippet: recipe.description || recipe.notes || undefined,
        url: `/recipes/${recipe.id}`,
        metadata: { badge: recipe.category },
      })
    }
  }

  // Search quotes (name, notes - scoped by tenant_id).
  const { data: quotes } = await db
    .from('quotes')
    .select(
      'id, quote_name, status, total_quoted_cents, valid_until, internal_notes, pricing_notes'
    )
    .eq('tenant_id', chef.tenantId!)
    .or(`quote_name.ilike.${q},internal_notes.ilike.${q},pricing_notes.ilike.${q}`)
    .limit(8)

  if (quotes) {
    for (const quote of quotes) {
      results.push({
        id: makeId('quote', quote.id),
        type: 'quote',
        title: quote.quote_name || 'Quote',
        snippet: `${(quote.total_quoted_cents / 100).toFixed(2)} - ${quote.valid_until || 'No expiry'}`,
        url: `/quotes/${quote.id}`,
        metadata: { badge: quote.status },
      })
    }
  }

  // Search expenses (description, vendor, notes - scoped by tenant_id).
  const { data: expenses } = await db
    .from('expenses')
    .select('id, description, vendor_name, category, amount_cents, expense_date, notes')
    .eq('tenant_id', chef.tenantId!)
    .or(`description.ilike.${q},vendor_name.ilike.${q},notes.ilike.${q}`)
    .limit(8)

  if (expenses) {
    for (const expense of expenses) {
      results.push({
        id: makeId('expense', expense.id),
        type: 'expense',
        title: expense.description,
        snippet: `${(expense.amount_cents / 100).toFixed(2)} - ${expense.vendor_name || expense.expense_date}`,
        url: `/expenses/${expense.id}`,
        metadata: { badge: expense.category },
      })
    }
  }

  // Search referral partners (name, contact, notes - scoped by tenant_id).
  const { data: partners } = await db
    .from('referral_partners')
    .select('id, name, contact_name, email, status, notes')
    .eq('tenant_id', chef.tenantId!)
    .or(`name.ilike.${q},contact_name.ilike.${q},email.ilike.${q},notes.ilike.${q}`)
    .limit(8)

  if (partners) {
    for (const partner of partners) {
      results.push({
        id: makeId('partner', partner.id),
        type: 'partner',
        title: partner.name,
        snippet: partner.contact_name || partner.email || undefined,
        url: `/partners/${partner.id}`,
        metadata: { badge: partner.status },
      })
    }
  }

  // Search staff members (name, role, email, phone - scoped by chef_id).
  const { data: staffRows } = await db
    .from('staff_members')
    .select('id, name, role, email, phone, status')
    .eq('chef_id', chef.tenantId!)
    .or(`name.ilike.${q},email.ilike.${q},phone.ilike.${q}`)
    .limit(8)

  if (staffRows) {
    for (const staff of staffRows) {
      results.push({
        id: makeId('staff', staff.id),
        type: 'staff',
        title: staff.name,
        snippet: [staff.role, staff.email].filter(Boolean).join(' - ') || undefined,
        url: `/staff/${staff.id}`,
        metadata: { badge: staff.status },
      })
    }
  }

  // Search client notes (note_text - scoped by tenant_id).
  const { data: notes } = await db
    .from('client_notes')
    .select('id, client_id, note_text, category, pinned')
    .eq('tenant_id', chef.tenantId!)
    .ilike('note_text', q)
    .limit(8)

  if (notes) {
    for (const note of notes) {
      results.push({
        id: makeId('note', note.id),
        type: 'note',
        title: `Client Note (${note.category})`,
        snippet: note.note_text,
        url: `/clients/${note.client_id}`,
        metadata: { badge: note.pinned ? 'Pinned' : 'Note' },
      })
    }
  }

  // Search messages (subject, body - scoped by tenant_id).
  const { data: messages } = await db
    .from('messages')
    .select('id, subject, body, status, channel, client_id, event_id, inquiry_id')
    .eq('tenant_id', chef.tenantId!)
    .or(`subject.ilike.${q},body.ilike.${q}`)
    .limit(8)

  if (messages) {
    for (const message of messages) {
      const url = message.inquiry_id
        ? `/inquiries/${message.inquiry_id}`
        : message.event_id
          ? `/events/${message.event_id}`
          : message.client_id
            ? `/clients/${message.client_id}`
            : '/inbox'

      results.push({
        id: makeId('message', message.id),
        type: 'message',
        title: message.subject || 'Message',
        snippet: message.body,
        url,
        metadata: { badge: `${message.channel} ${message.status}` },
      })
    }
  }

  // Search chat conversations (last preview - scoped by tenant_id).
  const { data: conversations } = await db
    .from('conversations')
    .select('id, context_type, last_message_preview')
    .eq('tenant_id', chef.tenantId!)
    .ilike('last_message_preview', q)
    .limit(8)

  if (conversations) {
    for (const conversation of conversations) {
      results.push({
        id: makeId('conversation', conversation.id),
        type: 'conversation',
        title: 'Chat Conversation',
        snippet: conversation.last_message_preview || undefined,
        url: `/chat/${conversation.id}`,
        metadata: { badge: conversation.context_type },
      })
    }
  }

  // Search chef connections (both directions - scoped by tenant_id).
  const { data: connectionsOut } = await db
    .from('chef_connections')
    .select(
      'id, connected_chef_id, status, chefs!chef_connections_connected_chef_id_fkey(business_name)'
    )
    .eq('chef_id', chef.tenantId!)
    .eq('status', 'accepted')
    .limit(8)

  const { data: connectionsIn } = await db
    .from('chef_connections')
    .select('id, chef_id, status, chefs!chef_connections_chef_id_fkey(business_name)')
    .eq('connected_chef_id', chef.tenantId!)
    .eq('status', 'accepted')
    .limit(8)

  for (const conn of connectionsOut || []) {
    const name = conn.chefs?.business_name || 'Connected Chef'
    if (!name.toLowerCase().includes(needle)) continue
    results.push({
      id: makeId('connection', conn.id),
      type: 'connection',
      title: name,
      snippet: 'Connected Chef',
      url: '/network?tab=connections',
      metadata: { badge: conn.status },
    })
  }
  for (const conn of connectionsIn || []) {
    const name = conn.chefs?.business_name || 'Connected Chef'
    if (!name.toLowerCase().includes(needle)) continue
    results.push({
      id: makeId('connection', conn.id),
      type: 'connection',
      title: name,
      snippet: 'Connected Chef',
      url: '/network?tab=connections',
      metadata: { badge: conn.status },
    })
  }

  // Search handoffs (sent by this chef - by title/occasion).
  const { data: handoffsSent } = await db
    .from('chef_handoffs')
    .select('id, title, occasion, status, created_at')
    .eq('sender_chef_id', chef.tenantId!)
    .or(`title.ilike.${q},occasion.ilike.${q}`)
    .limit(8)

  for (const h of handoffsSent || []) {
    results.push({
      id: makeId('handoff', h.id),
      type: 'handoff',
      title: h.title || h.occasion || 'Handoff',
      snippet: `Sent - ${h.status}`,
      url: '/network?tab=handoffs',
      metadata: { badge: h.status },
    })
  }

  // Search handoffs received by this chef.
  const { data: handoffsReceived } = await db
    .from('chef_collab_handoff_recipients')
    .select('id, handoff_id, status, chef_handoffs(title, occasion)')
    .eq('recipient_chef_id', chef.tenantId!)
    .limit(8)

  for (const hr of handoffsReceived || []) {
    const title = hr.chef_handoffs?.title || hr.chef_handoffs?.occasion || 'Handoff'
    if (!title.toLowerCase().includes(needle)) continue
    results.push({
      id: makeId('handoff', hr.handoff_id),
      type: 'handoff',
      title,
      snippet: `Received - ${hr.status}`,
      url: '/network?tab=handoffs',
      metadata: { badge: hr.status },
    })
  }

  // Search collab spaces (by name, where chef is a member).
  const { data: collabSpaces } = await db
    .from('chef_collab_space_members')
    .select('collab_space_id, chef_collab_spaces(id, name, description)')
    .eq('chef_id', chef.tenantId!)
    .limit(20)

  for (const csm of collabSpaces || []) {
    const space = csm.chef_collab_spaces
    if (!space) continue
    const hay = [space.name, space.description || ''].join(' ').toLowerCase()
    if (!hay.includes(needle)) continue
    results.push({
      id: makeId('collab_space', space.id),
      type: 'collab_space',
      title: space.name,
      snippet: space.description || 'Collaboration Space',
      url: `/network/spaces/${space.id}`,
    })
  }

  // Search hub circle messages (body - scoped to groups chef is a member of).
  try {
    const { data: hubProfile } = await db
      .from('hub_guest_profiles')
      .select('id')
      .eq('auth_user_id', chef.userId)
      .maybeSingle()

    if (hubProfile) {
      const { data: memberGroups } = await db
        .from('hub_group_members')
        .select('group_id')
        .eq('profile_id', hubProfile.id)

      if (memberGroups?.length) {
        const groupIds = memberGroups.map((m: any) => m.group_id)
        const { data: hubMessages } = await db
          .from('hub_messages')
          .select('id, body, group_id, created_at, hub_groups(name, group_token)')
          .in('group_id', groupIds)
          .ilike('body', q)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(8)

        for (const msg of hubMessages ?? []) {
          const group = msg.hub_groups
          results.push({
            id: makeId('hub_message', msg.id),
            type: 'hub_message',
            title: group?.name || 'Circle Message',
            snippet: msg.body?.slice(0, 120) || undefined,
            url: group?.group_token ? `/hub/g/${group.group_token}` : '/circles',
          })
        }
      }
    }
  } catch {
    // Non-blocking: hub message search failure doesn't break main search
  }

  // Search contracts (body_snapshot - scoped by chef_id).
  try {
    const { data: contracts } = await db
      .from('event_contracts')
      .select('id, event_id, status, body_snapshot, clients(full_name), events(occasion)')
      .eq('chef_id', chef.tenantId!)
      .ilike('body_snapshot', q)
      .order('created_at', { ascending: false })
      .limit(8)

    for (const contract of contracts ?? []) {
      const clientName = contract.clients?.full_name || 'Client'
      const occasion = contract.events?.occasion || ''
      // Extract a snippet around the match
      const bodyText = (contract.body_snapshot || '').replace(/<[^>]*>/g, '')
      const matchIdx = bodyText.toLowerCase().indexOf(safeQuery.toLowerCase())
      const snippetStart = Math.max(0, matchIdx - 40)
      const snippetText = bodyText.slice(snippetStart, snippetStart + 120)
      results.push({
        id: makeId('contract', contract.id),
        type: 'contract',
        title: `Contract: ${clientName}${occasion ? ` (${occasion})` : ''}`,
        snippet: snippetText || undefined,
        url: `/events/${contract.event_id}`,
        metadata: { badge: contract.status },
      })
    }
  } catch {
    // Non-blocking: contract search failure doesn't break main search
  }

  // Search recipes by ingredient name (find recipes containing matching ingredients).
  try {
    const { data: matchingIngredients } = await db
      .from('ingredients')
      .select('id, name')
      .eq('tenant_id', chef.tenantId!)
      .ilike('name', q)
      .limit(20)

    if (matchingIngredients?.length) {
      const ingredientIds = matchingIngredients.map((i: any) => i.id)
      const ingredientNames = new Map(matchingIngredients.map((i: any) => [i.id, i.name]))

      const { data: recipeIngredients } = await db
        .from('recipe_ingredients')
        .select('recipe_id, ingredient_id, recipes(id, name)')
        .in('ingredient_id', ingredientIds)
        .limit(20)

      if (recipeIngredients) {
        const existingRecipeIds = new Set(
          results.filter((r) => r.type === 'recipe').map((r) => r.id)
        )
        const seen = new Set<string>()
        for (const ri of recipeIngredients) {
          const recipe = ri.recipes
          if (!recipe || seen.has(recipe.id)) continue
          seen.add(recipe.id)
          // Skip if recipe already found by name search
          if (existingRecipeIds.has(makeId('recipe', recipe.id))) continue
          const ingName = ingredientNames.get(ri.ingredient_id)
          results.push({
            id: makeId('recipe', recipe.id),
            type: 'recipe',
            title: recipe.name,
            snippet: `Contains: ${ingName}`,
            url: `/recipes/${recipe.id}`,
          })
        }
      }
    }
  } catch {
    // Non-blocking: ingredient search failure doesn't break main search
  }

  const sectionLabels: Record<SearchResult['type'], string> = {
    page: 'Pages',
    client: 'Clients',
    event: 'Events',
    inquiry: 'Inquiries',
    menu: 'Menus',
    recipe: 'Recipes',
    quote: 'Quotes',
    expense: 'Expenses',
    partner: 'Partners',
    staff: 'Staff',
    note: 'Notes',
    message: 'Messages',
    conversation: 'Conversations',
    connection: 'Chef Network',
    handoff: 'Chef Network',
    collab_space: 'Chef Network',
    hub_message: 'Circle Messages',
    contract: 'Contracts',
  }

  // FC-G35: Score all results by relevance, sort within groups
  const scored = results.map((r) => ({
    ...r,
    _score: fuzzyScore([r.title, r.snippet || ''].join(' ').toLowerCase(), needle),
  }))
  scored.sort((a, b) => b._score - a._score)

  const grouped: Record<string, SearchResult[]> = {}
  for (const { _score, ...result } of scored) {
    const key = sectionLabels[result.type]
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(result)
  }

  // Also sort top-level results by relevance for flat display
  const sortedResults = scored.map(({ _score, ...r }) => r)

  return { results: sortedResults, grouped }
}
