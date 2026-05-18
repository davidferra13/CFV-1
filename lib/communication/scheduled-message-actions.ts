'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

// ==========================================
// TYPES
// ==========================================

export type ScheduledMessage = {
  id: string
  chef_id: string
  recipient_id: string | null
  channel: 'email' | 'sms' | 'app'
  subject: string | null
  body: string
  scheduled_for: string
  sent_at: string | null
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled'
  template_id: string | null
  context_type: 'inquiry' | 'event' | 'client' | null
  context_id: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

// ==========================================
// QUERIES
// ==========================================

export async function getScheduledMessages(options?: {
  status?: 'scheduled' | 'sent' | 'failed' | 'cancelled'
  contextType?: 'inquiry' | 'event' | 'client'
  contextId?: string
}): Promise<{
  data: ScheduledMessage[] | null
  error: string | null
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('scheduled_messages')
    .select('*')
    .eq('chef_id', user.entityId)
    .order('scheduled_for', { ascending: true })

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  if (options?.contextType) {
    query = query.eq('context_type', options.contextType)
  }

  if (options?.contextId) {
    query = query.eq('context_id', options.contextId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getScheduledMessages] Error:', error)
    return { data: null, error: 'Failed to fetch scheduled messages' }
  }

  return { data: data as ScheduledMessage[], error: null }
}

// ==========================================
// MUTATIONS
// ==========================================

export async function scheduleMessage(input: {
  recipient_id?: string
  channel?: 'email' | 'sms' | 'app'
  subject?: string
  body: string
  scheduled_for: string
  template_id?: string
  context_type?: 'inquiry' | 'event' | 'client'
  context_id?: string
}): Promise<{ data: ScheduledMessage | null; error: string | null }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const scheduledDate = new Date(input.scheduled_for)
  if (isNaN(scheduledDate.getTime())) {
    return { data: null, error: 'Invalid scheduled date' }
  }

  if (scheduledDate <= new Date()) {
    return { data: null, error: 'Scheduled date must be in the future' }
  }

  const { data, error } = await db
    .from('scheduled_messages')
    .insert({
      chef_id: user.entityId,
      recipient_id: input.recipient_id || null,
      channel: input.channel || 'email',
      subject: input.subject || null,
      body: input.body,
      scheduled_for: input.scheduled_for,
      template_id: input.template_id || null,
      context_type: input.context_type || null,
      context_id: input.context_id || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[scheduleMessage] Error:', error)
    return { data: null, error: 'Failed to schedule message' }
  }

  revalidatePath('/communication')
  return { data: data as ScheduledMessage, error: null }
}

export async function cancelMessage(id: string): Promise<{
  data: ScheduledMessage | null
  error: string | null
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify the message is still cancellable
  const { data: msg, error: fetchError } = await db
    .from('scheduled_messages')
    .select('status')
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .single()

  if (fetchError || !msg) {
    return { data: null, error: 'Message not found' }
  }

  if (msg.status !== 'scheduled') {
    return { data: null, error: `Cannot cancel a message with status "${msg.status}"` }
  }

  const { data, error } = await db
    .from('scheduled_messages')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .select()
    .single()

  if (error) {
    console.error('[cancelMessage] Error:', error)
    return { data: null, error: 'Failed to cancel message' }
  }

  revalidatePath('/communication')
  return { data: data as ScheduledMessage, error: null }
}

export async function rescheduleMessage(
  id: string,
  newScheduledFor: string
): Promise<{ data: ScheduledMessage | null; error: string | null }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const scheduledDate = new Date(newScheduledFor)
  if (isNaN(scheduledDate.getTime())) {
    return { data: null, error: 'Invalid scheduled date' }
  }

  if (scheduledDate <= new Date()) {
    return { data: null, error: 'Scheduled date must be in the future' }
  }

  // Verify the message is still reschedulable
  const { data: msg, error: fetchError } = await db
    .from('scheduled_messages')
    .select('status')
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .single()

  if (fetchError || !msg) {
    return { data: null, error: 'Message not found' }
  }

  if (msg.status !== 'scheduled') {
    return { data: null, error: `Cannot reschedule a message with status "${msg.status}"` }
  }

  const { data, error } = await db
    .from('scheduled_messages')
    .update({
      scheduled_for: newScheduledFor,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .select()
    .single()

  if (error) {
    console.error('[rescheduleMessage] Error:', error)
    return { data: null, error: 'Failed to reschedule message' }
  }

  revalidatePath('/communication')
  return { data: data as ScheduledMessage, error: null }
}

// ==========================================
// DRAFT REVIEW QUERIES & MUTATIONS
// ==========================================

/**
 * Fetch all pending drafts for the current chef.
 * Drafts are scheduled messages that have not been sent yet
 * (status = 'scheduled', sent_at IS NULL). These include
 * CIL-generated drafts awaiting chef review.
 */
export async function getDraftMessages(): Promise<{
  data: ScheduledMessage[] | null
  error: string | null
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('scheduled_messages')
    .select('*')
    .eq('chef_id', user.entityId)
    .eq('status', 'scheduled')
    .is('sent_at', null)
    .order('scheduled_for', { ascending: true })

  if (error) {
    console.error('[getDraftMessages] Error:', error)
    return { data: null, error: 'Failed to fetch draft messages' }
  }

  return { data: data as ScheduledMessage[], error: null }
}

/**
 * Approve a draft: apply optional edits and confirm it for sending.
 * The message stays as 'scheduled' (the send cron picks it up).
 * The chef has now reviewed and approved it.
 */
export async function approveDraft(
  id: string,
  edits?: { subject?: string; body?: string; scheduled_for?: string }
): Promise<{ data: ScheduledMessage | null; error: string | null }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: msg, error: fetchError } = await db
    .from('scheduled_messages')
    .select('*')
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .single()

  if (fetchError || !msg) {
    return { data: null, error: 'Draft not found' }
  }

  if (msg.status !== 'scheduled') {
    return { data: null, error: `Cannot approve a message with status "${msg.status}"` }
  }

  if (msg.sent_at) {
    return { data: null, error: 'This message has already been sent' }
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (edits?.subject !== undefined) {
    updatePayload.subject = edits.subject
  }
  if (edits?.body !== undefined) {
    if (!edits.body.trim()) {
      return { data: null, error: 'Message body cannot be empty' }
    }
    updatePayload.body = edits.body
  }
  if (edits?.scheduled_for !== undefined) {
    const newDate = new Date(edits.scheduled_for)
    if (isNaN(newDate.getTime())) {
      return { data: null, error: 'Invalid scheduled date' }
    }
    if (newDate <= new Date()) {
      return { data: null, error: 'Scheduled date must be in the future' }
    }
    updatePayload.scheduled_for = edits.scheduled_for
  }

  const { data, error } = await db
    .from('scheduled_messages')
    .update(updatePayload)
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .select()
    .single()

  if (error) {
    console.error('[approveDraft] Error:', error)
    return { data: null, error: 'Failed to approve draft' }
  }

  revalidatePath('/communication/drafts')
  revalidatePath('/communication')
  return { data: data as ScheduledMessage, error: null }
}

/**
 * Reject a draft: cancel the scheduled message so it is never sent.
 */
export async function rejectDraft(
  id: string
): Promise<{ data: ScheduledMessage | null; error: string | null }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: msg, error: fetchError } = await db
    .from('scheduled_messages')
    .select('status, sent_at')
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .single()

  if (fetchError || !msg) {
    return { data: null, error: 'Draft not found' }
  }

  if (msg.status !== 'scheduled') {
    return { data: null, error: `Cannot reject a message with status "${msg.status}"` }
  }

  if (msg.sent_at) {
    return { data: null, error: 'This message has already been sent' }
  }

  const { data, error } = await db
    .from('scheduled_messages')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .select()
    .single()

  if (error) {
    console.error('[rejectDraft] Error:', error)
    return { data: null, error: 'Failed to reject draft' }
  }

  revalidatePath('/communication/drafts')
  revalidatePath('/communication')
  return { data: data as ScheduledMessage, error: null }
}
