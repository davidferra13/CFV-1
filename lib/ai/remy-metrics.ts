'use server'

/**
 * Remy Anonymous Usage Metrics — counts only, never content.
 *
 * Records how often Remy is used, which feature categories, error rates,
 * and response times. This helps ChefFlow improve Remy without knowing
 * what anyone said.
 *
 * What is collected: conversation counts, message counts, feature category,
 * response times, error counts, model version.
 *
 * What is NEVER collected: prompts, responses, conversation content,
 * client names, recipe details, or any PII.
 */

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'

type FeatureCategory = 'recipe' | 'event' | 'client' | 'menu' | 'finance' | 'general'

interface MetricInput {
  category?: FeatureCategory
  responseTimeMs?: number
  isError?: boolean
  modelVersion?: string
}

/**
 * Record a single Remy interaction metric.
 * Called after each conversation turn — increments counts for today.
 * Non-blocking: failures are logged, never thrown.
 */
export async function recordRemyMetric(input: MetricInput): Promise<void> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase = await createServerClient()

    const category = input.category ?? 'general'
    const today = new Date().toISOString().split('T')[0]

    // Upsert: increment counts for today's category
    const { error } = await supabase.rpc('increment_remy_metrics', {
      p_tenant_id: tenantId,
      p_metric_date: today,
      p_feature_category: category,
      p_message_increment: 1,
      p_error_increment: input.isError ? 1 : 0,
      p_response_time_ms: input.responseTimeMs ?? null,
      p_model_version: input.modelVersion ?? null,
    })

    // If RPC doesn't exist yet, fall back to direct upsert
    if (error?.code === '42883') {
      await supabase.from('remy_usage_metrics').upsert(
        {
          tenant_id: tenantId,
          metric_date: today,
          feature_category: category,
          message_count: 1,
          conversation_count: 0,
          error_count: input.isError ? 1 : 0,
          avg_response_time_ms: input.responseTimeMs ?? null,
          model_version: input.modelVersion ?? null,
        },
        { onConflict: 'tenant_id,metric_date,feature_category' }
      )
    }
  } catch (err) {
    // Non-blocking: metrics should never break the main flow
    console.error('[remy-metrics] Failed to record metric:', err)
  }
}

/**
 * Record a new conversation start.
 * Called once when a conversation is created (separate from message metrics).
 */
export async function recordConversationStart(
  category: FeatureCategory = 'general'
): Promise<void> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase = await createServerClient()

    const today = new Date().toISOString().split('T')[0]

    // Try direct upsert with conversation_count increment
    const { data: existing } = await supabase
      .from('remy_usage_metrics')
      .select('id, conversation_count')
      .eq('tenant_id', tenantId)
      .eq('metric_date', today)
      .eq('feature_category', category)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('remy_usage_metrics')
        .update({ conversation_count: (existing.conversation_count ?? 0) + 1 })
        .eq('id', existing.id)
    } else {
      await supabase.from('remy_usage_metrics').insert({
        tenant_id: tenantId,
        metric_date: today,
        feature_category: category,
        conversation_count: 1,
        message_count: 0,
        error_count: 0,
      })
    }
  } catch (err) {
    console.error('[remy-metrics] Failed to record conversation start:', err)
  }
}

/**
 * Get metric summary for the current chef (for the transparency page).
 * Shows the chef what anonymous data we have about their usage.
 */
export async function getRemyMetricsSummary(): Promise<{
  totalConversations: number
  totalMessages: number
  topCategory: string | null
  errorRate: number
  since: string | null
}> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase = await createServerClient()

    const { data: metrics } = await supabase
      .from('remy_usage_metrics')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('metric_date', { ascending: true })

    if (!metrics || metrics.length === 0) {
      return {
        totalConversations: 0,
        totalMessages: 0,
        topCategory: null,
        errorRate: 0,
        since: null,
      }
    }

    let totalConversations = 0
    let totalMessages = 0
    let totalErrors = 0
    const categoryCounts: Record<string, number> = {}

    for (const m of metrics) {
      totalConversations += m.conversation_count ?? 0
      totalMessages += m.message_count ?? 0
      totalErrors += m.error_count ?? 0
      if (m.feature_category) {
        categoryCounts[m.feature_category] =
          (categoryCounts[m.feature_category] ?? 0) + (m.message_count ?? 0)
      }
    }

    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    const errorRate = totalMessages > 0 ? totalErrors / totalMessages : 0

    return {
      totalConversations,
      totalMessages,
      topCategory,
      errorRate,
      since: metrics[0].metric_date,
    }
  } catch (err) {
    console.error('[remy-metrics] Failed to get summary:', err)
    return {
      totalConversations: 0,
      totalMessages: 0,
      topCategory: null,
      errorRate: 0,
      since: null,
    }
  }
}
