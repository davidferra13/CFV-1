'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type EventContact = {
  id: string
  event_id: string
  contact_name: string
  contact_email: string | null
  contact_phone: string | null
  role: string
  visibility: string
  receives_notifications: boolean
  notes: string | null
  created_at: string
}

const CreateContactSchema = z.object({
  event_id: z.string().uuid(),
  contact_name: z.string().min(1).max(200),
  contact_email: z.string().email().optional().nullable(),
  contact_phone: z.string().max(30).optional().nullable(),
  role: z.enum([
    'primary',
    'planner',
    'venue_manager',
    'host',
    'coordinator',
    'assistant',
    'other',
  ]),
  visibility: z.enum(['full', 'logistics_only', 'day_of_only']).default('full'),
  receives_notifications: z.boolean().default(true),
  notes: z.string().max(1000).optional().nullable(),
})

export async function getEventContacts(eventId: string): Promise<EventContact[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_contacts')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[contacts] Load failed:', error.message)
    return []
  }
  return data ?? []
}

export async function addEventContact(
  input: z.infer<typeof CreateContactSchema>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()
  const parsed = CreateContactSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid contact data.' }

  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_contacts')
    .insert({
      event_id: parsed.data.event_id,
      tenant_id: user.entityId,
      contact_name: parsed.data.contact_name,
      contact_email: parsed.data.contact_email ?? null,
      contact_phone: parsed.data.contact_phone ?? null,
      role: parsed.data.role,
      visibility: parsed.data.visibility,
      receives_notifications: parsed.data.receives_notifications,
      notes: parsed.data.notes ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[contacts] Create failed:', error.message)
    return { success: false, error: 'Failed to add contact.' }
  }

  revalidatePath(`/events/${parsed.data.event_id}`)
  return { success: true, id: data.id }
}

export async function updateEventContact(
  id: string,
  updates: Partial<z.infer<typeof CreateContactSchema>>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
  if (updates.contact_name) updateData.contact_name = updates.contact_name
  if (updates.contact_email !== undefined) updateData.contact_email = updates.contact_email
  if (updates.contact_phone !== undefined) updateData.contact_phone = updates.contact_phone
  if (updates.role) updateData.role = updates.role
  if (updates.visibility) updateData.visibility = updates.visibility
  if (updates.receives_notifications !== undefined)
    updateData.receives_notifications = updates.receives_notifications
  if (updates.notes !== undefined) updateData.notes = updates.notes

  const { error } = await db
    .from('event_contacts')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', user.entityId)

  if (error) {
    console.error('[contacts] Update failed:', error.message)
    return { success: false, error: 'Failed to update contact.' }
  }

  return { success: true }
}

export async function removeEventContact(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('event_contacts')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.entityId)

  if (error) {
    console.error('[contacts] Delete failed:', error.message)
    return { success: false, error: 'Failed to remove contact.' }
  }

  return { success: true }
}
