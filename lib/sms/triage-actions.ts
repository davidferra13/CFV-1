'use server'

// SMS Triage Actions: approve, edit, reject Remy draft responses
// Chef-facing server actions with full auth + tenant scoping.

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SmsDraft = {
  id: string
  tenant_id: string
  thread_id: string
  sender_phone: string
  original_message: string
  draft_response: string
  confidence_score: number
  context_used: Record<string, unknown>
  status: string
  escalation_level: number
  escalated_at: string | null
  edited_response: string | null
  created_at: string
}

export type SmsDraftWithClient = SmsDraft & {
  client_name: string | null
  client_id: string | null
  thread_state: string | null
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getPendingSmsDrafts(): Promise<SmsDraftWithClient[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: drafts, error } = await db
    .from('sms_draft_responses')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['pending', 'edited'])
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[triage-actions] getPendingSmsDrafts failed:', error)
    return []
  }

  if (!drafts || drafts.length === 0) return []

  // Enrich with client names from threads
  const threadIds = drafts.map((d: any) => d.thread_id)
  const { data: threads } = await db
    .from('conversation_threads')
    .select('id, client_id, state')
    .eq('tenant_id', user.tenantId!)
    .in('id', threadIds)

  const threadMap = new Map<string, { client_id: string | null; state: string | null }>(
    (threads || []).map((t: any) => [t.id, { client_id: t.client_id, state: t.state }])
  )

  const clientIds = Array.from(
    new Set((threads || []).map((t: any) => t.client_id).filter(Boolean))
  ) as string[]

  const { data: clients } = clientIds.length
    ? await db
        .from('clients')
        .select('id, full_name')
        .eq('tenant_id', user.tenantId!)
        .in('id', clientIds)
    : { data: [] as any[] }

  const clientNameMap = new Map((clients || []).map((c: any) => [c.id, c.full_name]))

  return drafts.map((draft: any) => {
    const thread = threadMap.get(draft.thread_id) || { client_id: null, state: null }
    return {
      ...draft,
      client_name: thread.client_id ? clientNameMap.get(thread.client_id) || null : null,
      client_id: thread.client_id || null,
      thread_state: thread.state || null,
    }
  })
}

export async function getSmsDraftCount(): Promise<number> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('sms_draft_responses')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'pending')

  if (error) return 0
  // Supabase returns count in the response when head: true
  return (data as any)?.length ?? 0
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

const ApproveSchema = z.object({
  draftId: z.string().uuid(),
})

export async function approveSmsDraft(
  input: z.infer<typeof ApproveSchema>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const parsed = ApproveSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input.' }

  const db: any = createServerClient()

  // Fetch draft with tenant scoping
  const { data: draft } = await db
    .from('sms_draft_responses')
    .select('*')
    .eq('id', parsed.data.draftId)
    .eq('tenant_id', user.tenantId!)
    .in('status', ['pending', 'edited'])
    .single()

  if (!draft) return { success: false, error: 'Draft not found or already resolved.' }

  // Use edited response if available, otherwise the original draft
  const responseBody = draft.edited_response || draft.draft_response

  // Send SMS
  try {
    const { sendManagedTwilioMessage } = await import('@/lib/communication/managed-channels')

    const sendResult = await sendManagedTwilioMessage({
      tenantId: user.tenantId!,
      channel: 'sms',
      to: draft.sender_phone,
      body: responseBody,
    })

    if (!sendResult.success) {
      // Fall back to direct send
      const { sendSms } = await import('@/lib/sms/send')
      const directResult = await sendSms(draft.sender_phone, responseBody)
      if (directResult !== 'sent') {
        return { success: false, error: 'Failed to send SMS. Check Twilio configuration.' }
      }
    }
  } catch (err) {
    console.error('[triage-actions] SMS send failed:', err)
    return { success: false, error: 'SMS delivery failed.' }
  }

  // Mark draft as approved/sent
  await db
    .from('sms_draft_responses')
    .update({
      status: 'sent',
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.draftId)

  // Update triage metadata
  try {
    await db
      .from('sms_triage_metadata')
      .update({
        triage_state: 'resolved',
        updated_at: new Date().toISOString(),
      })
      .eq('thread_id', draft.thread_id)
      .eq('tenant_id', user.tenantId!)
  } catch {
    // Non-fatal
  }

  // Log outbound message to communication pipeline
  try {
    const { ingestCommunicationEvent } = await import('@/lib/communication/pipeline')
    await ingestCommunicationEvent({
      tenantId: user.tenantId!,
      source: 'sms',
      senderIdentity: 'Chef',
      rawContent: responseBody,
      direction: 'outbound',
      threadId: draft.thread_id,
      ingestionSource: 'automation',
      actorId: user.id,
      recipientAddress: draft.sender_phone,
    })
  } catch {
    // Non-fatal: message sent, pipeline logging is secondary
  }

  revalidatePath('/inbox')
  return { success: true }
}

const EditSchema = z.object({
  draftId: z.string().uuid(),
  editedResponse: z.string().min(1).max(1600),
})

export async function editSmsDraft(
  input: z.infer<typeof EditSchema>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const parsed = EditSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input.' }

  const db: any = createServerClient()

  const { data: draft } = await db
    .from('sms_draft_responses')
    .select('id, tenant_id, status')
    .eq('id', parsed.data.draftId)
    .eq('tenant_id', user.tenantId!)
    .in('status', ['pending', 'edited'])
    .single()

  if (!draft) return { success: false, error: 'Draft not found or already resolved.' }

  await db
    .from('sms_draft_responses')
    .update({
      edited_response: parsed.data.editedResponse,
      status: 'edited',
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.draftId)

  revalidatePath('/inbox')
  return { success: true }
}

const RejectSchema = z.object({
  draftId: z.string().uuid(),
})

export async function rejectSmsDraft(
  input: z.infer<typeof RejectSchema>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const parsed = RejectSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input.' }

  const db: any = createServerClient()

  const { data: draft } = await db
    .from('sms_draft_responses')
    .select('id, tenant_id, thread_id, status')
    .eq('id', parsed.data.draftId)
    .eq('tenant_id', user.tenantId!)
    .in('status', ['pending', 'edited'])
    .single()

  if (!draft) return { success: false, error: 'Draft not found or already resolved.' }

  await db
    .from('sms_draft_responses')
    .update({
      status: 'rejected',
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.draftId)

  // Update triage metadata
  try {
    await db
      .from('sms_triage_metadata')
      .update({
        triage_state: 'dismissed',
        updated_at: new Date().toISOString(),
      })
      .eq('thread_id', draft.thread_id)
      .eq('tenant_id', user.tenantId!)
  } catch {
    // Non-fatal
  }

  revalidatePath('/inbox')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Escalation: check for stale pending drafts and notify chef
// Called by cron/inngest, not by user actions.
// ---------------------------------------------------------------------------

export async function escalateStaleDrafts(tenantId: string): Promise<number> {
  const db: any = createServerClient({ admin: true })

  // Get escalation timeout from config (default 15 min)
  const { data: config } = await db
    .from('auto_response_config')
    .select('sms_escalation_minutes')
    .eq('chef_id', tenantId)
    .maybeSingle()

  const timeoutMinutes = config?.sms_escalation_minutes ?? 15

  // Find pending drafts older than timeout
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString()

  const { data: staleDrafts } = await db
    .from('sms_draft_responses')
    .select('id, thread_id, sender_phone, original_message, escalation_level, created_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .is('escalated_at', null)
    .limit(20)

  if (!staleDrafts || staleDrafts.length === 0) return 0

  let escalated = 0

  for (const draft of staleDrafts) {
    const newLevel = (draft.escalation_level || 0) + 1

    // Update escalation state
    await db
      .from('sms_draft_responses')
      .update({
        escalation_level: newLevel,
        escalated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', draft.id)

    // Level 1: push notification to chef
    // Level 2+: mark as requiring attention in dashboard
    try {
      const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
      const recipientId = await getChefAuthUserId(tenantId)
      if (recipientId) {
        const preview =
          draft.original_message.length > 60
            ? draft.original_message.slice(0, 57) + '...'
            : draft.original_message

        await createNotification({
          tenantId,
          recipientId,
          category: 'chat',
          action: 'new_message',
          title:
            newLevel === 1
              ? 'SMS reply waiting for your approval'
              : 'SMS reply needs attention now',
          body: preview,
          actionUrl: '/inbox',
        })
      }
    } catch (err) {
      console.error('[escalation] notification failed:', err)
    }

    escalated++
  }

  return escalated
}
