// Smart Suggestions - surfaces actionable data gaps the chef can fix right now.
// Only shows cards where there's something to act on. Vanishes when everything is complete.

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'
import { ListCard, type ListCardItem } from '@/components/dashboard/widget-cards/list-card'
import { generateSuggestionPriority } from '@/lib/ai/suggestion-prioritizer'
import { loadResult } from '@/lib/reality/load-result'

interface RecipeGap {
  id: string
  name: string
  ingredient_count: number
  priced_count: number
}

interface ClientGap {
  id: string
  name: string
  missing: string[]
}

interface MenuGap {
  id: string
  name: string
  total_dishes: number
  costed_dishes: number
}

async function getRecipeGaps(tenantId: string): Promise<RecipeGap[]> {
  const result = await pgClient`
    SELECT
      r.id,
      r.name,
      COUNT(ri.id)::int AS ingredient_count,
      COUNT(ri.id) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM ingredient_price_history iph
          WHERE iph.ingredient_id = ri.ingredient_id
          AND iph.created_at > NOW() - INTERVAL '30 days'
        )
      )::int AS priced_count
    FROM recipes r
    JOIN recipe_ingredients ri ON ri.recipe_id = r.id
    WHERE r.tenant_id = ${tenantId}
    GROUP BY r.id, r.name
    HAVING COUNT(ri.id) > COUNT(ri.id) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM ingredient_price_history iph
        WHERE iph.ingredient_id = ri.ingredient_id
        AND iph.created_at > NOW() - INTERVAL '30 days'
      )
    )
    ORDER BY COUNT(ri.id) - COUNT(ri.id) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM ingredient_price_history iph
        WHERE iph.ingredient_id = ri.ingredient_id
        AND iph.created_at > NOW() - INTERVAL '30 days'
      )
    ) DESC
    LIMIT 5
  `
  return result as unknown as RecipeGap[]
}

async function getClientGaps(tenantId: string): Promise<ClientGap[]> {
  const result = await pgClient`
    SELECT
      id,
      COALESCE(full_name, first_name || ' ' || last_name, email) AS name,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN (dietary_restrictions IS NULL OR dietary_restrictions = '{}') THEN 'dietary info' END,
        CASE WHEN (allergies IS NULL OR allergies = '{}') THEN 'allergies' END,
        CASE WHEN phone IS NULL OR phone = '' THEN 'phone' END
      ], NULL) AS missing
    FROM clients
    WHERE tenant_id = ${tenantId}
    AND (
      (dietary_restrictions IS NULL OR dietary_restrictions = '{}')
      OR (allergies IS NULL OR allergies = '{}')
      OR phone IS NULL OR phone = ''
    )
    ORDER BY created_at DESC
    LIMIT 5
  `
  return result as unknown as ClientGap[]
}

async function getMenuGaps(tenantId: string): Promise<MenuGap[]> {
  const result = await pgClient`
    SELECT
      m.id,
      m.name,
      COUNT(DISTINCT mi.id)::int AS total_dishes,
      COUNT(DISTINCT mi.id) FILTER (
        WHERE mi.recipe_id IS NOT NULL
      )::int AS costed_dishes
    FROM menus m
    LEFT JOIN menu_items mi ON mi.menu_id = m.id
    WHERE m.tenant_id = ${tenantId}
    GROUP BY m.id, m.name
    HAVING COUNT(DISTINCT mi.id) = 0
      OR COUNT(DISTINCT mi.id) > COUNT(DISTINCT mi.id) FILTER (WHERE mi.recipe_id IS NOT NULL)
    ORDER BY m.updated_at DESC NULLS LAST
    LIMIT 5
  `
  return result as unknown as MenuGap[]
}

export async function SmartSuggestions() {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const [recipeGapsResult, clientGapsResult, menuGapsResult] = await Promise.all([
    loadResult('recipe gaps', () => getRecipeGaps(tenantId), {
      fallback: [] as RecipeGap[],
      log: (message, error) => console.error(`[Dashboard/SmartSuggestions] ${message}:`, error),
    }),
    loadResult('client gaps', () => getClientGaps(tenantId), {
      fallback: [] as ClientGap[],
      log: (message, error) => console.error(`[Dashboard/SmartSuggestions] ${message}:`, error),
    }),
    loadResult('menu gaps', () => getMenuGaps(tenantId), {
      fallback: [] as MenuGap[],
      log: (message, error) => console.error(`[Dashboard/SmartSuggestions] ${message}:`, error),
    }),
  ])

  const recipeGaps = recipeGapsResult.data
  const clientGaps = clientGapsResult.data
  const menuGaps = menuGapsResult.data
  const unavailableSections = [
    recipeGapsResult.status === 'unavailable' ? 'recipes' : null,
    clientGapsResult.status === 'unavailable' ? 'clients' : null,
    menuGapsResult.status === 'unavailable' ? 'menus' : null,
  ].filter((section): section is string => section !== null)

  if (unavailableSections.length > 0) {
    return (
      <div className="col-span-full rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-5">
        <p className="text-sm font-medium text-red-300">Suggestions are unavailable</p>
        <p className="mt-1 text-xs text-stone-400">
          Could not load {unavailableSections.join(', ')} suggestions. Try refreshing before using
          this dashboard as a source of truth.
        </p>
      </div>
    )
  }

  // If everything is complete, don't render at all
  const hasRecipeGaps = recipeGaps.length > 0
  const hasClientGaps = clientGaps.length > 0
  const hasMenuGaps = menuGaps.length > 0

  if (!hasRecipeGaps && !hasClientGaps && !hasMenuGaps) {
    return (
      <div className="col-span-full flex items-center gap-3 py-5 px-4 rounded-xl border border-emerald-900/30 bg-emerald-950/20">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-900/40 shrink-0">
          <svg
            className="w-4 h-4 text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-medium text-emerald-300">All caught up</p>
          <p className="text-xs text-stone-500">
            No data gaps. Recipes, menus, and client profiles look complete.
          </p>
        </div>
      </div>
    )
  }

  // Build recipe gap items
  const recipeItems: ListCardItem[] = recipeGaps.map((r) => ({
    id: r.id,
    label: r.name,
    sublabel: `${r.priced_count}/${r.ingredient_count} ingredients priced`,
    href: `/recipes/${r.id}`,
    status: r.priced_count === 0 ? ('red' as const) : ('amber' as const),
  }))

  // Build client gap items
  const clientItems: ListCardItem[] = clientGaps.map((c) => ({
    id: c.id,
    label: c.name || 'Unnamed client',
    sublabel: `Missing: ${c.missing.join(', ')}`,
    href: `/clients/${c.id}`,
    status: c.missing.length >= 2 ? ('amber' as const) : ('stone' as const),
  }))

  // Build menu gap items
  const menuItems: ListCardItem[] = menuGaps.map((m) => ({
    id: m.id,
    label: m.name || 'Untitled menu',
    sublabel:
      m.total_dishes === 0
        ? 'No dishes added'
        : `${m.costed_dishes}/${m.total_dishes} dishes linked to recipes`,
    href: `/culinary/menus/${m.id}`,
    status: m.total_dishes === 0 ? ('red' as const) : ('amber' as const),
  }))

  // AI: prioritize suggestions by business impact (non-blocking)
  const aiPriorityResult = await loadResult(
    'aiPriority',
    () =>
      generateSuggestionPriority({
        recipeGapsCount: recipeGaps.length,
        clientGapsCount: clientGaps.length,
        ingredientCoverage: 100,
        neverPricedCount: 0,
        staleCount: 0,
        menuGapsCount: menuGaps.length,
      }),
    {
      fallback: null,
      log: (message, error) => console.warn(`[Dashboard/SmartSuggestions] ${message}:`, error),
    }
  )
  const aiPriority = aiPriorityResult.status === 'ok' ? aiPriorityResult.data : null

  return (
    <>
      {/* AI Priority Insight */}
      {aiPriority && (
        <div className="col-span-full flex items-start gap-3 py-4 px-4 rounded-xl border border-amber-900/30 bg-amber-950/20">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-900/40 shrink-0 mt-0.5">
            <svg
              className="w-4 h-4 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-medium text-amber-300">Priority</p>
            <p className="text-xs text-stone-400">{aiPriority}</p>
          </div>
        </div>
      )}

      {/* Ingredient pricing coverage - admin only (OpenClaw/dev data, not chef-facing) */}

      {/* Recipes with unpriced ingredients */}
      {hasRecipeGaps && (
        <ListCard
          widgetId="suggestions-recipe-gaps"
          title="Recipes Need Pricing"
          count={recipeGaps.length}
          items={recipeItems}
          href="/recipes"
        />
      )}

      {/* Menus with gaps */}
      {hasMenuGaps && (
        <ListCard
          widgetId="suggestions-menu-gaps"
          title="Menus Incomplete"
          count={menuGaps.length}
          items={menuItems}
          href="/culinary/menus"
        />
      )}

      {/* Clients missing key info */}
      {hasClientGaps && (
        <ListCard
          widgetId="suggestions-client-gaps"
          title="Client Profiles Incomplete"
          count={clientGaps.length}
          items={clientItems}
          href="/clients"
        />
      )}
    </>
  )
}

export function SmartSuggestionsSkeleton() {
  return (
    <div className="col-span-full flex items-center justify-center py-6">
      <div className="h-3 w-32 loading-bone loading-bone-muted rounded" />
    </div>
  )
}
