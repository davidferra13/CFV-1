'use server'

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { ingestCommunicationEvent } from '@/lib/communication/pipeline'
import { revalidatePath } from 'next/cache'

const vendorContactStatusEnum = z.enum(['contacted', 'waiting', 'confirmed', 'issue'])
const channelEnum = z.enum(['text', 'call', 'whatsapp', 'email', 'in_person', 'other'])

const logVendorContactSchema = z.object({
  eventId: z.string().min(1),
  vendorId: z.string().optional().nullable(),
  vendorName: z.string().min(1).max(200),
  channel: channelEnum,
  status: vendorContactStatusEnum,
  notes: z.string().min(1).max(2000),
  followUpDate: z.string().optional().nullable(),
})

export type VendorContactInput = z.infer<typeof logVendorContactSchema>

export type VendorCoordinationEntry = {
  id: string
  eventId: string
  vendorId: string | null
  vendorName: string
  channel: string
  status: string
  notes: string
  followUpDate: string | null
  timestamp: string
}

const channelToSource: Record<string, string> = {
  text: 'sms',
  call: 'phone',
  whatsapp: 'whatsapp',
  email: 'email',
  in_person: 'manual_log',
  other: 'manual_log',
}

export async function logVendorContact(
  input: VendorContactInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  let parsed: z.infer<typeof logVendorContactSchema>
  try {
    parsed = logVendorContactSchema.parse(input)
  } catch (err) {
    return {
      success: false,
      error: err instanceof z.ZodError ? err.issues[0]?.message : 'Invalid input',
    }
  }

  const source = channelToSource[parsed.channel] || 'manual_log'
  const metadata: Record<string, unknown> = {
    capture_source: 'vendor_coordination',
    vendor_id: parsed.vendorId || null,
    vendor_name: parsed.vendorName,
    vendor_status: parsed.status,
    channel_label: parsed.channel,
  }
  if (parsed.followUpDate) {
    metadata.follow_up_date = parsed.followUpDate
  }

  try {
    const result = await ingestCommunicationEvent({
      tenantId,
      source: source as any,
      timestamp: new Date().toISOString(),
      senderIdentity: user.email || 'Chef',
      rawContent: `[Vendor: ${parsed.vendorName}] ${parsed.notes}`,
      direction: 'outbound',
      resolvedClientId: null,
      linkedEntityType: 'event',
      linkedEntityId: parsed.eventId,
      ingestionSource: 'manual',
      actorId: user.id,
    })

    if (!result?.id) {
      return { success: false, error: 'Failed to persist vendor contact' }
    }

    // Store vendor metadata
    const db: any = createServerClient({ admin: true })
    await db
      .from('communication_events' as any)
      .update({ metadata })
      .eq('id', result.id)
      .eq('tenant_id', tenantId)

    // Create follow-up timer if date specified
    if (parsed.followUpDate && result.threadId) {
      await db
        .from('follow_up_timers' as any)
        .insert({
          tenant_id: tenantId,
          thread_id: result.threadId,
          due_at: new Date(parsed.followUpDate).toISOString(),
          reason: `vendor_follow_up_${parsed.vendorName}`,
          status: 'active',
        })
        .catch(() => {})
    }

    revalidatePath(`/events/${parsed.eventId}`)

    return { success: true, id: result.id }
  } catch (err) {
    console.error('[vendor-coordination] Failed to log vendor contact:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

export async function getEventVendorCoordination(
  eventId: string
): Promise<VendorCoordinationEntry[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('communication_events' as any)
    .select('id, timestamp, raw_content, metadata, linked_entity_id')
    .eq('tenant_id', tenantId)
    .eq('linked_entity_id', eventId)
    .eq('linked_entity_type', 'event')
    .order('timestamp', { ascending: false })
    .limit(100)

  if (error) {
    throw new Error(`Failed to load vendor coordination: ${error.message}`)
  }

  return (data ?? [])
    .filter((row: any) => {
      const meta = row.metadata as Record<string, unknown> | null
      return meta?.capture_source === 'vendor_coordination'
    })
    .map((row: any) => {
      const meta = (row.metadata || {}) as Record<string, unknown>
      return {
        id: row.id,
        eventId: row.linked_entity_id,
        vendorId: (meta.vendor_id as string) || null,
        vendorName: (meta.vendor_name as string) || 'Unknown vendor',
        channel: (meta.channel_label as string) || 'other',
        status: (meta.vendor_status as string) || 'contacted',
        notes: (row.raw_content || '').replace(/^\[Vendor: [^\]]*\]\s*/, ''),
        followUpDate: (meta.follow_up_date as string) || null,
        timestamp: row.timestamp,
      }
    })
}

export async function updateVendorContactStatus(
  communicationEventId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  const validStatuses = ['contacted', 'waiting', 'confirmed', 'issue']
  if (!validStatuses.includes(newStatus)) {
    return { success: false, error: 'Invalid status' }
  }

  // Fetch current metadata
  const { data: row, error: fetchErr } = await db
    .from('communication_events' as any)
    .select('metadata, linked_entity_id')
    .eq('id', communicationEventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (fetchErr || !row) {
    return { success: false, error: 'Vendor contact not found' }
  }

  const meta = (row.metadata || {}) as Record<string, unknown>
  meta.vendor_status = newStatus

  const { error: updateErr } = await db
    .from('communication_events' as any)
    .update({ metadata: meta })
    .eq('id', communicationEventId)
    .eq('tenant_id', tenantId)

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  if (row.linked_entity_id) {
    revalidatePath(`/events/${row.linked_entity_id}`)
  }

  return { success: true }
}

export async function getVendorsForEventPicker(): Promise<
  Array<{ id: string; name: string; category: string | null }>
> {
  const user = await requireChef()
  const db: any = createServerClient()
  const { data } = await db
    .from('vendors')
    .select('id, name, category')
    .eq('chef_id', user.tenantId!)
    .order('name', { ascending: true })
    .limit(200)

  return (data ?? []).map((v: any) => ({
    id: v.id,
    name: v.name,
    category: v.category || null,
  }))
}
