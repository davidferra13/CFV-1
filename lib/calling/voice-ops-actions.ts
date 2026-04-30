'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  initiateAdHocCall,
  initiateDeliveryCoordinationCall,
  initiateVenueConfirmationCall,
} from '@/lib/calling/twilio-actions'
import { planVoiceCallCampaign } from '@/lib/calling/voice-call-campaigns'
import { recordVoiceOpsForAiCallWithDb } from '@/lib/calling/voice-ops-recorder'
import {
  buildRecommendedOpening,
  evaluateVoiceScriptQuality,
} from '@/lib/calling/voice-script-quality'
import type {
  VoiceCampaignLaunchMode,
  VoiceCampaignRecipientInput,
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
    const result = await recordVoiceOpsForAiCallWithDb({
      db,
      chefId: user.tenantId!,
      aiCallId,
      source: 'manual_record_action',
    })
    if (!result.success) return { success: false, error: result.error }
    revalidatePath('/culinary/call-sheet')
    return {
      success: true,
      eventCount: result.eventCount,
      actionCount: result.actionCount,
    }
  } catch (err) {
    console.error('[voice-ops] recordVoiceOpsForAiCall failed:', err)
    return { success: false, error: 'Failed to record voice operations.' }
  }
}

export async function launchVoiceCallCampaign(campaignId: string): Promise<{
  success: boolean
  launchedCount?: number
  failedCount?: number
  manualReviewCount?: number
  error?: string
}> {
  const user = await requireChef()

  if (!campaignId?.trim()) return { success: false, error: 'Campaign id is required.' }

  const db: any = createServerClient()

  try {
    const { data: campaign, error: campaignError } = await db
      .from('voice_call_campaigns')
      .select('id, chef_id, purpose, launch_mode, max_concurrent_calls, status')
      .eq('id', campaignId)
      .eq('chef_id', user.tenantId!)
      .single()

    if (campaignError || !campaign) {
      return { success: false, error: campaignError?.message ?? 'Campaign not found.' }
    }

    const { data: recipients, error: recipientsError } = await db
      .from('voice_call_campaign_recipients')
      .select('id, contact_phone, contact_name, contact_type, role, subject, status, metadata')
      .eq('campaign_id', campaignId)
      .eq('chef_id', user.tenantId!)
      .eq('status', 'reserved')
      .order('created_at', { ascending: true })

    if (recipientsError) return { success: false, error: recipientsError.message }
    if (!recipients || recipients.length === 0) {
      return { success: false, error: 'No reserved campaign recipients are ready to launch.' }
    }

    await db
      .from('voice_call_campaigns')
      .update({ status: 'launching', launched_at: new Date().toISOString() })
      .eq('id', campaignId)
      .eq('chef_id', user.tenantId!)

    const maxConcurrent =
      campaign.launch_mode === 'parallel_limited'
        ? Math.max(1, campaign.max_concurrent_calls ?? 1)
        : 1
    let launchedCount = 0
    let failedCount = 0
    let manualReviewCount = 0

    for (const batch of chunk(recipients, maxConcurrent)) {
      const results = await Promise.all(
        batch.map((recipient: any) =>
          launchCampaignRecipient(db, user.tenantId!, campaign, recipient)
        )
      )
      launchedCount += results.filter((result) => result === 'launched').length
      failedCount += results.filter((result) => result === 'failed').length
      manualReviewCount += results.filter((result) => result === 'manual_review').length
    }

    await db
      .from('voice_call_campaigns')
      .update({
        status: launchedCount > 0 ? 'running' : 'failed',
        launched_count: launchedCount,
        failed_count: failedCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .eq('chef_id', user.tenantId!)

    revalidatePath('/culinary/call-sheet')
    return { success: true, launchedCount, failedCount, manualReviewCount }
  } catch (err) {
    console.error('[voice-ops] launchVoiceCallCampaign failed:', err)
    return { success: false, error: 'Failed to launch voice campaign.' }
  }
}

export async function completeVoicePostCallAction(actionId: string): Promise<{
  success: boolean
  error?: string
}> {
  const user = await requireChef()

  if (!actionId?.trim()) return { success: false, error: 'Action id is required.' }

  const db: any = createServerClient()
  return closeVoicePostCallAction(db, user.tenantId!, actionId, 'completed')
}

export async function markVoicePostCallActionNeedsReview(actionId: string): Promise<{
  success: boolean
  error?: string
}> {
  const user = await requireChef()

  if (!actionId?.trim()) return { success: false, error: 'Action id is required.' }

  const db: any = createServerClient()
  return closeVoicePostCallAction(db, user.tenantId!, actionId, 'needs_review')
}

export async function snoozeVoicePostCallAction(actionId: string): Promise<{
  success: boolean
  error?: string
}> {
  const user = await requireChef()

  if (!actionId?.trim()) return { success: false, error: 'Action id is required.' }

  const db: any = createServerClient()
  return closeVoicePostCallAction(db, user.tenantId!, actionId, 'snoozed')
}

export async function skipVoicePostCallAction(actionId: string): Promise<{
  success: boolean
  error?: string
}> {
  const user = await requireChef()

  if (!actionId?.trim()) return { success: false, error: 'Action id is required.' }

  const db: any = createServerClient()
  return closeVoicePostCallAction(db, user.tenantId!, actionId, 'skipped')
}

type VoiceCloseoutIntent = 'completed' | 'needs_review' | 'snoozed' | 'skipped'

async function closeVoicePostCallAction(
  db: any,
  chefId: string,
  actionId: string,
  intent: VoiceCloseoutIntent
): Promise<{ success: boolean; error?: string }> {
  const { data: action, error: lookupError } = await db
    .from('voice_post_call_actions')
    .select('id, metadata, status')
    .eq('id', actionId)
    .eq('chef_id', chefId)
    .single()

  if (lookupError || !action) {
    return { success: false, error: lookupError?.message ?? 'Voice action not found.' }
  }

  const now = new Date()
  const nextStatus =
    intent === 'completed' ? 'completed' : intent === 'needs_review' ? 'needs_review' : 'skipped'
  const metadata: Record<string, unknown> = {
    ...(isRecord(action.metadata) ? action.metadata : {}),
    closeoutIntent: intent,
    closeoutAt: now.toISOString(),
    previousStatus: action.status ?? null,
  }
  if (intent === 'snoozed') {
    metadata.snoozedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
  }

  const { error } = await db
    .from('voice_post_call_actions')
    .update({
      status: nextStatus,
      completed_at:
        nextStatus === 'completed' || nextStatus === 'skipped' ? now.toISOString() : null,
      metadata,
    })
    .eq('id', actionId)
    .eq('chef_id', chefId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/culinary/call-sheet')
  return { success: true }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

type LaunchResult = 'launched' | 'failed' | 'manual_review'

async function launchCampaignRecipient(
  db: any,
  chefId: string,
  campaign: any,
  recipient: any
): Promise<LaunchResult> {
  const script = buildCampaignOpeningScript(campaign.purpose, recipient)
  const quality = evaluateVoiceScriptQuality(script)
  if (!quality.allowedToLaunch) {
    await markRecipient(
      db,
      chefId,
      recipient.id,
      'manual_review',
      'Script quality gate blocked launch.',
      {
        scriptQuality: quality,
        recommendedScript: quality.recommendedScript,
      }
    )
    return 'manual_review'
  }

  const launched = await placeCampaignCall(campaign, recipient)
  if (!launched.success) {
    await markRecipient(
      db,
      chefId,
      recipient.id,
      'failed',
      launched.error ?? 'Call launch failed.',
      {
        scriptQuality: quality,
      }
    )
    return 'failed'
  }

  await db
    .from('voice_call_campaign_recipients')
    .update({
      status: 'queued',
      ai_call_id: launched.aiCallId ?? null,
      supplier_call_id: launched.callId ?? null,
      metadata: {
        ...(recipient.metadata ?? {}),
        scriptQuality: quality,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', recipient.id)
    .eq('chef_id', chefId)

  return 'launched'
}

async function placeCampaignCall(
  campaign: any,
  recipient: any
): Promise<{ success: boolean; callId?: string; aiCallId?: string; error?: string }> {
  const subject = recipient.subject || campaign.purpose
  const name = recipient.contact_name || 'Business contact'
  const metadata = recipient.metadata ?? {}

  if (recipient.role === 'vendor_availability') {
    return initiateAdHocCall(recipient.contact_phone, name, subject)
  }

  if (recipient.role === 'vendor_delivery') {
    if (typeof metadata.deliveryDate !== 'string' || !metadata.deliveryDate.trim()) {
      return { success: false, error: 'Delivery date is required for delivery campaign calls.' }
    }
    return initiateDeliveryCoordinationCall({
      vendorPhone: recipient.contact_phone,
      vendorName: name,
      itemDescription: subject,
      deliveryDate: metadata.deliveryDate,
      eventId: typeof metadata.eventId === 'string' ? metadata.eventId : undefined,
    })
  }

  if (recipient.role === 'venue_confirmation') {
    if (typeof metadata.eventDate !== 'string' || !metadata.eventDate.trim()) {
      return { success: false, error: 'Event date is required for venue confirmation calls.' }
    }
    return initiateVenueConfirmationCall({
      venuePhone: recipient.contact_phone,
      venueName: name,
      eventDate: metadata.eventDate,
      eventId: typeof metadata.eventId === 'string' ? metadata.eventId : undefined,
    })
  }

  return { success: false, error: 'Role is not launchable from campaign queue.' }
}

async function markRecipient(
  db: any,
  chefId: string,
  recipientId: string,
  status: 'failed' | 'manual_review',
  reason: string,
  metadata: Record<string, unknown>
): Promise<void> {
  await db
    .from('voice_call_campaign_recipients')
    .update({
      status,
      skip_reason: reason,
      metadata,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recipientId)
    .eq('chef_id', chefId)
}

function buildCampaignOpeningScript(purpose: string, recipient: any): string {
  const subject = recipient.subject || purpose
  const question =
    recipient.role === 'venue_confirmation'
      ? `I am calling to confirm logistics for ${subject}.`
      : recipient.role === 'vendor_delivery'
        ? `I am calling to confirm the delivery details for ${subject}.`
        : `I am calling to check availability for ${subject}.`

  return `${buildRecommendedOpening()} ${question}`
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}
