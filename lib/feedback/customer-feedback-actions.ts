// Customer Feedback - Chef-facing Server Actions
// Deterministic NPS calculation (Formula > AI)

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

/**
 * Create a feedback request for a given entity (event, order, etc.)
 */
export async function createFeedbackRequest(input: {
  entityType: string
  entityId: string
  clientName: string
  clientEmail?: string
  clientPhone?: string
}): Promise<{ success: boolean; token?: string; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const token = crypto.randomBytes(24).toString('hex')

  const { error } = await supabase.from('feedback_requests').insert({
    tenant_id: user.tenantId!,
    entity_type: input.entityType,
    entity_id: input.entityId,
    client_name: input.clientName,
    client_email: input.clientEmail || null,
    client_phone: input.clientPhone || null,
    token,
    status: 'pending',
  })

  if (error) {
    console.error('[createFeedbackRequest] Error:', error)
    return { success: false, error: 'Failed to create feedback request' }
  }

  revalidatePath('/feedback')
  return { success: true, token }
}

/**
 * List all feedback requests with optional status filter
 */
export async function getFeedbackRequests(status?: string): Promise<any[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('feedback_requests')
    .select('*, feedback_responses(id, rating, comment, tags, would_recommend, created_at)')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(200)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getFeedbackRequests] Error:', error)
    throw new Error('Failed to fetch feedback requests')
  }

  return data || []
}

/**
 * Get feedback for a specific entity (event, order, etc.)
 */
export async function getFeedbackForEntity(entityType: string, entityId: string): Promise<any[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('feedback_requests')
    .select('*, feedback_responses(id, rating, comment, tags, would_recommend, created_at)')
    .eq('tenant_id', user.tenantId!)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)

  if (error) {
    console.error('[getFeedbackForEntity] Error:', error)
    return []
  }

  return data || []
}

/**
 * Overall ratings and distribution
 */
export async function getOverallRatings(days?: number): Promise<{
  averageRating: number
  totalResponses: number
  distribution: Record<number, number>
  responseRate: number
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let responseQuery = supabase
    .from('feedback_responses')
    .select('rating')
    .eq('tenant_id', user.tenantId!)

  let requestQuery = supabase
    .from('feedback_requests')
    .select('id, status')
    .eq('tenant_id', user.tenantId!)

  if (days) {
    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString()
    responseQuery = responseQuery.gte('created_at', sinceStr)
    requestQuery = requestQuery.gte('created_at', sinceStr)
  }

  const [responseResult, requestResult] = await Promise.all([responseQuery, requestQuery])

  const responses = responseResult.data || []
  const requests = requestResult.data || []

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let totalRating = 0

  for (const r of responses) {
    distribution[r.rating] = (distribution[r.rating] || 0) + 1
    totalRating += r.rating
  }

  const totalResponses = responses.length
  const totalRequests = requests.length
  const completedRequests = requests.filter((r: any) => r.status === 'completed').length

  return {
    averageRating: totalResponses > 0 ? Math.round((totalRating / totalResponses) * 10) / 10 : 0,
    totalResponses,
    distribution,
    responseRate: totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0,
  }
}

/**
 * NPS Score (deterministic calculation)
 * Promoters: would_recommend = true AND rating >= 4
 * Detractors: would_recommend = false OR rating <= 2
 * NPS = (promoters - detractors) / total * 100
 */
export async function getNPSScore(days?: number): Promise<{
  score: number
  promoters: number
  passives: number
  detractors: number
  total: number
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('feedback_responses')
    .select('rating, would_recommend')
    .eq('tenant_id', user.tenantId!)

  if (days) {
    const since = new Date()
    since.setDate(since.getDate() - days)
    query = query.gte('created_at', since.toISOString())
  }

  const { data, error } = await query

  if (error) {
    console.error('[getNPSScore] Error:', error)
    return { score: 0, promoters: 0, passives: 0, detractors: 0, total: 0 }
  }

  const responses = data || []
  let promoters = 0
  let detractors = 0
  let passives = 0

  for (const r of responses) {
    const isPromoter = r.would_recommend === true && r.rating >= 4
    const isDetractor = r.would_recommend === false || r.rating <= 2

    if (isPromoter) promoters++
    else if (isDetractor) detractors++
    else passives++
  }

  const total = responses.length
  const score = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0

  return { score, promoters, passives, detractors, total }
}

/**
 * Average rating trend over time (weekly buckets)
 */
export async function getFeedbackTrend(
  days = 90
): Promise<{ weekStart: string; averageRating: number; count: number }[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('feedback_responses')
    .select('rating, created_at')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getFeedbackTrend] Error:', error)
    return []
  }

  // Group by week
  const weeklyData = new Map<string, { total: number; count: number }>()

  for (const r of data || []) {
    const date = new Date(r.created_at)
    const dayOfWeek = date.getDay()
    const weekStart = new Date(date)
    weekStart.setDate(weekStart.getDate() - dayOfWeek)
    const key = weekStart.toISOString().slice(0, 10)

    const current = weeklyData.get(key) || { total: 0, count: 0 }
    current.total += r.rating
    current.count += 1
    weeklyData.set(key, current)
  }

  return Array.from(weeklyData.entries()).map(([weekStart, data]) => ({
    weekStart,
    averageRating: Math.round((data.total / data.count) * 10) / 10,
    count: data.count,
  }))
}

/**
 * Tag breakdown across all feedback
 */
export async function getTagBreakdown(): Promise<
  { tag: string; count: number; percentage: number }[]
> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('feedback_responses')
    .select('tags')
    .eq('tenant_id', user.tenantId!)
    .not('tags', 'is', null)

  if (error) {
    console.error('[getTagBreakdown] Error:', error)
    return []
  }

  const tagCounts = new Map<string, number>()
  let totalTagged = 0

  for (const r of data || []) {
    if (r.tags && Array.isArray(r.tags)) {
      totalTagged++
      for (const tag of r.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      }
    }
  }

  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({
      tag,
      count,
      percentage: totalTagged > 0 ? Math.round((count / totalTagged) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
}
