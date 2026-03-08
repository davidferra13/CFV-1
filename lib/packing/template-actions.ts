'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Types ────────────────────────────────────────────────────────────────────

export type PackingTemplateItem = {
  name: string
  quantity: number
  category: string // Knives, Cookware, Utensils, Serving, Storage, Linens, Misc
  notes?: string
}

export type PackingTemplate = {
  id: string
  chef_id: string
  name: string
  description: string | null
  items: PackingTemplateItem[]
  event_type: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export type CreatePackingTemplateInput = {
  name: string
  description?: string
  items: PackingTemplateItem[]
  event_type?: string
  is_default?: boolean
}

export type UpdatePackingTemplateInput = {
  name?: string
  description?: string
  items?: PackingTemplateItem[]
  event_type?: string
  is_default?: boolean
}

// ── Actions ──────────────────────────────────────────────────────────────────

export async function createPackingTemplate(
  data: CreatePackingTemplateInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  // If marking as default, clear other defaults first
  if (data.is_default) {
    await supabase
      .from('packing_templates')
      .update({ is_default: false })
      .eq('chef_id', user.entityId)
      .eq('is_default', true)
  }

  const { data: template, error } = await supabase
    .from('packing_templates')
    .insert({
      chef_id: user.entityId,
      name: data.name,
      description: data.description ?? null,
      items: JSON.stringify(data.items),
      event_type: data.event_type ?? null,
      is_default: data.is_default ?? false,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[packing/template-actions] createPackingTemplate error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/packing-templates')
  return { success: true, id: template.id }
}

export async function updatePackingTemplate(
  id: string,
  data: UpdatePackingTemplateInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  // If marking as default, clear other defaults first
  if (data.is_default) {
    await supabase
      .from('packing_templates')
      .update({ is_default: false })
      .eq('chef_id', user.entityId)
      .eq('is_default', true)
  }

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.description !== undefined) updateData.description = data.description
  if (data.items !== undefined) updateData.items = JSON.stringify(data.items)
  if (data.event_type !== undefined) updateData.event_type = data.event_type
  if (data.is_default !== undefined) updateData.is_default = data.is_default

  const { error } = await supabase
    .from('packing_templates')
    .update(updateData)
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[packing/template-actions] updatePackingTemplate error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/packing-templates')
  return { success: true }
}

export async function deletePackingTemplate(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('packing_templates')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[packing/template-actions] deletePackingTemplate error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/packing-templates')
  return { success: true }
}

export async function getPackingTemplates(): Promise<PackingTemplate[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('packing_templates')
    .select('*')
    .eq('chef_id', user.entityId)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    console.error('[packing/template-actions] getPackingTemplates error:', error)
    return []
  }

  return (data ?? []).map(row => ({
    ...row,
    items: (typeof row.items === 'string' ? JSON.parse(row.items) : row.items) as PackingTemplateItem[],
  }))
}

export async function getPackingTemplate(
  id: string
): Promise<PackingTemplate | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('packing_templates')
    .select('*')
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .single()

  if (error) {
    console.error('[packing/template-actions] getPackingTemplate error:', error)
    return null
  }

  return {
    ...data,
    items: (typeof data.items === 'string' ? JSON.parse(data.items) : data.items) as PackingTemplateItem[],
  }
}

/**
 * Apply a template's items to an event's packing list.
 * Currently stores items in the event's localStorage-based packing system
 * by returning the template items for client-side integration.
 */
export async function applyTemplateToEvent(
  templateId: string,
  _eventId: string
): Promise<{ success: boolean; items?: PackingTemplateItem[]; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: template, error } = await supabase
    .from('packing_templates')
    .select('items')
    .eq('id', templateId)
    .eq('chef_id', user.entityId)
    .single()

  if (error || !template) {
    console.error('[packing/template-actions] applyTemplateToEvent error:', error)
    return { success: false, error: error?.message ?? 'Template not found' }
  }

  const items = (typeof template.items === 'string'
    ? JSON.parse(template.items)
    : template.items) as PackingTemplateItem[]

  return { success: true, items }
}

/**
 * Save an event's current packing list (from generate-packing-list) as a new template.
 * Pulls equipment items from the event's packing data.
 */
export async function saveEventPackingAsTemplate(
  eventId: string,
  name: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()

  // Dynamically import to avoid circular dependency
  const { fetchPackingListData } = await import('@/lib/documents/generate-packing-list')
  const packingData = await fetchPackingListData(eventId)

  if (!packingData) {
    return { success: false, error: 'Could not load event packing data' }
  }

  // Convert the event's equipment items into template format
  const items: PackingTemplateItem[] = []

  for (const item of packingData.standardKitItems) {
    items.push({ name: item, quantity: 1, category: 'Misc', notes: 'Standard kit' })
  }
  for (const item of packingData.mustBringEquipment) {
    items.push({ name: item, quantity: 1, category: 'Misc', notes: 'Client-specific' })
  }
  for (const item of packingData.eventEquipment) {
    items.push({ name: item, quantity: 1, category: 'Misc' })
  }

  // Also include food items as reference
  const allFood = [
    ...packingData.coldItems,
    ...packingData.frozenItems,
    ...packingData.roomTempItems,
    ...packingData.fragileItems,
  ]
  for (const item of allFood) {
    items.push({
      name: item.name,
      quantity: 1,
      category: 'Misc',
      notes: `Course ${item.course_number}${item.storage_notes ? ` - ${item.storage_notes}` : ''}`,
    })
  }

  const eventType = packingData.event.occasion ?? undefined

  return createPackingTemplate({
    name,
    description: `Saved from event on ${packingData.event.event_date}`,
    items,
    event_type: eventType,
  })
}

/**
 * Get templates that match an event type (for auto-suggestion).
 */
export async function getTemplatesForEventType(
  eventType: string
): Promise<PackingTemplate[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('packing_templates')
    .select('*')
    .eq('chef_id', user.entityId)
    .or(`event_type.eq.${eventType},is_default.eq.true`)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    console.error('[packing/template-actions] getTemplatesForEventType error:', error)
    return []
  }

  return (data ?? []).map(row => ({
    ...row,
    items: (typeof row.items === 'string' ? JSON.parse(row.items) : row.items) as PackingTemplateItem[],
  }))
}
