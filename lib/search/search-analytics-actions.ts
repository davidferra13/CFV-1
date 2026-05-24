'use server'

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'
import type { SearchAnalytics, SearchHealthReport, SearchQuery } from './search-analytics-types'

/**
 * Log a search query for analytics tracking.
 * Inserts into the search_queries table.
 */
export async function logSearchQuery(
  queryText: string,
  resultCount: number,
  entityTypes: string[]
): Promise<void> {
  const user = await requireChef()
  try {
    await pgClient.unsafe(
      `INSERT INTO search_queries (tenant_id, query_text, result_count, entity_types)
       VALUES ($1, $2, $3, $4)`,
      [user.tenantId!, queryText, resultCount, entityTypes]
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('does not exist')) return // migration pending
    console.error('[logSearchQuery]', msg)
  }
}

/**
 * Aggregate search analytics for the current tenant over a given number of days.
 */
export async function getSearchAnalytics(days: number = 30): Promise<SearchAnalytics> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  try {
    const summaryRows = (await pgClient.unsafe(
      `SELECT
         COUNT(*)::text AS total_searches,
         COALESCE(AVG(result_count), 0)::text AS avg_result_count
       FROM search_queries
       WHERE tenant_id = $1
         AND searched_at >= now() - make_interval(days => $2)`,
      [tenantId, days]
    )) as { total_searches: string; avg_result_count: string }[]

    const topRows = (await pgClient.unsafe(
      `SELECT query_text, COUNT(*)::text AS count
       FROM search_queries
       WHERE tenant_id = $1
         AND searched_at >= now() - make_interval(days => $2)
       GROUP BY query_text
       ORDER BY count DESC
       LIMIT 20`,
      [tenantId, days]
    )) as { query_text: string; count: string }[]

    const zeroRows = (await pgClient.unsafe(
      `SELECT query_text, COUNT(*)::text AS count
       FROM search_queries
       WHERE tenant_id = $1
         AND searched_at >= now() - make_interval(days => $2)
         AND result_count = 0
       GROUP BY query_text
       ORDER BY count DESC
       LIMIT 20`,
      [tenantId, days]
    )) as { query_text: string; count: string }[]

    const summary = summaryRows[0]
    return {
      totalSearches: parseInt(summary?.total_searches ?? '0', 10),
      avgResultCount: parseFloat(summary?.avg_result_count ?? '0'),
      topQueries: topRows.map((r) => ({
        queryText: r.query_text,
        count: parseInt(r.count, 10),
      })),
      zeroResultQueries: zeroRows.map((r) => ({
        queryText: r.query_text,
        count: parseInt(r.count, 10),
      })),
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('does not exist')) {
      return { totalSearches: 0, avgResultCount: 0, topQueries: [], zeroResultQueries: [] }
    }
    console.error('[getSearchAnalytics]', msg)
    return { totalSearches: 0, avgResultCount: 0, topQueries: [], zeroResultQueries: [] }
  }
}

/**
 * Get zero-result queries for content gap analysis.
 */
export async function getZeroResultQueries(limit: number = 20): Promise<SearchQuery[]> {
  const user = await requireChef()

  try {
    const rows = (await pgClient.unsafe(
      `SELECT id, tenant_id, query_text, result_count, entity_types, searched_at
       FROM search_queries
       WHERE tenant_id = $1
         AND result_count = 0
       ORDER BY searched_at DESC
       LIMIT $2`,
      [user.tenantId!, limit]
    )) as {
      id: string
      tenant_id: string
      query_text: string
      result_count: number
      entity_types: string[]
      searched_at: Date
    }[]

    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      queryText: r.query_text,
      resultCount: r.result_count,
      entityTypes: r.entity_types,
      searchedAt: r.searched_at,
    }))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('does not exist')) return []
    console.error('[getZeroResultQueries]', msg)
    return []
  }
}

/**
 * Compute a search health score (0-100) based on zero-result rate and volume.
 *
 * Scoring:
 *  - Starts at 100
 *  - Loses up to 60 points based on zero-result rate
 *  - Loses up to 20 points if average result count is very low
 *  - Loses up to 20 points if search volume is extremely low (< 10)
 */
export async function getSearchHealth(): Promise<SearchHealthReport> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  try {
    const rows = (await pgClient.unsafe(
      `SELECT
         COUNT(*)::text AS total_searches,
         COUNT(*) FILTER (WHERE result_count = 0)::text AS zero_result_count,
         COALESCE(AVG(result_count), 0)::text AS avg_result_count
       FROM search_queries
       WHERE tenant_id = $1
         AND searched_at >= now() - interval '30 days'`,
      [tenantId]
    )) as { total_searches: string; zero_result_count: string; avg_result_count: string }[]

    const row = rows[0]
    const totalSearches = parseInt(row?.total_searches ?? '0', 10)
    const zeroResultCount = parseInt(row?.zero_result_count ?? '0', 10)
    const avgResultCount = parseFloat(row?.avg_result_count ?? '0')

    const zeroResultRate = totalSearches > 0 ? zeroResultCount / totalSearches : 0

    // Compute health score
    let healthScore = 100

    // Penalize zero-result rate (up to 60 points)
    healthScore -= Math.round(zeroResultRate * 60)

    // Penalize low average results (up to 20 points if avg < 2)
    if (avgResultCount < 2) {
      healthScore -= Math.round((1 - avgResultCount / 2) * 20)
    }

    // Penalize very low volume (up to 20 points if fewer than 10 searches)
    if (totalSearches < 10) {
      healthScore -= Math.round((1 - totalSearches / 10) * 20)
    }

    healthScore = Math.max(0, Math.min(100, healthScore))

    // Top zero-result queries for actionable insight
    const zeroQueryRows = (await pgClient.unsafe(
      `SELECT query_text, COUNT(*)::text AS count
       FROM search_queries
       WHERE tenant_id = $1
         AND searched_at >= now() - interval '30 days'
         AND result_count = 0
       GROUP BY query_text
       ORDER BY count DESC
       LIMIT 10`,
      [tenantId]
    )) as { query_text: string; count: string }[]

    return {
      healthScore,
      totalSearches,
      zeroResultRate: Math.round(zeroResultRate * 10000) / 10000,
      avgResultCount: Math.round(avgResultCount * 100) / 100,
      topZeroResultQueries: zeroQueryRows.map((r) => ({
        queryText: r.query_text,
        count: parseInt(r.count, 10),
      })),
      evaluatedAt: new Date(),
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('does not exist')) {
      return {
        healthScore: 0,
        totalSearches: 0,
        zeroResultRate: 0,
        avgResultCount: 0,
        topZeroResultQueries: [],
        evaluatedAt: new Date(),
      }
    }
    console.error('[getSearchHealth]', msg)
    return {
      healthScore: 0,
      totalSearches: 0,
      zeroResultRate: 0,
      avgResultCount: 0,
      topZeroResultQueries: [],
      evaluatedAt: new Date(),
    }
  }
}
