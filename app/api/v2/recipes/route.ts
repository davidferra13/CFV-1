// API v2: Recipes - List (Read-Only)
// GET /api/v2/recipes?category=...&cuisine=...&page=1&per_page=50
//
// Recipes are read-only via API. Recipe creation is manual-only
// (AI must never generate recipes, and the API follows the same boundary).

import { withApiAuth, apiSuccess, apiError, parsePagination, paginationMeta } from '@/lib/api/v2'

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const pagination = parsePagination(url)
    const category = url.searchParams.get('category')
    const cuisine = url.searchParams.get('cuisine')
    const q = url.searchParams.get('q')

    let query = ctx.supabase
      .from('recipes')
      .select(
        'id, recipe_name, category, cuisine, meal_type, prep_time_minutes, cook_time_minutes, difficulty, dietary_tags, seasonal, created_at, updated_at',
        {
          count: 'exact',
        }
      )
      .eq('tenant_id', ctx.tenantId)
      .order('recipe_name', { ascending: true })

    if (category) query = query.eq('category', category as any)
    if (cuisine) query = query.eq('cuisine', cuisine as any)
    if (q) query = query.ilike('recipe_name', `%${q}%`)

    const from = (pagination.page - 1) * pagination.per_page
    const to = from + pagination.per_page - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) return apiError('database_error', 'Failed to fetch recipes', 500)

    return apiSuccess(data ?? [], paginationMeta(pagination, count ?? 0))
  },
  { scopes: ['recipes:read'] }
)
