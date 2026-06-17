'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getUnifiedThread, getLastContactSummary } from './unified-thread'
import type { UnifiedThreadResult, LastContactInfo } from './unified-thread-types'

/**
 * Server action: get unified conversation thread for a client.
 * Auth-gated, tenant-scoped.
 */
export async function getClientThread(
  clientId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<UnifiedThreadResult> {
  const user = await requireChef()

  if (!clientId) {
    throw new Error('Client ID is required')
  }

  return getUnifiedThread(clientId, user.tenantId!, options)
}

/**
 * Server action: send a quick reply to a client via preferred channel.
 * Auth-gated, tenant-scoped.
 */
export async function sendQuickReplyToClient(
  clientId: string,
  message: string,
  channel: 'email' | 'sms' | 'note'
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const trimmedMessage = message.trim()
  if (!trimmedMessage) {
    return { success: false, error: 'Message cannot be empty' }
  }

  if (!clientId) {
    return { success: false, error: 'Client ID is required' }
  }

  // Fetch client info
  const { data: client } = await db
    .from('clients' as any)
    .select('id, full_name, email, phone')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) {
    return { success: false, error: 'Client not found' }
  }

  if (channel === 'note') {
    // Save as internal note
    try {
      const { addClientNote } = await import('@/lib/notes/actions')
      await addClientNote({
        client_id: clientId,
        note_text: trimmedMessage,
        category: 'general',
        pinned: false,
      })

      revalidatePath(`/clients/${clientId}`)
      revalidatePath(`/clients/${clientId}/conversation`)
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to save note',
      }
    }
  }

  if (channel === 'email') {
    if (!client.email) {
      return { success: false, error: 'Client has no email address' }
    }

    // Find existing conversation thread for this client
    const { data: existingThread } = await db
      .from('conversation_threads' as any)
      .select('id')
      .eq('tenant_id', user.tenantId!)
      .eq('client_id', clientId)
      .order('last_activity_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingThread) {
      try {
        const { sendReplyViaChannel } = await import('./actions')
        await sendReplyViaChannel({
          threadId: existingThread.id,
          content: trimmedMessage,
          channel: 'email',
          recipientAddress: client.email,
        })
        revalidatePath(`/clients/${clientId}`)
        revalidatePath(`/clients/${clientId}/conversation`)
        return { success: true }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to send email',
        }
      }
    }

    // No existing thread; use direct email path
    try {
      const { sendEmail } = await import('@/lib/email/send')
      const { createElement } = await import('react')

      const sent = await sendEmail({
        to: client.email,
        subject: 'Message from your chef',
        react: createElement(
          'div',
          {
            style: {
              fontFamily: 'system-ui, sans-serif',
              fontSize: '15px',
              lineHeight: '1.6',
              color: '#1a1a1a',
            },
          },
          ...trimmedMessage
            .split('\n')
            .map((line: string, i: number) =>
              line.trim() === ''
                ? createElement('br', { key: i })
                : createElement('p', { key: i, style: { margin: '0 0 4px 0' } }, line)
            )
        ),
        replyTo: user.email,
      })

      if (!sent) {
        return { success: false, error: 'Email failed to send' }
      }

      // Log to messages table
      try {
        await db.from('messages').insert({
          tenant_id: user.tenantId,
          client_id: clientId,
          direction: 'outbound',
          channel: 'email',
          content: trimmedMessage,
          sender_type: 'chef',
          sender_id: user.entityId,
          created_at: new Date().toISOString(),
        })
      } catch {
        // Non-blocking
      }

      revalidatePath(`/clients/${clientId}`)
      revalidatePath(`/clients/${clientId}/conversation`)
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to send email',
      }
    }
  }

  if (channel === 'sms') {
    if (!client.phone) {
      return { success: false, error: 'Client has no phone number' }
    }

    const { data: existingThread } = await db
      .from('conversation_threads' as any)
      .select('id')
      .eq('tenant_id', user.tenantId!)
      .eq('client_id', clientId)
      .order('last_activity_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingThread) {
      try {
        const { sendReplyViaChannel } = await import('./actions')
        await sendReplyViaChannel({
          threadId: existingThread.id,
          content: trimmedMessage,
          channel: 'sms',
          recipientAddress: client.phone,
        })
        revalidatePath(`/clients/${clientId}`)
        revalidatePath(`/clients/${clientId}/conversation`)
        return { success: true }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to send SMS',
        }
      }
    }

    return {
      success: false,
      error:
        'No active conversation thread found for SMS. Send an email first to establish a thread.',
    }
  }

  return { success: false, error: `Unsupported channel: ${channel}` }
}

/**
 * Server action: get last contact summary for all clients.
 * Auth-gated, tenant-scoped.
 */
export async function getLastContactForAllClients(): Promise<LastContactInfo[]> {
  const user = await requireChef()
  return getLastContactSummary(user.tenantId!)
}

/**
 * Server action: get last contact info for a single client.
 * Auth-gated, tenant-scoped.
 */
export async function getClientLastContact(clientId: string): Promise<LastContactInfo | null> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const { data: client } = await db
    .from('clients' as any)
    .select('id, full_name')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) return null

  const { data: latestComm } = await db
    .from('communication_events' as any)
    .select('timestamp, source, direction')
    .eq('tenant_id', user.tenantId!)
    .eq('resolved_client_id', clientId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: latestMsg } = await db
    .from('messages' as any)
    .select('created_at, channel, direction')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let lastContactAt: string | null = null
  let lastContactChannel: string | null = null
  let lastContactDirection: 'inbound' | 'outbound' | null = null

  if (latestComm && latestMsg) {
    if (new Date(latestComm.timestamp) > new Date(latestMsg.created_at)) {
      lastContactAt = latestComm.timestamp
      lastContactChannel = latestComm.source
      lastContactDirection = latestComm.direction
    } else {
      lastContactAt = latestMsg.created_at
      lastContactChannel = latestMsg.channel
      lastContactDirection = latestMsg.direction
    }
  } else if (latestComm) {
    lastContactAt = latestComm.timestamp
    lastContactChannel = latestComm.source
    lastContactDirection = latestComm.direction
  } else if (latestMsg) {
    lastContactAt = latestMsg.created_at
    lastContactChannel = latestMsg.channel
    lastContactDirection = latestMsg.direction
  }

  const daysSinceContact = lastContactAt
    ? Math.floor((Date.now() - new Date(lastContactAt).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return {
    clientId: client.id,
    clientName: client.full_name,
    lastContactAt,
    lastContactChannel,
    lastContactDirection,
    daysSinceContact,
  }
}
