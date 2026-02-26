// Task Templates — Server Actions
// Chef-only. Create reusable task templates and generate tasks from them.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const TemplateItemSchema = z.object({
  title: z.string().min(1, 'Item title is required'),
  description: z.string().optional(),
  estimated_minutes: z.number().int().min(0).optional(),
})

const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  category: z.enum([
    'prep',
    'service',
    'cleanup',
    'setup',
    'admin',
    'inventory',
    'maintenance',
    'other',
  ]),
  items: z.array(TemplateItemSchema).min(1, 'At least one item is required'),
})

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  category: z
    .enum(['prep', 'service', 'cleanup', 'setup', 'admin', 'inventory', 'maintenance', 'other'])
    .optional(),
  items: z.array(TemplateItemSchema).min(1).optional(),
})

export type TemplateItem = z.infer<typeof TemplateItemSchema>
export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>

export type TaskTemplate = {
  id: string
  chef_id: string
  name: string
  description: string | null
  category: string
  items: TemplateItem[]
  created_at: string
  updated_at: string
}

// Category labels live in template-constants.ts (non-'use server' file)
// Re-export not needed here — importers should use template-constants.ts directly

// ============================================
// CREATE TEMPLATE
// ============================================

export async function createTemplate(input: CreateTemplateInput) {
  const user = await requireChef()
  const validated = CreateTemplateSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('task_templates')
    .insert({
      chef_id: user.tenantId!,
      name: validated.name,
      description: validated.description ?? null,
      category: validated.category,
      items: validated.items,
    })
    .select()
    .single()

  if (error) {
    console.error('[createTemplate] Error:', error)
    throw new Error('Failed to create template')
  }

  revalidatePath('/tasks/templates')
  return data
}

// ============================================
// UPDATE TEMPLATE
// ============================================

export async function updateTemplate(id: string, input: UpdateTemplateInput) {
  const user = await requireChef()
  const validated = UpdateTemplateSchema.parse(input)
  const supabase = createServerClient()

  const updatePayload: Record<string, unknown> = {}
  if (validated.name !== undefined) updatePayload.name = validated.name
  if (validated.description !== undefined) updatePayload.description = validated.description
  if (validated.category !== undefined) updatePayload.category = validated.category
  if (validated.items !== undefined) updatePayload.items = validated.items

  const { data, error } = await supabase
    .from('task_templates')
    .update(updatePayload)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateTemplate] Error:', error)
    throw new Error('Failed to update template')
  }

  revalidatePath('/tasks/templates')
  return data
}

// ============================================
// DELETE TEMPLATE
// ============================================

export async function deleteTemplate(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('task_templates')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[deleteTemplate] Error:', error)
    throw new Error('Failed to delete template')
  }

  revalidatePath('/tasks/templates')
}

// ============================================
// LIST TEMPLATES
// ============================================

export async function listTemplates() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('category')
    .order('name')

  if (error) {
    console.error('[listTemplates] Error:', error)
    throw new Error('Failed to load templates')
  }

  return (data ?? []) as TaskTemplate[]
}

// ============================================
// GENERATE TASKS FROM TEMPLATE
// ============================================

export async function generateTasksFromTemplate(
  templateId: string,
  dueDate: string,
  assignedTo?: string
) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Load the template
  const { data: template, error: loadError } = await supabase
    .from('task_templates')
    .select('*')
    .eq('id', templateId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (loadError || !template) {
    console.error('[generateTasksFromTemplate] Template not found:', loadError)
    throw new Error('Template not found')
  }

  const items = (template.items ?? []) as TemplateItem[]
  if (items.length === 0) {
    throw new Error('Template has no items')
  }

  // Create tasks from each template item
  const taskInserts = items.map((item) => ({
    chef_id: user.tenantId!,
    title: item.title,
    description: item.description ?? null,
    assigned_to: assignedTo ?? null,
    station_id: null,
    due_date: dueDate,
    due_time: null,
    priority: 'medium' as const,
    status: 'pending' as const,
    notes: item.estimated_minutes ? `Estimated: ${item.estimated_minutes} min` : null,
    recurring_rule: null,
    template_id: templateId,
  }))

  const { data, error: insertError } = await supabase.from('tasks').insert(taskInserts).select()

  if (insertError) {
    console.error('[generateTasksFromTemplate] Error creating tasks:', insertError)
    throw new Error('Failed to generate tasks from template')
  }

  revalidatePath('/tasks')
  return data ?? []
}
