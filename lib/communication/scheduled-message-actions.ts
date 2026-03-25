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
