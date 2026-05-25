'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const RefTypeEnum = z.enum(['url', 'image', 'file'])
const CategoryEnum = z.enum([
  'inspiration',
  'venue',
  'theme',
  'brand_guidelines',
  'client_reference',
  'menu_reference',
  'general',
])

const CreateReferenceSchema = z.object({
  event_id: z.string().uuid(),
  ref_type: RefTypeEnum,
  url: z.string().url().optional(),
  storage_path: z.string().optional(),
  title: z.string().min(1, 'Title required').max(255),
  description: z.string().max(1000).optional(),
  category: CategoryEnum.default('general'),
  sort_order: z.number().int().default(0),
})

const UpdateReferenceSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  url: z.string().url().nullable().optional(),
  category: CategoryEnum.optional(),
  sort_order: z.number().int().optional(),
})

export type CreateReferenceInput = z.infer<typeof CreateReferenceSchema>
export type UpdateReferenceInput = z.infer<typeof UpdateReferenceSchema>

/**
 * List references for an event, ordered by sort_order.
 */
export async function getEventReferences(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_references')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getEventReferences] Error:', error)
    throw new Error('Failed to fetch event references')
  }

  return data ?? []
}

/**
 * Create a new event reference.
 */
export async function createEventReference(input: CreateReferenceInput) {
  const user = await requireChef()
  const validated = CreateReferenceSchema.parse(input)
  const db: any = createServerClient()

  // Verify event belongs to tenant
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', validated.event_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    throw new Error('Event not found')
  }

  const { data: ref, error } = await db
    .from('event_references')
    .insert({
      tenant_id: user.tenantId!,
      event_id: validated.event_id,
      ref_type: validated.ref_type,
      url: validated.url ?? null,
      storage_path: validated.storage_path ?? null,
      title: validated.title,
      description: validated.description ?? null,
      category: validated.category,
      sort_order: validated.sort_order,
    })
    .select()
    .single()

  if (error) {
    console.error('[createEventReference] Error:', error)
    throw new Error('Failed to create reference')
  }

  revalidatePath(`/events/${validated.event_id}`)
  return { success: true, reference: ref }
}

/**
 * Delete an event reference by ID with tenant check.
 */
export async function deleteEventReference(refId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch to get event_id for revalidation and verify tenant
  const { data: existing } = await db
    .from('event_references')
    .select('id, event_id')
    .eq('id', refId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!existing) {
    throw new Error('Reference not found')
  }

  const { error } = await db
    .from('event_references')
    .delete()
    .eq('id', refId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteEventReference] Error:', error)
    throw new Error('Failed to delete reference')
  }

  revalidatePath(`/events/${existing.event_id}`)
  return { success: true }
}

/**
 * Partial update of an event reference.
 */
export async function updateEventReference(refId: string, updates: UpdateReferenceInput) {
  const user = await requireChef()
  const validated = UpdateReferenceSchema.parse(updates)
  const db: any = createServerClient()

  // Verify ownership
  const { data: existing } = await db
    .from('event_references')
    .select('id, event_id')
    .eq('id', refId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!existing) {
    throw new Error('Reference not found')
  }

  const { data: ref, error } = await db
    .from('event_references')
    .update({
      ...validated,
      updated_at: new Date().toISOString(),
    })
    .eq('id', refId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateEventReference] Error:', error)
    throw new Error('Failed to update reference')
  }

  revalidatePath(`/events/${existing.event_id}`)
  return { success: true, reference: ref }
}
