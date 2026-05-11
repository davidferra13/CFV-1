// GET /recipes/csv-export - Downloads all recipes as a CSV file.

import { NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { csvRowSafe as row } from '@/lib/security/csv-sanitize'

export async function GET() {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch recipes and their ingredients (with allergen flags) in parallel
  const [recipesResult, ingredientsResult] = await Promise.all([
    db
      .from('recipes')
      .select(
        'id, name, description, category, cuisine, servings, prep_time_minutes, cook_time_minutes, total_time_minutes, difficulty, dietary_tags, notes, created_at'
      )
      .eq('tenant_id', user.tenantId!)
      .is('deleted_at', null)
      .order('name'),
    db
      .from('recipe_ingredients')
      .select('recipe_id, ingredients!inner(name, allergen_flags)')
      .in(
        'recipe_id',
        db.from('recipes').select('id').eq('tenant_id', user.tenantId!).is('deleted_at', null)
      ),
  ])

  const recipes = recipesResult.data ?? []

  // Build maps: recipe_id -> ingredient names, recipe_id -> allergen flags
  const ingredientMap = new Map<string, string[]>()
  const allergenMap = new Map<string, string[]>()
  for (const ri of (ingredientsResult.data ?? []) as {
    recipe_id: string
    ingredients: { name: string; allergen_flags: string[] }
  }[]) {
    const names = ingredientMap.get(ri.recipe_id) ?? []
    names.push(ri.ingredients.name)
    ingredientMap.set(ri.recipe_id, names)

    const flags = allergenMap.get(ri.recipe_id) ?? []
    for (const f of ri.ingredients.allergen_flags ?? []) {
      if (!flags.includes(f)) flags.push(f)
    }
    allergenMap.set(ri.recipe_id, flags)
  }

  const header = row([
    'Name',
    'Description',
    'Category',
    'Cuisine',
    'Servings',
    'Prep Time (min)',
    'Cook Time (min)',
    'Total Time (min)',
    'Difficulty',
    'Dietary Tags',
    'Allergens',
    'Ingredients',
    'Notes',
    'Created',
  ])

  const body = recipes.map((r: any) => {
    const ingredients = ingredientMap.get(r.id) ?? []
    const allergens = allergenMap.get(r.id) ?? []
    return row([
      r.name,
      r.description ?? '',
      r.category ?? '',
      r.cuisine ?? '',
      r.servings != null ? r.servings : '',
      r.prep_time_minutes != null ? r.prep_time_minutes : '',
      r.cook_time_minutes != null ? r.cook_time_minutes : '',
      r.total_time_minutes != null ? r.total_time_minutes : '',
      r.difficulty != null ? r.difficulty : '',
      Array.isArray(r.dietary_tags) ? r.dietary_tags.join('; ') : '',
      allergens.join('; '),
      ingredients.join(', '),
      r.notes ?? '',
      r.created_at ? new Date(r.created_at).toLocaleDateString('en-US') : '',
    ])
  })

  const csv = [header, ...body].join('\n')
  const dateStr = ((d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)(
    new Date()
  )

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="recipes-${dateStr}.csv"`,
    },
  })
}
