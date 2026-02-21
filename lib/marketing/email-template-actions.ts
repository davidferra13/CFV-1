// Email Template Server Actions
// CRUD for campaign email templates.
// Uses existing table: campaign_templates (from migration 20260303000019)

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Types ---

export type EmailTemplate = {
  id: string
  chefId: string
  name: string
  subject: string
  bodyHtml: string
  category: string | null
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

// --- Schemas ---

const SaveEmailTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  subject: z.string().min(1, 'Subject is required'),
  bodyHtml: z.string().min(1, 'Body HTML is required'),
  category: z.string().optional(),
})

export type SaveEmailTemplateInput = z.infer<typeof SaveEmailTemplateSchema>

const TemplateIdSchema = z.string().uuid()

// --- Actions ---

/**
 * Save (create or update) an email template.
 * If a template with the same name already exists for this chef, it updates it.
 * System templates cannot be overwritten.
 */
export async function saveEmailTemplate(
  input: SaveEmailTemplateInput
): Promise<{ success: boolean; template: EmailTemplate }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const validated = SaveEmailTemplateSchema.parse(input)

  // Check if a template with this name already exists (non-system)
  const { data: existing } = await (supabase as any)
    .from('campaign_templates')
    .select('id, is_system')
    .eq('chef_id', user.tenantId!)
    .eq('name', validated.name)
    .maybeSingle()

  if (existing && existing.is_system) {
    throw new Error('Cannot overwrite a system template. Use a different name.')
  }

  let result: any

  if (existing) {
    // Update existing template
    const { data, error } = await (supabase as any)
      .from('campaign_templates')
      .update({
        subject: validated.subject,
        body_html: validated.bodyHtml,
        campaign_type: validated.category || null,
      })
      .eq('id', existing.id)
      .eq('chef_id', user.tenantId!)
      .select()
      .single()

    if (error) {
      console.error('[saveEmailTemplate] Update error:', error)
      throw new Error('Failed to update email template')
    }
    result = data
  } else {
    // Create new template
    const { data, error } = await (supabase as any)
      .from('campaign_templates')
      .insert({
        chef_id: user.tenantId!,
        name: validated.name,
        subject: validated.subject,
        body_html: validated.bodyHtml,
        campaign_type: validated.category || null,
        is_system: false,
      })
      .select()
      .single()

    if (error) {
      console.error('[saveEmailTemplate] Insert error:', error)
      throw new Error('Failed to create email template')
    }
    result = data
  }

  revalidatePath('/marketing')
  revalidatePath('/marketing/templates')

  return {
    success: true,
    template: {
      id: result.id,
      chefId: result.chef_id,
      name: result.name,
      subject: result.subject,
      bodyHtml: result.body_html,
      category: result.campaign_type,
      isSystem: result.is_system,
      createdAt: result.created_at,
      updatedAt: result.updated_at ?? result.created_at,
    },
  }
}

/**
 * List all email templates for the current chef.
 * Returns both system and custom templates.
 */
export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('campaign_templates')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('is_system', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    console.error('[listEmailTemplates] Error:', error)
    throw new Error('Failed to fetch email templates')
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    chefId: row.chef_id,
    name: row.name,
    subject: row.subject,
    bodyHtml: row.body_html,
    category: row.campaign_type,
    isSystem: row.is_system,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  }))
}

/**
 * Delete an email template by ID.
 * Only custom (non-system) templates can be deleted.
 * Verifies chef_id ownership.
 */
export async function deleteEmailTemplate(id: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const validatedId = TemplateIdSchema.parse(id)

  // Verify the template exists, belongs to this chef, and is not a system template
  const { data: template } = await (supabase as any)
    .from('campaign_templates')
    .select('id, is_system')
    .eq('id', validatedId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!template) {
    throw new Error('Template not found')
  }

  if (template.is_system) {
    throw new Error('Cannot delete system templates')
  }

  const { error } = await (supabase as any)
    .from('campaign_templates')
    .delete()
    .eq('id', validatedId)
    .eq('chef_id', user.tenantId!)
    .eq('is_system', false)

  if (error) {
    console.error('[deleteEmailTemplate] Error:', error)
    throw new Error('Failed to delete email template')
  }

  revalidatePath('/marketing')
  revalidatePath('/marketing/templates')

  return { success: true }
}
