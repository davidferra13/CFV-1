// Client-Facing Lifecycle Status Notifications
// Sends proactive email updates to clients at each stage transition.
// Designed with channel abstraction for future push/SMS support.

'use server'

import { createServerClient } from '@/lib/db/server'
import { createClientPortalLinkForClient } from '@/lib/client-portal/actions'
import { getChefTonePreset, applyGreeting } from '@/lib/email/brand-voice'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationChannel = 'email' | 'push' | 'sms'

export interface StageInfo {
  stage: number
  label: string
  clientMessage: string
  nextStep: string
}

// ---------------------------------------------------------------------------
// Stage Definitions (client-facing copy)
// ---------------------------------------------------------------------------

const STAGE_INFO: Record<number, StageInfo> = {
  1: {
    stage: 1,
    label: 'Inquiry Received',
    clientMessage: 'Your inquiry has been received and your chef is reviewing it.',
    nextStep: 'You will hear back with initial thoughts or menu ideas shortly.',
  },
  2: {
    stage: 2,
    label: 'Discovery',
    clientMessage: 'Your chef is working on menu options based on your preferences.',
    nextStep: 'You will receive sample menus to review and choose from.',
  },
  3: {
    stage: 3,
    label: 'Quote Sent',
    clientMessage: 'A quote is ready for your review.',
    nextStep: 'Review the quote and accept it to move forward with your booking.',
  },
  4: {
    stage: 4,
    label: 'Contract Ready',
    clientMessage: 'Your contract is ready for signing.',
    nextStep: 'Sign the contract and submit your deposit to confirm the date.',
  },
  5: {
    stage: 5,
    label: 'Confirmed',
    clientMessage: 'Your event is confirmed. Your chef is preparing for an amazing experience.',
    nextStep: 'You will receive a pre-event checklist closer to the date.',
  },
}

// ---------------------------------------------------------------------------
// Send Notification
// ---------------------------------------------------------------------------

/**
 * Send a lifecycle status notification to the client.
 * Currently email-only; channel abstraction is in place for future expansion.
 */
export async function sendLifecycleStatusNotification(
  chefId: string,
  inquiryId: string | null,
  eventId: string | null,
  newStage: number,
  channel: NotificationChannel = 'email'
): Promise<{ sent: boolean; error?: string }> {
  if (channel !== 'email') {
    // Future: push/SMS support
    return { sent: false, error: 'Channel not yet supported' }
  }

  const stageInfo = STAGE_INFO[newStage]
  if (!stageInfo) {
    return { sent: false, error: `Unknown stage: ${newStage}` }
  }

  const db = createServerClient()

  // Resolve client info
  let clientEmail: string | null = null
  let clientName: string | null = null
  let chefName: string | null = null
  let portalToken: string | null = null

  // Get chef name
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', chefId)
    .single()
  chefName = chef?.display_name || chef?.business_name || 'Your chef'

  // Get client from inquiry
  if (inquiryId) {
    const { data: inquiry } = await db
      .from('inquiries')
      .select('client_id, contact_name, contact_email')
      .eq('id', inquiryId)
      .eq('tenant_id', chefId)
      .single()

    if (inquiry) {
      clientName = inquiry.contact_name
      clientEmail = inquiry.contact_email

      // If client_id exists, get full client record
      if (inquiry.client_id) {
        const { data: client } = await db
          .from('clients')
          .select('full_name, email')
          .eq('id', inquiry.client_id)
          .single()
        if (client) {
          clientName = client.full_name || clientName
          clientEmail = client.email || clientEmail
        }
      }

      // Get canonical portal link for this client
      if (inquiry.client_id) {
        try {
          const link = await createClientPortalLinkForClient({
            clientId: inquiry.client_id,
            tenantId: chefId,
            db,
          })
          portalToken = link.token
        } catch {
          // Non-fatal: email sends without portal link
        }
      }
    }
  }

  if (!clientEmail) {
    return { sent: false, error: 'No client email found' }
  }

  // Send the email with brand voice
  try {
    const tone = await getChefTonePreset(chefId)
    const resolvedClientName = clientName || 'there'
    const greeting = applyGreeting(tone, resolvedClientName)

    const { sendLifecycleUpdateEmail } = await import('@/lib/email/notifications')
    await sendLifecycleUpdateEmail({
      clientEmail,
      clientName: resolvedClientName,
      chefName: chefName || 'Your chef',
      stageLabel: stageInfo.label,
      stageMessage: `${greeting},\n\n${stageInfo.clientMessage}`,
      nextStep: stageInfo.nextStep,
      portalUrl: portalToken
        ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'}/client/${portalToken}`
        : undefined,
    })
    return { sent: true }
  } catch (err) {
    console.error('[client-notifications] Failed to send lifecycle email:', err)
    return { sent: false, error: 'Email send failed' }
  }
}

/**
 * Get the lifecycle timeline data for a client portal.
 * Returns all stages with current progress for rendering.
 */
export async function getLifecycleTimeline(
  chefId: string,
  inquiryId: string | null,
  eventId: string | null
): Promise<{
  stages: Array<{
    stage: number
    label: string
    status: 'completed' | 'current' | 'upcoming'
    message: string
    completedAt: string | null
  }>
  currentStage: number
}> {
  const db = createServerClient()
  let currentStage = 1

  // Try to get stored stage
  if (inquiryId) {
    try {
      const { data } = await db
        .from('journey_state')
        .select('lifecycle_stage')
        .eq('chef_id', chefId)
        .eq('inquiry_id', inquiryId)
        .single()
      if (data?.lifecycle_stage) {
        currentStage = data.lifecycle_stage
      }
    } catch {
      // Use default
    }
  }

  // Get journey events for completion timestamps
  const eventTimes = new Map<number, string>()
  if (inquiryId) {
    try {
      const { data: events } = await db
        .from('journey_events_log')
        .select('action_type, created_at')
        .eq('chef_id', chefId)
        .eq('inquiry_id', inquiryId)
        .order('created_at', { ascending: true })

      if (events) {
        for (const e of events) {
          // Map action types to stages for timestamp display
          if (e.action_type === 'update_status') eventTimes.set(2, e.created_at)
          if (e.action_type === 'start_timer') eventTimes.set(3, e.created_at)
          if (e.action_type === 'generate_contract') eventTimes.set(4, e.created_at)
          if (e.action_type === 'confirm_event') eventTimes.set(5, e.created_at)
        }
      }
    } catch {
      // Non-blocking
    }
  }

  const stages = Object.values(STAGE_INFO).map((info) => {
    let status: 'completed' | 'current' | 'upcoming' = 'upcoming'
    if (info.stage < currentStage) status = 'completed'
    else if (info.stage === currentStage) status = 'current'

    return {
      stage: info.stage,
      label: info.label,
      status,
      message: status === 'current' ? info.clientMessage : info.nextStep,
      completedAt: eventTimes.get(info.stage) || null,
    }
  })

  return { stages, currentStage }
}
