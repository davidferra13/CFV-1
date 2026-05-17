'use server'

import { requireAdmin } from '@/lib/auth/admin'
import { createServerClient } from '@/lib/db/server'
import type {
  RateLimitRule,
  RateLimitEvent,
  RateLimitStats,
  RateLimitConfig,
} from './rate-limit-types'

// ---------------------------------------------------------------------------
// 7. getDefaultRules - recommended rules for token-based public routes
// ---------------------------------------------------------------------------
export async function getDefaultRules(): Promise<RateLimitRule[]> {
  await requireAdmin()
  return [
    {
      id: 'default-proposal',
      pathPattern: '/proposal/*',
      maxRequests: 10,
      windowSeconds: 60,
      action: 'block',
      enabled: true,
      description: 'Proposal token pages: 10 req/min',
    },
    {
      id: 'default-tip',
      pathPattern: '/tip/*',
      maxRequests: 5,
      windowSeconds: 60,
      action: 'block',
      enabled: true,
      description: 'Tip token pages: 5 req/min',
    },
    {
      id: 'default-share',
      pathPattern: '/share/*',
      maxRequests: 20,
      windowSeconds: 60,
      action: 'throttle',
      enabled: true,
      description: 'Share token pages: 20 req/min',
    },
    {
      id: 'default-join',
      pathPattern: '/join/*',
      maxRequests: 10,
      windowSeconds: 60,
      action: 'block',
      enabled: true,
      description: 'Join token pages: 10 req/min',
    },
    {
      id: 'default-api-public',
      pathPattern: '/api/public/*',
      maxRequests: 30,
      windowSeconds: 60,
      action: 'block',
      enabled: true,
      description: 'Public API endpoints: 30 req/min',
    },
  ]
}

// ---------------------------------------------------------------------------
// 1. getRateLimitConfig - current config with all rules
// ---------------------------------------------------------------------------
export async function getRateLimitConfig(): Promise<RateLimitConfig> {
  await requireAdmin()
  const db: any = createServerClient()

  const { data: rules } = await db
    .from('rate_limit_rules')
    .select('*')
    .order('created_at', { ascending: true })

  const mappedRules: RateLimitRule[] = (rules || []).map((r: any) => ({
    id: r.id,
    pathPattern: r.path_pattern,
    maxRequests: r.max_requests,
    windowSeconds: r.window_seconds,
    action: r.action,
    enabled: r.enabled,
    description: r.description || '',
  }))

  return {
    globalEnabled: mappedRules.some((r) => r.enabled),
    defaultMaxRequests: 10,
    defaultWindowSeconds: 60,
    whitelistedIPs: [],
    rules: mappedRules,
  }
}

// ---------------------------------------------------------------------------
// 2. updateRateLimitRule - create or update a rule
// ---------------------------------------------------------------------------
export async function updateRateLimitRule(
  rule: Partial<RateLimitRule> & { id?: string; pathPattern: string }
): Promise<{ success: boolean; id: string }> {
  await requireAdmin()
  const db: any = createServerClient()

  if (rule.id) {
    const { error } = await db
      .from('rate_limit_rules')
      .update({
        path_pattern: rule.pathPattern,
        max_requests: rule.maxRequests ?? 10,
        window_seconds: rule.windowSeconds ?? 60,
        action: rule.action ?? 'block',
        enabled: rule.enabled ?? true,
        description: rule.description ?? null,
      })
      .eq('id', rule.id)

    if (error) throw new Error(`Failed to update rate limit rule: ${error.message}`)
    return { success: true, id: rule.id }
  }

  const { data, error } = await db
    .from('rate_limit_rules')
    .insert({
      path_pattern: rule.pathPattern,
      max_requests: rule.maxRequests ?? 10,
      window_seconds: rule.windowSeconds ?? 60,
      action: rule.action ?? 'block',
      enabled: rule.enabled ?? true,
      description: rule.description ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create rate limit rule: ${error.message}`)
  return { success: true, id: data.id }
}

// ---------------------------------------------------------------------------
// 3. deleteRateLimitRule - remove a rule
// ---------------------------------------------------------------------------
export async function deleteRateLimitRule(ruleId: string): Promise<{ success: boolean }> {
  await requireAdmin()
  const db: any = createServerClient()

  const { error } = await db.from('rate_limit_rules').delete().eq('id', ruleId)

  if (error) throw new Error(`Failed to delete rate limit rule: ${error.message}`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// 4. toggleRateLimit - enable/disable globally (toggles all rules)
// ---------------------------------------------------------------------------
export async function toggleRateLimit(enabled: boolean): Promise<{ success: boolean }> {
  await requireAdmin()
  const db: any = createServerClient()

  const { error } = await db
    .from('rate_limit_rules')
    .update({ enabled })
    .neq('id', '00000000-0000-0000-0000-000000000000') // match all rows

  if (error) throw new Error(`Failed to toggle rate limiting: ${error.message}`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// 5. getRateLimitStats - stats from recent events
// ---------------------------------------------------------------------------
export async function getRateLimitStats(hoursBack: number = 24): Promise<RateLimitStats> {
  await requireAdmin()
  const db: any = createServerClient()

  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString()

  const { data: events } = await db
    .from('rate_limit_events')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  const rows: any[] = events || []

  const totalRequests = rows.length
  const blockedRequests = rows.filter((e) => e.blocked).length

  // Top paths
  const pathCounts: Record<string, number> = {}
  for (const e of rows) {
    pathCounts[e.path] = (pathCounts[e.path] || 0) + 1
  }
  const topPaths = Object.entries(pathCounts)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Top IPs
  const ipStats: Record<string, { count: number; blocked: number }> = {}
  for (const e of rows) {
    if (!ipStats[e.ip_address]) ipStats[e.ip_address] = { count: 0, blocked: 0 }
    ipStats[e.ip_address].count++
    if (e.blocked) ipStats[e.ip_address].blocked++
  }
  const topIPs = Object.entries(ipStats)
    .map(([ip, s]) => ({ ip, count: s.count, blocked: s.blocked }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Hourly distribution
  const hourlyCounts: Record<number, number> = {}
  for (const e of rows) {
    const hour = new Date(e.created_at).getHours()
    hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1
  }
  const hourlyDistribution = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: hourlyCounts[h] || 0,
  }))

  return { totalRequests, blockedRequests, topPaths, topIPs, hourlyDistribution }
}

// ---------------------------------------------------------------------------
// 6. getRateLimitEvents - recent events log
// ---------------------------------------------------------------------------
export async function getRateLimitEvents(
  limit: number = 100,
  blocked?: boolean
): Promise<RateLimitEvent[]> {
  await requireAdmin()
  const db: any = createServerClient()

  let query = db
    .from('rate_limit_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (blocked !== undefined) {
    query = query.eq('blocked', blocked)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to fetch rate limit events: ${error.message}`)

  return (data || []).map((e: any) => ({
    id: e.id,
    ipAddress: e.ip_address,
    path: e.path,
    blocked: e.blocked,
    ruleId: e.rule_id,
    userAgent: e.user_agent,
    timestamp: e.created_at,
  }))
}
