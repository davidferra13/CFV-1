// @ts-nocheck
// DEFERRED: chat_insights table defined in migration but not yet applied.
// Once applied and types regenerated, remove this directive.

// Chat Insights Server Actions
// Processes AI-extracted insights and provides CRUD for chef review.
//
// Signal Scanner — Auto-Escalation Rules:
//   confidence >= 0.75 + allergy_mention or dietary_preference:
//     → Auto-create client_allergy_records (unconfirmed)
//     → Auto-create pinned dietary note
//     → Notify chef immediately
//   confidence >= 0.5 (all types):
//     → Store as pending insight for chef review (existing behavior)

'use server'

import { requireAuth, requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { analyzeMessageForInsights } from '@/lib/ai/chat-insights'
import { addClientNote } from '@/lib/notes/actions'
import { revalidatePath } from 'next/cache'

// ─── Signal Scanner auto-escalation threshold ────────────────────────────────
// Insights at or above this confidence are escalated immediately without
// waiting for chef to open the chat panel.
const AUTO_ESCALATE_CONFIDENCE = 0.75

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

    // ── Signal Scanner: Auto-escalate high-confidence allergy/dietary insights ──
    // For any allergy or dietary insight above the threshold, we don't wait for
    // the chef to open the chat panel. We act immediately:
    //   1. Upsert a client_allergy_records row (unconfirmed, source=ai_detected)
    //   2. Create a pinned dietary note on the client profile
    //   3. Notify the chef via in-app notification
    if (clientRow?.id) {
      const allergyInsights = filtered.filter(
        (i) =>
          (i.type === 'allergy_mention' || i.type === 'dietary_preference') &&
          i.confidence >= AUTO_ESCALATE_CONFIDENCE
      )

      for (const insight of allergyInsights) {
        await autoEscalateAllergyInsight({
          supabase,
          tenantId: conversation.tenant_id,
          clientId: clientRow.id,
          messageId,
          insight,
        }).catch((err) =>
          console.error('[processMessageInsights] Auto-escalation failed (non-blocking):', err)
        )
      }
    }
  } catch (err) {
    // Non-blocking: log and continue
    console.error('[processMessageInsights] Error:', err)
  }
}

// ─── Auto-escalation helper ──────────────────────────────────────────────────

/**
 * Escalates a high-confidence allergy or dietary insight by:
 * 1. Upserting a client_allergy_records row (ai_detected, unconfirmed)
 * 2. Creating a pinned dietary note
 * 3. Notifying the chef
 *
 * This runs fire-and-forget inside processMessageInsights. Failures are logged
 * but never surface to the message sender.
 */
async function autoEscalateAllergyInsight({
  supabase,
  tenantId,
  clientId,
  messageId,
  insight,
}: {
  supabase: ReturnType<typeof createServerClient>
  tenantId: string
  clientId: string
  messageId: string
  insight: { type: string; title: string; detail: string | null; extracted_data: Record<string, unknown>; confidence: number }
}) {
  // Extract the allergen name from the AI's extracted_data or fall back to title
  const allergen: string =
    (insight.extracted_data?.allergen as string) ||
    (insight.extracted_data?.item as string) ||
    insight.title

  if (!allergen || allergen.trim().length === 0) return

  // Determine severity from extracted_data if AI provided it, else default
  const rawSeverity = (insight.extracted_data?.severity as string)?.toLowerCase()
  const severityMap: Record<string, string> = {
    anaphylaxis: 'anaphylaxis',
    severe: 'anaphylaxis',
    life_threatening: 'anaphylaxis',
    allergy: 'allergy',
    immune: 'allergy',
    intolerance: 'intolerance',
    sensitive: 'intolerance',
    dislike: 'preference',
    avoid: 'preference',
    preference: 'preference',
  }
  const severity =
    (rawSeverity && severityMap[rawSeverity]) ||
    (insight.type === 'allergy_mention' ? 'allergy' : 'preference')

  // 1. Upsert client_allergy_records (ON CONFLICT on lower(allergen) per client)
  //    We use a raw insert with ON CONFLICT DO NOTHING so we don't overwrite
  //    chef-confirmed records with AI guesses.
  const { error: upsertError } = await (supabase as any)
    .from('client_allergy_records')
    .upsert(
      {
        tenant_id: tenantId,
        client_id: clientId,
        allergen: allergen.trim(),
        severity,
        source: 'ai_detected',
        confirmed_by_chef: false,
        notes: insight.detail || null,
        detected_in_message_id: messageId,
      },
      {
        onConflict: 'client_id,allergen',
        ignoreDuplicates: true,   // Don't overwrite existing (chef-entered) record
      }
    )

  if (upsertError) {
    console.error('[autoEscalateAllergyInsight] Upsert error:', upsertError)
  }

  // 2. Create a pinned dietary note (always creates — notes are a log, not deduplicated)
  const noteEmoji = severity === 'anaphylaxis' ? '⚠️ ANAPHYLAXIS' : severity === 'allergy' ? 'Allergy' : severity === 'intolerance' ? 'Intolerance' : 'Preference'
  const noteText = `AI Detected — ${noteEmoji}: ${allergen}${insight.detail ? ` — ${insight.detail}` : ''} (confidence: ${Math.round(insight.confidence * 100)}% — confirm in client profile)`

  await addClientNote({
    client_id: clientId,
    note_text: noteText,
    category: 'dietary' as any,
    pinned: severity === 'anaphylaxis' || severity === 'allergy',
  }).catch((err) => console.error('[autoEscalateAllergyInsight] Note create failed:', err))

  // 3. Notify chef
  const isCritical = severity === 'anaphylaxis'
  const notificationTitle = isCritical
    ? `CRITICAL: Possible anaphylaxis allergen detected — ${allergen}`
    : `Allergy detected in chat: ${allergen}`
  const notificationBody = isCritical
    ? `Client may have a life-threatening allergy to ${allergen}. Confirm immediately before planning any menus.`
    : `AI detected "${allergen}" (${severity}) in a client message. Review and confirm on the client profile.`

  try {
    const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
    const chefUserId = await getChefAuthUserId(tenantId)
    if (chefUserId) {
      await createNotification({
        tenantId,
        recipientId: chefUserId,
        category: 'client',
        action: isCritical ? 'allergy_critical_detected' : 'allergy_detected',
        title: notificationTitle,
        body: notificationBody,
        actionUrl: `/clients/${clientId}`,
        clientId,
        metadata: { allergen, severity, confidence: insight.confidence, message_id: messageId },
      } as any)
    }
  } catch (err) {
    console.error('[autoEscalateAllergyInsight] Notification failed:', err)
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
