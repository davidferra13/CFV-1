'use server'

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { ingestCommunicationEvent } from '@/lib/communication/pipeline'
import { revalidatePath } from 'next/cache'
import { detectInfoChanges } from '@/lib/communication/info-change-detector'
import type { SuggestedUpdate } from '@/lib/communication/info-change-types'

const channelEnum = z.enum(['text', 'call', 'whatsapp', 'email', 'in_person', 'other'])

const directionEnum = z.enum(['inbound', 'outbound'])

const tagEnum = z.enum([
  'dietary_change',
  'guest_count',
  'date_change',
  'menu_feedback',
  'logistics',
  'payment',
  'vendor_coordination',
  'general',
])

const captureSchema = z.object({
  clientId: z.string().min(1).optional().nullable(),
  clientName: z.string().max(200).optional().nullable(),
  channel: channelEnum,
  direction: directionEnum,
  keyInfo: z.string().min(1).max(2000),
  linkedEventId: z.string().optional().nullable(),
  tags: z.array(tagEnum).optional().default([]),
  durationMinutes: z.number().int().min(0).max(1440).optional().nullable(),
  followUpNeeded: z.boolean().optional().default(false),
  followUpDate: z.string().optional().nullable(),
})

export type QuickCaptureInput = z.infer<typeof captureSchema>

export type QuickCaptureResult = {
  success: boolean
  communicationEventId?: string
  suggestedUpdates?: SuggestedUpdate[]
  error?: string
}

const channelToSource: Record<string, string> = {
  text: 'sms',
  call: 'phone',
  whatsapp: 'whatsapp',
  email: 'email',
  in_person: 'manual_log',
  other: 'manual_log',
}

export async function logExternalCommunication(
  input: QuickCaptureInput
): Promise<QuickCaptureResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  let parsed: z.infer<typeof captureSchema>
  try {
    parsed = captureSchema.parse(input)
  } catch (err) {
    return {
      success: false,
      error: err instanceof z.ZodError ? err.issues[0]?.message : 'Invalid input',
    }
  }

  const senderIdentity =
    parsed.direction === 'inbound'
      ? parsed.clientName || parsed.clientId || 'Unknown contact'
      : user.email || 'Chef'

  const source = channelToSource[parsed.channel] || 'manual_log'

  const metadata: Record<string, unknown> = {
    capture_source: 'quick_capture_widget',
    channel_label: parsed.channel,
    tags: parsed.tags,
  }
  if (parsed.durationMinutes != null) {
    metadata.duration_minutes = parsed.durationMinutes
  }
  if (parsed.followUpNeeded) {
    metadata.follow_up_needed = true
    if (parsed.followUpDate) {
      metadata.follow_up_date = parsed.followUpDate
    }
  }

  try {
    const result = await ingestCommunicationEvent({
      tenantId,
      source: source as any,
      timestamp: new Date().toISOString(),
      senderIdentity,
      rawContent: parsed.keyInfo,
      direction: parsed.direction,
      resolvedClientId: parsed.clientId || null,
      linkedEntityType: parsed.linkedEventId ? 'event' : null,
      linkedEntityId: parsed.linkedEventId || null,
      ingestionSource: 'manual',
      actorId: user.id,
    })

    if (!result?.id) {
      return { success: false, error: 'Failed to persist communication event' }
    }

    // Store metadata
    const db: any = createServerClient({ admin: true })
    await db
      .from('communication_events' as any)
      .update({ metadata })
      .eq('id', result.id)
      .eq('tenant_id', tenantId)

    // Create follow-up timer if requested
    if (parsed.followUpNeeded && parsed.followUpDate) {
      await db
        .from('follow_up_timers' as any)
        .insert({
          tenant_id: tenantId,
          thread_id: result.threadId,
          due_at: new Date(parsed.followUpDate).toISOString(),
          reason: 'manual_follow_up',
          status: 'active',
        })
        .catch(() => {
          // Non-fatal
        })
    }

    // Run info change detection
    let suggestedUpdates: SuggestedUpdate[] = []
    try {
      suggestedUpdates = detectInfoChanges(parsed.keyInfo, parsed.tags)
    } catch {
      // Detection is non-fatal
    }

    revalidatePath('/clients')
    if (parsed.clientId) {
      revalidatePath(`/clients/${parsed.clientId}`)
    }
    if (parsed.linkedEventId) {
      revalidatePath(`/events/${parsed.linkedEventId}`)
    }

    return {
      success: true,
      communicationEventId: result.id,
      suggestedUpdates: suggestedUpdates.length > 0 ? suggestedUpdates : undefined,
    }
  } catch (err) {
    console.error('[quick-capture] Failed to log communication:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    }
  }
}

export async function getRecentCaptures(options?: { clientId?: string; limit?: number }): Promise<
  Array<{
    id: string
    channel: string
    direction: string
    content: string
    timestamp: string
    clientId: string | null
    linkedEventId: string | null
    metadata: Record<string, unknown> | null
  }>
> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })
  const limit = Math.min(options?.limit ?? 20, 100)

  let query = db
    .from('communication_events' as any)
    .select(
      'id, source, direction, raw_content, timestamp, resolved_client_id, linked_entity_id, metadata'
    )
    .eq('tenant_id', tenantId)
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (options?.clientId) {
    query = query.eq('resolved_client_id', options.clientId)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(`Failed to load recent captures: ${error.message}`)
  }

  return (data ?? [])
    .filter((row: any) => {
      const meta = row.metadata as Record<string, unknown> | null
      return meta?.capture_source === 'quick_capture_widget'
    })
    .map((row: any) => ({
      id: row.id,
      channel: row.source,
      direction: row.direction,
      content: row.raw_content,
      timestamp: row.timestamp,
      clientId: row.resolved_client_id,
      linkedEventId: row.linked_entity_id,
      metadata: row.metadata,
    }))
}

export async function getClientsForPicker(): Promise<
  Array<{ id: string; name: string; email: string | null }>
> {
  const user = await requireChef()
  const db: any = createServerClient()
  const { data } = await db
    .from('clients')
    .select('id, full_name, email')
    .eq('tenant_id', user.tenantId!)
    .eq('is_staged', false)
    .order('full_name', { ascending: true })
    .limit(200)

  return (data ?? []).map((c: any) => ({
    id: c.id,
    name: c.full_name,
    email: c.email,
  }))
}

export async function getEventsForPicker(
  clientId?: string | null
): Promise<Array<{ id: string; occasion: string; eventDate: string | null }>> {
  const user = await requireChef()
  const db: any = createServerClient()
  let query = db
    .from('events')
    .select('id, occasion, event_date')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['draft', 'proposed', 'accepted', 'paid', 'confirmed', 'in_progress'])
    .order('event_date', { ascending: true })
    .limit(50)

  if (clientId) {
    query = query.eq('client_id', clientId)
  }

  const { data } = await query
  return (data ?? []).map((e: any) => ({
    id: e.id,
    occasion: e.occasion || 'Untitled event',
    eventDate: e.event_date,
  }))
}
