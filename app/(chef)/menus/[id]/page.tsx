// Menu Detail - Protected by layout

import { requireChef } from '@/lib/auth/get-user'
import { getMenuById, getMenuCostSummaries, getMenuEvent } from '@/lib/menus/actions'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/db/server'
import { MenuDetailClient } from './menu-detail-client'
import { getMenuRecommendations } from '@/lib/analytics/menu-recommendations'
import { MenuRecommendationHints } from '@/components/analytics/menu-recommendation-hints'
import { ConstraintRecipePicker } from '@/components/menus/constraint-recipe-picker'
import { getConstraintRecipePicks } from '@/lib/menus/constraint-recipe-picker-actions'
import { getMenuInquiryLink } from '@/lib/menus/menu-intelligence-actions'
import { evaluateCompletion } from '@/lib/completion/engine'
import Link from 'next/link'

type Props = {
  params: Promise<{ id: string }>
}

export default async function MenuDetailPage({ params }: Props) {
  const user = await requireChef()
  const { id } = await params

  // Critical fetch: menu itself (notFound if missing)
  const menu = await getMenuById(id)
  if (!menu) {
    notFound()
  }

  // Non-critical fetches: degrade gracefully on failure
  const [event, costSummaries] = await Promise.all([
    getMenuEvent(id).catch((err) => {
      console.error('[menu-detail] Event fetch failed (non-blocking):', err.message)
      return null
    }),
    getMenuCostSummaries().catch((err) => {
      console.error('[menu-detail] Cost summaries fetch failed (non-blocking):', err.message)
      return [] as Awaited<ReturnType<typeof getMenuCostSummaries>>
    }),
  ])

  // Collect recipe_ids from components to fetch recipe names
  const recipeIds = new Set<string>()
  for (const dish of menu.dishes) {
    for (const comp of dish.components) {
      if (comp.recipe_id) {
        recipeIds.add(comp.recipe_id)
      }
    }
  }

  const [recipeMapResult, recommendations, constraintRecipePicks, inquiryLink, completionData] =
    await Promise.all([
    recipeIds.size > 0
      ? createServerClient()
          .from('recipes' as any)
          .select(
            'id, name, category, calories_per_serving, protein_per_serving_g, fat_per_serving_g, carbs_per_serving_g'
          )
          .in('id', Array.from(recipeIds))
          .eq('tenant_id', user.tenantId!)
          .then((res: any) => res)
          .catch((err: any) => {
            console.error('[menu-detail] Recipe map fetch failed (non-blocking):', err.message)
            return { data: null }
          })
      : Promise.resolve({ data: null }),
    getMenuRecommendations({
      dietaryRestrictions: (event as any)?.dietary_restrictions ?? [],
      allergies: (event as any)?.allergies ?? [],
    }).catch(() => null),
    getConstraintRecipePicks({
      eventId: (event as any)?.id,
      dietaryTags: (event as any)?.dietary_restrictions ?? [],
      allergies: (event as any)?.allergies ?? [],
    }).catch((err) => {
      console.error('[menu-detail] Constraint recipe picker failed (non-blocking):', err.message)
      return {
        status: 'error' as const,
        picks: [],
        dietaryTags: (event as any)?.dietary_restrictions ?? [],
        allergies: (event as any)?.allergies ?? [],
        filteredOutCount: 0,
        error: 'Could not load constraint recipe picks.',
      }
    }),
    getMenuInquiryLink(id).catch(() => null),
    evaluateCompletion('menu', id, user.tenantId!).catch(() => null),
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
    recipeMap = Object.fromEntries((recipeMapResult.data as any[]).map((r: any) => [r.id, r]))
  }

  return (
    <div className="space-y-6">
      {inquiryLink && (
        <div className="flex items-center gap-2 px-1">
          <Link
            href={`/inquiries/${inquiryLink.inquiryId}`}
            className="text-sm text-stone-400 hover:text-stone-200 transition-colors"
          >
            ← Back to Inquiry
          </Link>
          {inquiryLink.inquiryStatus && (
            <span className="text-xs text-stone-500">
              ({inquiryLink.inquiryStatus.replace(/_/g, ' ')})
            </span>
          )}
        </div>
      )}
      <MenuDetailClient
        menu={menu}
        event={event}
        recipeMap={recipeMap}
        costSummary={costSummaries.find((summary) => summary.menu_id === menu.id) || null}
        initialCompletion={completionData}
      />
      {recommendations && <MenuRecommendationHints result={recommendations} />}
      <ConstraintRecipePicker result={constraintRecipePicks} />
    </div>
  )
}
