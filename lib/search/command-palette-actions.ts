'use server'

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'
import { universalSearch as rawUniversalSearch } from './universal-search'
import type {
  EntityType,
  CommandSearchResult,
  QuickAction,
  SearchHistoryRow,
  SearchActionResult,
} from './command-palette-types'

// ── Type icon mapping (shared with client) ───────────────────────

const TYPE_ICONS: Record<string, string> = {
  event: 'Cal',
  client: 'Usr',
  menu: 'Mnu',
  recipe: 'Rcp',
  ingredient: 'Ing',
  inquiry: 'Inq',
  quote: 'Qt',
  expense: 'Exp',
  partner: 'Ptr',
  staff: 'Stf',
  dish: 'Dsh',
  contract: 'Con',
  message: 'Msg',
  conversation: 'Cht',
  page: 'Pg',
}

// ── 1. Universal search with optional type filter ────────────────

export async function paletteSearch(
  query: string,
  options?: { types?: EntityType[]; limit?: number }
): Promise<CommandSearchResult[]> {
  if (!query || query.length < 2) return []

  // Auth gate (also validates tenant)
  await requireChef()

  const response = await rawUniversalSearch(query)
  let results = response.results

  // Filter by entity types if specified
  if (options?.types && options.types.length > 0) {
    const allowed = new Set<string>(options.types)
    results = results.filter((r) => allowed.has(r.type))
  }

  // Apply limit
  const limit = Math.min(options?.limit ?? 50, 100)
  results = results.slice(0, limit)

  // Map to CommandSearchResult with icons and relevance scores
  return results.map((r, idx) => ({
    id: r.id,
    type: r.type as EntityType | 'page',
    label: r.title,
    description: r.snippet,
    href: r.url,
    icon: TYPE_ICONS[r.type] || '?',
    relevanceScore: 100 - idx,
    metadata: r.metadata,
  }))
}

// ── 2. Get recent searches from DB ───────────────────────────────

export async function getRecentSearches(limit?: number): Promise<SearchHistoryRow[]> {
  const chef = await requireChef()
  const cap = Math.min(limit ?? 10, 50)

  try {
    const rows = await pgClient.unsafe(
      `SELECT id, chef_id, query, selected_result_type, selected_result_id,
              selected_result_label, created_at
       FROM search_history
       WHERE chef_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [chef.tenantId!, cap]
    )
    return (rows as any[]).map((r) => ({
      id: r.id,
      chefId: r.chef_id,
      query: r.query,
      selectedResultType: r.selected_result_type,
      selectedResultId: r.selected_result_id,
      selectedResultLabel: r.selected_result_label,
      createdAt: r.created_at,
    }))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    // Table might not exist yet (migration pending)
    if (msg.includes('does not exist')) return []
    console.error('[getRecentSearches]', msg)
    return []
  }
}

// ── 3. Log a search to DB ────────────────────────────────────────

export async function logSearch(
  query: string,
  selectedResult?: { type: string; id: string; label: string }
): Promise<SearchActionResult> {
  if (!query || query.trim().length < 2) return { success: false, error: 'Query too short' }

  const chef = await requireChef()

  try {
    await pgClient.unsafe(
      `INSERT INTO search_history (chef_id, query, selected_result_type, selected_result_id, selected_result_label)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        chef.tenantId!,
        query.trim().slice(0, 200),
        selectedResult?.type ?? null,
        selectedResult?.id ?? null,
        selectedResult?.label?.slice(0, 200) ?? null,
      ]
    )
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('does not exist')) return { success: true } // graceful if migration pending
    console.error('[logSearch]', msg)
    return { success: false, error: msg }
  }
}

// ── 4. Get quick actions ─────────────────────────────────────────

export async function getQuickActions(): Promise<QuickAction[]> {
  await requireChef()

  return [
    {
      id: 'qa-new-event',
      label: 'New Event',
      description: 'Create a new event',
      href: '/events/new',
      shortcut: 'N E',
      icon: '+',
    },
    {
      id: 'qa-new-client',
      label: 'New Client',
      description: 'Add a new client',
      href: '/clients/new',
      shortcut: 'N C',
      icon: '+',
    },
    {
      id: 'qa-new-menu',
      label: 'New Menu',
      description: 'Create a new menu',
      href: '/menus/new',
      shortcut: 'N M',
      icon: '+',
    },
    {
      id: 'qa-new-recipe',
      label: 'New Recipe',
      description: 'Create a new recipe',
      href: '/recipes/new',
      shortcut: 'N R',
      icon: '+',
    },
    {
      id: 'qa-new-quote',
      label: 'New Quote',
      description: 'Draft a new quote',
      href: '/quotes/new',
      icon: '+',
    },
    {
      id: 'qa-new-inquiry',
      label: 'New Inquiry',
      description: 'Log a new inquiry',
      href: '/inquiries/new',
      icon: '+',
    },
    {
      id: 'qa-new-expense',
      label: 'New Expense',
      description: 'Record an expense',
      href: '/expenses/new',
      icon: '+',
    },
    {
      id: 'qa-open-remy',
      label: 'Open Remy',
      description: 'Open the AI assistant',
      icon: 'AI',
      action: 'open-remy',
    },
  ]
}

// ── 5. Clear recent searches ─────────────────────────────────────

export async function clearRecentSearches(): Promise<SearchActionResult> {
  const chef = await requireChef()

  try {
    await pgClient.unsafe(`DELETE FROM search_history WHERE chef_id = $1`, [chef.tenantId!])
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('does not exist')) return { success: true }
    console.error('[clearRecentSearches]', msg)
    return { success: false, error: msg }
  }
}
