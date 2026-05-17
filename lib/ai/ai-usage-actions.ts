'use server'

// Server actions for AI usage tracking and health monitoring.
// Stores usage records in the ai_usage_log table for analytics and cost awareness.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getProviderRegistry } from './provider-registry'
import type { UsageSummary, ProviderHealth } from './provider-types'

/**
 * Track a single AI usage event. Called after each AI inference.
 */
export async function trackAIUsage(
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  latencyMs: number
): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId

  const db: any = createServerClient()
  await db.from('ai_usage_log').insert({
    tenant_id: tenantId,
    provider,
    model,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    latency_ms: latencyMs,
  })
}

/**
 * Get a summary of AI usage for the current chef.
 * Optionally filter by date range (ISO strings).
 */
export async function getAIUsageSummary(dateRange?: {
  from: string
  to: string
}): Promise<UsageSummary> {
  const user = await requireChef()
  const tenantId = user.tenantId

  const db: any = createServerClient()

  let query = db.from('ai_usage_log').select('*').eq('tenant_id', tenantId)

  if (dateRange?.from) {
    query = query.gte('created_at', dateRange.from)
  }
  if (dateRange?.to) {
    query = query.lte('created_at', dateRange.to)
  }

  const { data: rows, error } = await query.order('created_at', { ascending: false }).limit(10000)

  if (error) {
    throw new Error(`Failed to fetch AI usage: ${error.message}`)
  }

  const records: Array<{
    provider: string
    model: string
    prompt_tokens: number
    completion_tokens: number
    latency_ms: number
  }> = rows ?? []

  // Aggregate totals
  let totalPromptTokens = 0
  let totalCompletionTokens = 0
  let totalLatency = 0

  const byProviderMap = new Map<
    string,
    { requests: number; promptTokens: number; completionTokens: number }
  >()
  const byModelMap = new Map<
    string,
    { requests: number; promptTokens: number; completionTokens: number }
  >()

  for (const r of records) {
    totalPromptTokens += r.prompt_tokens ?? 0
    totalCompletionTokens += r.completion_tokens ?? 0
    totalLatency += r.latency_ms ?? 0

    // By provider
    const pKey = r.provider
    const pEntry = byProviderMap.get(pKey) ?? { requests: 0, promptTokens: 0, completionTokens: 0 }
    pEntry.requests++
    pEntry.promptTokens += r.prompt_tokens ?? 0
    pEntry.completionTokens += r.completion_tokens ?? 0
    byProviderMap.set(pKey, pEntry)

    // By model
    const mKey = r.model
    const mEntry = byModelMap.get(mKey) ?? { requests: 0, promptTokens: 0, completionTokens: 0 }
    mEntry.requests++
    mEntry.promptTokens += r.prompt_tokens ?? 0
    mEntry.completionTokens += r.completion_tokens ?? 0
    byModelMap.set(mKey, mEntry)
  }

  const totalRequests = records.length

  return {
    totalRequests,
    totalPromptTokens,
    totalCompletionTokens,
    avgLatencyMs: totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0,
    byProvider: Array.from(byProviderMap.entries()).map(([provider, v]) => ({
      provider,
      ...v,
    })),
    byModel: Array.from(byModelMap.entries()).map(([model, v]) => ({
      model,
      ...v,
    })),
  }
}

/**
 * Get the health status of all registered AI providers.
 */
export async function getAIHealthStatus(): Promise<ProviderHealth[]> {
  await requireChef()
  const registry = getProviderRegistry()
  return registry.checkAllHealth()
}
