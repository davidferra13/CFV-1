// API v2: Universal Search
// GET /api/v2/search?q=term&type=events|clients|quotes|recipes&limit=20

import { withApiAuth, apiSuccess, apiError } from '@/lib/api/v2'

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const q = url.searchParams.get('q')
    const type = url.searchParams.get('type')
    const rawLimit = Number(url.searchParams.get('limit') ?? '20')
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 20

    if (!q || q.trim().length < 2) {
      return apiError('invalid_query', 'Search query must be at least 2 characters', 400)
    }

    const searchTerm = `%${q.trim()}%`
    const results: Record<string, unknown[]> = {}

    // Search events
    if (!type || type === 'events') {
      const { data } = await ctx.supabase
        .from('events')
        .select('id, occasion, event_date, status, guest_count, location_city')
        .eq('tenant_id', ctx.tenantId)
        .is('deleted_at', null)
        .or(`occasion.ilike.${searchTerm},location_city.ilike.${searchTerm}`)
        .limit(limit)

      results.events = data ?? []
    }

    // Search clients
    if (!type || type === 'clients') {
      const { data } = await ctx.supabase
        .from('clients')
        .select('id, full_name, email, phone, status')
        .eq('chef_id', ctx.tenantId)
        .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
        .limit(limit)

      results.clients = data ?? []
    }

    // Search quotes
    if (!type || type === 'quotes') {
      const { data } = await ctx.supabase
        .from('quotes')
        .select('id, quote_name, status, total_quoted_cents')
        .eq('tenant_id', ctx.tenantId)
        .ilike('quote_name', searchTerm)
        .limit(limit)

      results.quotes = data ?? []
    }

    // Search recipes
    if (!type || type === 'recipes') {
      const { data } = await ctx.supabase
        .from('recipes')
        .select('id, recipe_name, category, cuisine')
        .eq('tenant_id', ctx.tenantId)
        .ilike('recipe_name', searchTerm)
        .limit(limit)

      results.recipes = data ?? []
    }

    return apiSuccess(results)
  },
  { scopes: ['search:read'] }
)
