// Event/Order Templates - Save and reuse event, order, and production templates
// Pure CRUD, fully deterministic. No AI involved.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────

export type TemplateType =
  | 'event'
  | 'bakery_order'
  | 'wholesale_order'
  | 'meal_plan'
  | 'production_batch'

export type EntityTemplate = {
  id: string
  tenant_id: string
  name: string
  template_type: TemplateType
  template_data: Record<string, any>
  description: string | null
  use_count: number
  last_used_at: string | null
  created_at: string
  updated_at: string
}

const VALID_TYPES: TemplateType[] = [
  'event',
  'bakery_order',
  'wholesale_order',
  'meal_plan',
  'production_batch',
]

// ─── Helpers ──────────────────────────────────────────────────────

/** Strip IDs, timestamps, and tenant-specific data from entity data before saving as template */
function sanitizeTemplateData(data: Record<string, any>): Record<string, any> {
  const keysToStrip = [
    'id',
    'tenant_id',
    'chef_id',
    'created_at',
    'updated_at',
    'auth_user_id',
    'client_id',
    'event_id',
    'quote_id',
  ]
  const sanitized: Record<string, any> = {}
  for (const [key, value] of Object.entries(data)) {
    if (keysToStrip.includes(key)) continue
    // Strip date fields (keep date-related config like duration, but not specific dates)
    if (key === 'event_date' || key === 'start_date' || key === 'end_date' || key === 'due_date')
      continue
    sanitized[key] = value
  }
  return sanitized
}

// ─── Save As Template ─────────────────────────────────────────────

export async function saveAsTemplate(
  name: string,
  templateType: TemplateType,
  data: Record<string, any>,
  description?: string
) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  if (!VALID_TYPES.includes(templateType)) {
    throw new Error(`Invalid template type: ${templateType}`)
  }

  const sanitized = sanitizeTemplateData(data)

  const { data: template, error } = await supabase
    .from('entity_templates')
    .insert({
      tenant_id: tenantId,
      name,
      template_type: templateType,
      template_data: sanitized,
      description: description || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to save template: ${error.message}`)

  revalidatePath('/templates')
  return template as EntityTemplate
}

// ─── Get Templates ────────────────────────────────────────────────

export async function getTemplates(type?: TemplateType) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  let query = supabase
    .from('entity_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })

  if (type) {
    query = query.eq('template_type', type)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to load templates: ${error.message}`)
  return (data || []) as EntityTemplate[]
}

// ─── Get Single Template ──────────────────────────────────────────

export async function getTemplate(id: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('entity_templates')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error) throw new Error(`Template not found: ${error.message}`)
  return data as EntityTemplate
}

// ─── Update Template ──────────────────────────────────────────────

export async function updateTemplate(
  id: string,
  updates: { name?: string; description?: string; template_data?: Record<string, any> }
) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const payload: Record<string, any> = { updated_at: new Date().toISOString() }
  if (updates.name !== undefined) payload.name = updates.name
  if (updates.description !== undefined) payload.description = updates.description
  if (updates.template_data !== undefined)
    payload.template_data = sanitizeTemplateData(updates.template_data)

  const { data, error } = await supabase
    .from('entity_templates')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update template: ${error.message}`)

  revalidatePath('/templates')
  return data as EntityTemplate
}

// ─── Delete Template ──────────────────────────────────────────────

export async function deleteTemplate(id: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('entity_templates')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to delete template: ${error.message}`)
  revalidatePath('/templates')
}

// ─── Create From Template ─────────────────────────────────────────

export async function createFromTemplate(templateId: string, overrides?: Record<string, any>) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Load the template
  const { data: template, error: loadError } = await supabase
    .from('entity_templates')
    .select('*')
    .eq('id', templateId)
    .eq('tenant_id', tenantId)
    .single()

  if (loadError || !template) throw new Error('Template not found')

  // Merge overrides with template data
  const entityData = { ...template.template_data, ...(overrides || {}) }

  // Increment use count
  await supabase
    .from('entity_templates')
    .update({
      use_count: (template.use_count || 0) + 1,
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId)
    .eq('tenant_id', tenantId)

  revalidatePath('/templates')
  return { templateType: template.template_type as TemplateType, data: entityData }
}

// ─── Popular Templates ────────────────────────────────────────────

export async function getPopularTemplates(limit: number = 5) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('entity_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('use_count', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to load popular templates: ${error.message}`)
  return (data || []) as EntityTemplate[]
}
