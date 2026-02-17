// @ts-nocheck
// DEFERRED: chat_insights table defined in migration but not yet applied.
// Once applied and types regenerated, remove this directive.

// Chat Insights Server Actions
// Processes AI-extracted insights and provides CRUD for chef review

'use server'

import { requireAuth, requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { analyzeMessageForInsights } from '@/lib/ai/chat-insights'
import { addClientNote } from '@/lib/notes/actions'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type InsightType =
  | 'inquiry_intent'
  | 'dietary_preference'
  | 'allergy_mention'
  | 'important_date'
  | 'guest_count'
  | 'event_detail'
  | 'budget_mention'
  | 'location_mention'
  | 'general_preference'

export type InsightStatus = 'pending' | 'accepted' | 'dismissed'

export interface ChatInsight {
  id: string
  tenant_id: string
  conversation_id: string
  message_id: string
  client_id: string | null
  insight_type: InsightType
  status: InsightStatus
  title: string
  detail: string | null
  extracted_data: Record<string, unknown> | null
  confidence: number
  applied_to: string | null
  applied_at: string | null
  dismissed_at: string | null
  created_at: string
}

// ============================================
// INSIGHT PROCESSING
// ============================================

/**
 * Process a client message for insights.
 * Called asynchronously after message receipt -- non-blocking.
 */
export async function processMessageInsights(
  messageId: string,
  conversationId: string
) {
  try {
    const supabase = createServerClient()

    // Get the message
    const { data: message } = await supabase
      .from('chat_messages')
      .select('body, sender_id, conversation_id')
      .eq('id', messageId)
      .single()

    if (!message?.body) return

    // Get conversation for tenant context
    const { data: conversation } = await supabase
      .from('conversations')
      .select('tenant_id')
      .eq('id', conversationId)
      .single()

    if (!conversation) return

    // Get recent conversation context (last 5 messages before this one)
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('body, sender_id, created_at')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .lt('created_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(5)

    const context = (recentMessages || [])
      .reverse()
      .map((m) => m.body || '')
      .filter(Boolean)
      .join('\n---\n')

    // Resolve client ID from sender
    const { data: clientRow } = await supabase
      .from('clients')
      .select('id, dietary_restrictions, allergies, favorite_cuisines')
      .eq('auth_user_id', message.sender_id)
      .eq('tenant_id', conversation.tenant_id)
      .single()

    // Build client profile summary for deduplication
    let profileSummary: string | undefined
    if (clientRow) {
      const parts: string[] = []
      if (clientRow.dietary_restrictions?.length) {
        parts.push(`Dietary: ${clientRow.dietary_restrictions.join(', ')}`)
      }
      if (clientRow.allergies?.length) {
        parts.push(`Allergies: ${clientRow.allergies.join(', ')}`)
      }
      if (clientRow.favorite_cuisines?.length) {
        parts.push(`Favorite cuisines: ${clientRow.favorite_cuisines.join(', ')}`)
      }
      profileSummary = parts.length > 0 ? parts.join('. ') : undefined
    }

    // Run AI analysis
    const insights = await analyzeMessageForInsights(
      message.body,
      context,
      profileSummary
    )

    if (insights.length === 0) return

    // Filter low-confidence insights
    const filtered = insights.filter((i) => i.confidence >= 0.5)
    if (filtered.length === 0) return

    // Insert insights
    const insightRows = filtered.map((i) => ({
      tenant_id: conversation.tenant_id,
      conversation_id: conversationId,
      message_id: messageId,
      client_id: clientRow?.id || null,
      insight_type: i.type,
      title: i.title,
      detail: i.detail,
      extracted_data: i.extracted_data,
      confidence: i.confidence,
    }))

    const { error } = await supabase
      .from('chat_insights')
      .insert(insightRows)

    if (error) {
      console.error('[processMessageInsights] Insert error:', error)
    }
  } catch (err) {
    // Non-blocking: log and continue
    console.error('[processMessageInsights] Error:', err)
  }
}

// ============================================
// CHEF REVIEW ACTIONS
// ============================================

/**
 * Get pending insights for a conversation.
 */
export async function getPendingInsights(
  conversationId: string
): Promise<ChatInsight[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('chat_insights')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getPendingInsights] Error:', error)
    return []
  }

  return (data || []) as ChatInsight[]
}

/**
 * Accept an insight and apply it to the system.
 */
export async function acceptInsight(
  insightId: string,
  action: {
    apply_to: 'note' | 'client_profile'
  }
) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get the insight
  const { data: insight, error: fetchError } = await supabase
    .from('chat_insights')
    .select('*')
    .eq('id', insightId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !insight) {
    throw new Error('Insight not found')
  }

  // Apply based on action type
  if (action.apply_to === 'note' && insight.client_id) {
    // Map insight type to note category
    const categoryMap: Record<string, string> = {
      inquiry_intent: 'general',
      dietary_preference: 'dietary',
      allergy_mention: 'dietary',
      important_date: 'relationship',
      guest_count: 'logistics',
      event_detail: 'logistics',
      budget_mention: 'logistics',
      location_mention: 'logistics',
      general_preference: 'preference',
    }

    await addClientNote({
      client_id: insight.client_id,
      note_text: `${insight.title}${insight.detail ? ' - ' + insight.detail : ''}`,
      category: (categoryMap[insight.insight_type] || 'general') as any,
      pinned: true,
    })
  }

  // Mark as accepted
  const { error } = await supabase
    .from('chat_insights')
    .update({
      status: 'accepted',
      applied_to: action.apply_to,
      applied_at: new Date().toISOString(),
    })
    .eq('id', insightId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[acceptInsight] Error:', error)
    throw new Error('Failed to accept insight')
  }

  return { success: true as const }
}

/**
 * Dismiss an insight.
 */
export async function dismissInsight(insightId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('chat_insights')
    .update({
      status: 'dismissed',
      dismissed_at: new Date().toISOString(),
    })
    .eq('id', insightId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[dismissInsight] Error:', error)
    throw new Error('Failed to dismiss insight')
  }

  return { success: true as const }
}
