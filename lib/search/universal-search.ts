'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
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
    | 'note'
    | 'message'
    | 'conversation'
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
  const supabase: any = createServerClient()
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

  for (const [href, page] of pageMap.entries()) {
    const haystack = [page.title, page.snippet || '', href, ...Array.from(page.keywords)]
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(needle)) continue
    results.push({
      id: makeId('page', href),
      type: 'page',
      title: page.title,
      snippet: page.snippet,
      url: href,
    })
  }

  // Search clients (full_name, email, phone - scoped by tenant_id).
  const { data: clients } = await supabase
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
  const { data: events } = await supabase
    .from('events')
    .select('id, occasion, event_date, status, location_address, special_requests')
    .eq('tenant_id', chef.tenantId!)
    .or(`occasion.ilike.${q},location_address.ilike.${q},special_requests.ilike.${q}`)
    .limit(8)

  if (events) {
    for (const event of events) {
      results.push({
        id: makeId('event', event.id),
        type: 'event',
        title: event.occasion || `Event ${event.event_date}`,
        snippet: `${event.event_date} - ${event.status}`,
        url: `/events/${event.id}`,
        metadata: { badge: event.status },
      })
    }
  }

  // Search inquiries (message, occasion, status - scoped by tenant_id).
  const { data: inquiries } = await supabase
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
  const { data: menus } = await supabase
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
  const { data: recipes } = await supabase
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
  const { data: quotes } = await supabase
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
  const { data: expenses } = await supabase
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
  const { data: partners } = await supabase
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

  // Search client notes (note_text - scoped by tenant_id).
  const { data: notes } = await supabase
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
  const { data: messages } = await supabase
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
  const { data: conversations } = await supabase
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
    note: 'Notes',
    message: 'Messages',
    conversation: 'Conversations',
  }

  const grouped: Record<string, SearchResult[]> = {}
  for (const result of results) {
    const key = sectionLabels[result.type]
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(result)
  }

  return { results, grouped }
}
