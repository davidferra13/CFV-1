// Menu Detail - Protected by layout

import { requireChef } from '@/lib/auth/get-user'
import { getMenuById, getMenuCostSummaries, getMenuEvent } from '@/lib/menus/actions'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { MenuDetailClient } from './menu-detail-client'
import { getMenuRecommendations } from '@/lib/analytics/menu-recommendations'
import { MenuRecommendationHints } from '@/components/analytics/menu-recommendation-hints'

type Props = {
  params: Promise<{ id: string }>
}

export default async function MenuDetailPage({ params }: Props) {
  const user = await requireChef()
  const { id } = await params

  const [menu, event, costSummaries] = await Promise.all([
    getMenuById(id),
    getMenuEvent(id),
    getMenuCostSummaries(),
  ])

  if (!menu) {
    notFound()
  }

  // Collect recipe_ids from components to fetch recipe names
  const recipeIds = new Set<string>()
  for (const dish of menu.dishes) {
    for (const comp of dish.components) {
      if (comp.recipe_id) {
        recipeIds.add(comp.recipe_id)
      }
    }
  }

  const [recipeMapResult, recommendations] = await Promise.all([
    recipeIds.size > 0
      ? createServerClient()
          .from('recipes' as any)
          .select(
            'id, name, category, calories_per_serving, protein_per_serving_g, fat_per_serving_g, carbs_per_serving_g'
          )
          .in('id', Array.from(recipeIds))
          .eq('tenant_id', user.tenantId!)
      : Promise.resolve({ data: null }),
    getMenuRecommendations({
      dietaryRestrictions: (event as any)?.dietary_restrictions ?? [],
      allergies: (event as any)?.allergies ?? [],
    }).catch(() => null),
  ])

  let recipeMap: Record<
    string,
    {
      id: string
      name: string
      category: string
      calories_per_serving: number | null
      protein_per_serving_g: number | null
      fat_per_serving_g: number | null
      carbs_per_serving_g: number | null
    }
  > = {}
  if (recipeMapResult.data) {
    recipeMap = Object.fromEntries(recipeMapResult.data.map((r) => [r.id, r]))
  }

  return (
    <div className="space-y-6">
      <MenuDetailClient
        menu={menu}
        event={event}
        recipeMap={recipeMap}
        costSummary={costSummaries.find((summary) => summary.menu_id === menu.id) || null}
      />
      {recommendations && <MenuRecommendationHints result={recommendations} />}
    </div>
  )
}
