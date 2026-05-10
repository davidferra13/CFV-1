'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type CulinaryActivity = {
  id: string
  type: 'recipe_created' | 'recipe_updated' | 'ingredient_added'
  name: string
  timestamp: string
  href: string
}

export async function getRecentCulinaryActivity(limit = 5): Promise<CulinaryActivity[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const [recipesResult, ingredientsResult] = await Promise.all([
    db
      .from('recipes')
      .select('id, name, created_at, updated_at')
      .eq('tenant_id', user.tenantId!)
      .eq('archived', false)
      .order('updated_at', { ascending: false })
      .limit(limit),
    db
      .from('ingredients')
      .select('id, name, created_at')
      .eq('tenant_id', user.tenantId!)
      .eq('archived', false)
      .order('created_at', { ascending: false })
      .limit(limit),
  ])

  const activities: CulinaryActivity[] = []

  for (const r of (recipesResult.data || []) as any[]) {
    const created = new Date(r.created_at).getTime()
    const updated = r.updated_at ? new Date(r.updated_at).getTime() : created
    const isUpdate = updated > created + 60_000

    activities.push({
      id: `recipe-${r.id}`,
      type: isUpdate ? 'recipe_updated' : 'recipe_created',
      name: r.name,
      timestamp: isUpdate ? r.updated_at : r.created_at,
      href: `/culinary/recipes/${r.id}`,
    })
  }

  for (const i of (ingredientsResult.data || []) as any[]) {
    activities.push({
      id: `ingredient-${i.id}`,
      type: 'ingredient_added',
      name: i.name,
      timestamp: i.created_at,
      href: `/culinary/ingredients`,
    })
  }

  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return activities.slice(0, limit)
}
