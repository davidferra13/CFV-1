// Menu Detail - Protected by layout

import { requireChef } from '@/lib/auth/get-user'
import { getMenuById, getMenuEvent } from '@/lib/menus/actions'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { MenuDetailClient } from './menu-detail-client'

type Props = {
  params: Promise<{ id: string }>
}

export default async function MenuDetailPage({ params }: Props) {
  const user = await requireChef()
  const { id } = await params

  const [menu, event] = await Promise.all([
    getMenuById(id),
    getMenuEvent(id)
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

  let recipeMap: Record<string, { id: string; name: string; category: string }> = {}
  if (recipeIds.size > 0) {
    const supabase = createServerClient()
    const { data: recipes } = await supabase
      .from('recipes')
      .select('id, name, category')
      .in('id', Array.from(recipeIds))
      .eq('tenant_id', user.tenantId!)

    if (recipes) {
      recipeMap = Object.fromEntries(recipes.map(r => [r.id, r]))
    }
  }

  return <MenuDetailClient menu={menu} event={event} recipeMap={recipeMap} />
}
