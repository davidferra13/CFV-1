'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { planVoiceCallCampaign } from '@/lib/calling/voice-call-campaigns'
import { buildPostCallExecutionPlan } from '@/lib/calling/post-call-execution'
import { buildVoiceSessionLedger } from '@/lib/calling/voice-session-ledger'
import { normalizeVoiceCall } from '@/lib/calling/voice-ops-report'
import type {
  VoiceCampaignLaunchMode,
  VoiceCampaignRecipientInput,
  VoicePostCallAction,
} from '@/lib/calling/voice-ops-types'

export async function createVoiceCallCampaign(input: {
  name: string
  purpose: string
  launchMode?: VoiceCampaignLaunchMode
  maxConcurrentLaunches?: number
  recipients: VoiceCampaignRecipientInput[]
}): Promise<{
  success: boolean
  campaignId?: string
  reservedCount?: number
  skippedCount?: number
  manualReviewCount?: number
  error?: string
}> {
  const user = await requireChef()

  if (!input.name?.trim()) return { success: false, error: 'Campaign name is required.' }
  if (!input.purpose?.trim()) return { success: false, error: 'Campaign purpose is required.' }
  if (!Array.isArray(input.recipients) || input.recipients.length === 0) {
    return { success: false, error: 'At least one recipient is required.' }
  }

  const plan = planVoiceCallCampaign(input)
  const db: any = createServerClient()

  try {
    const { data: campaign, error: campaignError } = await db
      .from('voice_call_campaigns')
      .insert({
        chef_id: user.tenantId!,
        name: plan.name,
        purpose: plan.purpose,
        launch_mode: plan.launchMode,
        max_concurrent_calls: plan.maxConcurrentLaunches,
        status: 'reserved',
        requested_count: plan.requestedCount,
        reserved_count: plan.reservedCount,
        skipped_count: plan.skippedCount,
        summary: plan.summary,
        created_by: user.id ?? null,
      })
      .select('id')
      .single()

    if (campaignError || !campaign?.id) {
      return {
        success: false,
        error: campaignError?.message ?? 'Failed to create voice campaign.',
      }
    }

    const recipientRows = plan.recipients.map((recipient) => ({
      campaign_id: campaign.id,
      chef_id: user.tenantId!,
      contact_phone: recipient.normalizedPhone,
      contact_name: recipient.contactName ?? null,
      contact_type: recipient.contactType ?? 'unknown',
      role: recipient.role,
      subject: recipient.subject ?? null,
      status: recipient.status,
      skip_reason: recipient.skipReason,
      professional_risk: recipient.professionalRisk,
      consent_state: recipient.consentState ?? 'unknown',
      metadata: {
        source: recipient.source ?? null,
        originalId: recipient.id ?? null,
      },
    }))

    const { error: recipientError } = await db
      .from('voice_call_campaign_recipients')
      .insert(recipientRows)

    if (recipientError) {
      return {
        success: false,
        error: recipientError.message,
      }
    }

    revalidatePath('/culinary/call-sheet')
    return {
      success: true,
      campaignId: campaign.id,
      reservedCount: plan.reservedCount,
      skippedCount: plan.skippedCount,
      manualReviewCount: plan.manualReviewCount,
    }
  } catch (err) {
    console.error('[voice-ops] createVoiceCallCampaign failed:', err)
    return { success: false, error: 'Failed to create voice campaign.' }
  }
}

export async function recordVoiceOpsForAiCall(aiCallId: string): Promise<{
  success: boolean
  eventCount?: number
  actionCount?: number
  error?: string
}> {
  const user = await requireChef()

  if (!aiCallId?.trim()) return { success: false, error: 'AI call id is required.' }

  const db: any = createServerClient()

  try {
    const { data: aiCall, error: callError } = await db
      .from('ai_calls')
      .select(
        'id, direction, role, contact_phone, contact_name, contact_type, subject, status, result, full_transcript, extracted_data, action_log, recording_url, duration_seconds, created_at, supplier_call_id'
      )
      .eq('id', aiCallId)
      .eq('chef_id', user.tenantId!)
      .single()

    if (callError || !aiCall) {
      return { success: false, error: callError?.message ?? 'AI call not found.' }
    }

    const call = normalizeVoiceCall(aiCall)
    if (!call) return { success: false, error: 'AI call data could not be normalized.' }

    const { data: existingEvents, error: existingError } = await db
      .from('voice_session_events')
      .select('id')
      .eq('chef_id', user.tenantId!)
      .eq('ai_call_id', aiCallId)
      .limit(1)

    if (existingError) return { success: false, error: existingError.message }
    if (existingEvents?.length > 0) {
      return { success: true, eventCount: 0, actionCount: 0 }
    }

    const ledger = buildVoiceSessionLedger(call)
    const postCallPlan = buildPostCallExecutionPlan(call)

    const { error: eventError } = await db.from('voice_session_events').insert(
      ledger.map((event) => ({
        chef_id: user.tenantId!,
        ai_call_id: aiCallId,
        supplier_call_id: call.supplierCallId ?? null,
        event_type: event.eventType,
        sequence: event.sequence,
        occurred_at: event.occurredAt,
        payload: event.payload,
      }))
    )

    if (eventError) return { success: false, error: eventError.message }

    const actionable = postCallPlan.actions.filter((action) => action.type !== 'link_call_record')
    if (actionable.length > 0) {
      const { error: actionError } = await db.from('voice_post_call_actions').insert(
        actionable.map((action: VoicePostCallAction) => ({
          chef_id: user.tenantId!,
          ai_call_id: aiCallId,
          supplier_call_id: call.supplierCallId ?? null,
          action_type: action.type,
          status: action.status === 'needs_review' ? 'needs_review' : 'planned',
          urgency: action.urgency,
          label: action.label,
          detail: action.detail,
          target_type: action.targetType ?? null,
          target_id: action.targetId ?? null,
          metadata: action.metadata ?? {},
        }))
      )

      if (actionError) return { success: false, error: actionError.message }
    }

    revalidatePath('/culinary/call-sheet')
    return {
      success: true,
      eventCount: ledger.length,
      actionCount: actionable.length,
    }
  } catch (err) {
    console.error('[voice-ops] recordVoiceOpsForAiCall failed:', err)
    return { success: false, error: 'Failed to record voice operations.' }
  }
}
