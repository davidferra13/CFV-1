// API v2: Goals - List & Create
// GET  /api/v2/goals?status=active&goal_type=revenue_monthly&page=1&per_page=50
// POST /api/v2/goals

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiAuth,
  apiSuccess,
  apiCreated,
  apiValidationError,
  apiError,
  parsePagination,
  paginationMeta,
} from '@/lib/api/v2'

const GOAL_TYPES = [
  'revenue_monthly',
  'revenue_annual',
  'revenue_custom',
  'profit_margin',
  'expense_ratio',
  'booking_count',
  'new_clients',
  'repeat_booking_rate',
  'referrals_received',
  'dishes_created',
  'cuisines_explored',
  'workshops_attended',
  'recipe_library',
  'review_average',
  'total_reviews',
  'staff_training_hours',
  'vendor_relationships',
  'books_read',
  'courses_completed',
  'weekly_workouts',
  'rest_days_taken',
  'family_dinners',
  'vacation_days',
  'charity_events',
  'meals_donated',
] as const

const CreateGoalBody = z.object({
  goal_type: z.enum(GOAL_TYPES),
  label: z.string().trim().min(1).max(100),
  target_value: z.number().int().min(0),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  nudge_enabled: z.boolean().default(true),
  nudge_level: z.enum(['gentle', 'standard', 'aggressive']).default('standard'),
  notes: z.string().max(500).nullable().optional(),
})

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const pagination = parsePagination(url)
    const status = url.searchParams.get('status')
    const goalType = url.searchParams.get('goal_type')

    let query = (ctx.db as any)
      .from('chef_goals')
      .select('*', { count: 'exact' })
      .eq('tenant_id', ctx.tenantId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (goalType) query = query.eq('goal_type', goalType)

    const from = (pagination.page - 1) * pagination.per_page
    const to = from + pagination.per_page - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) return apiError('database_error', 'Failed to fetch goals', 500)

    return apiSuccess(data ?? [], paginationMeta(pagination, count ?? 0))
  },
  { scopes: ['goals:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CreateGoalBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const input = parsed.data

    if (input.period_start > input.period_end) {
      return apiError('invalid_period', 'period_start must be before or equal to period_end', 422)
    }

    // Determine tracking method from goal type metadata
    const autoTrackedTypes = [
      'revenue_monthly',
      'revenue_annual',
      'revenue_custom',
      'profit_margin',
      'expense_ratio',
      'booking_count',
      'new_clients',
      'repeat_booking_rate',
      'recipe_library',
      'review_average',
      'total_reviews',
    ]
    const trackingMethod = autoTrackedTypes.includes(input.goal_type) ? 'auto' : 'manual_count'

    const { data, error } = await (ctx.db as any)
      .from('chef_goals')
      .insert({
        tenant_id: ctx.tenantId,
        goal_type: input.goal_type,
        label: input.label,
        target_value: input.target_value,
        period_start: input.period_start,
        period_end: input.period_end,
        nudge_enabled: input.nudge_enabled,
        nudge_level: input.nudge_level,
        notes: input.notes ?? null,
        tracking_method: trackingMethod,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      console.error('[api/v2/goals] Create error:', error)
      return apiError('create_failed', 'Failed to create goal', 500)
    }

    return apiCreated(data)
  },
  { scopes: ['goals:write'] }
)
