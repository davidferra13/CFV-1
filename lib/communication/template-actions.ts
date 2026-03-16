'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

// ==========================================
// TYPES
// ==========================================

export type ResponseTemplate = {
  id: string
  chef_id: string
  name: string
  subject: string | null
  body: string
  channel: 'email' | 'sms' | 'app'
  category: string
  variables: unknown[]
  channel_filter: string | null
  occasion_filter: string | null
  is_default: boolean
  is_system: boolean
  usage_count: number
  last_used_at: string | null
  created_at: string
  updated_at: string
}

export type TemplateCategory =
  | 'auto_response'
  | 'follow_up'
  | 'menu_proposal'
  | 'booking_confirmation'
  | 'payment_reminder'
  | 'post_event'
  | 'pre_event'
  | 'general'
  | 'onboarding'
  | 're_engagement'

// ==========================================
// QUERIES
// ==========================================

export async function getTemplates(category?: TemplateCategory): Promise<{
  data: ResponseTemplate[] | null
  error: string | null
}> {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('response_templates')
    .select('*')
    .eq('chef_id', user.entityId)
    .order('category')
    .order('name')

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getTemplates] Error:', error)
    return { data: null, error: 'Failed to fetch templates' }
  }

  return { data: data as ResponseTemplate[], error: null }
}

export async function getTemplatesByCategory(category: TemplateCategory): Promise<{
  data: ResponseTemplate[] | null
  error: string | null
}> {
  return getTemplates(category)
}

export async function getTemplateById(id: string): Promise<{
  data: ResponseTemplate | null
  error: string | null
}> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('response_templates')
    .select('*')
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .single()

  if (error) {
    console.error('[getTemplateById] Error:', error)
    return { data: null, error: 'Template not found' }
  }

  return { data: data as ResponseTemplate, error: null }
}

// ==========================================
// MUTATIONS
// ==========================================

export async function createTemplate(input: {
  name: string
  subject?: string
  body: string
  channel?: 'email' | 'sms' | 'app'
  category: TemplateCategory
  variables?: unknown[]
  is_default?: boolean
}): Promise<{ data: ResponseTemplate | null; error: string | null }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('response_templates')
    .insert({
      chef_id: user.entityId,
      name: input.name,
      subject: input.subject || null,
      body: input.body,
      channel: input.channel || 'email',
      category: input.category,
      variables: input.variables || [],
      is_default: input.is_default || false,
    })
    .select()
    .single()

  if (error) {
    console.error('[createTemplate] Error:', error)
    return { data: null, error: 'Failed to create template' }
  }

  revalidatePath('/communication')
  return { data: data as ResponseTemplate, error: null }
}

export async function updateTemplate(
  id: string,
  input: {
    name?: string
    subject?: string
    body?: string
    channel?: 'email' | 'sms' | 'app'
    category?: TemplateCategory
    variables?: unknown[]
    is_default?: boolean
  }
): Promise<{ data: ResponseTemplate | null; error: string | null }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.name !== undefined) updateData.name = input.name
  if (input.subject !== undefined) updateData.subject = input.subject
  if (input.body !== undefined) updateData.body = input.body
  if (input.channel !== undefined) updateData.channel = input.channel
  if (input.category !== undefined) updateData.category = input.category
  if (input.variables !== undefined) updateData.variables = input.variables
  if (input.is_default !== undefined) updateData.is_default = input.is_default

  const { data, error } = await supabase
    .from('response_templates')
    .update(updateData)
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .select()
    .single()

  if (error) {
    console.error('[updateTemplate] Error:', error)
    return { data: null, error: 'Failed to update template' }
  }

  revalidatePath('/communication')
  return { data: data as ResponseTemplate, error: null }
}

export async function deleteTemplate(id: string): Promise<{ error: string | null }> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Don't allow deleting system templates
  const { data: template } = await supabase
    .from('response_templates')
    .select('is_system')
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .single()

  if (template?.is_system) {
    return { error: 'Cannot delete system templates' }
  }

  const { error } = await supabase
    .from('response_templates')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[deleteTemplate] Error:', error)
    return { error: 'Failed to delete template' }
  }

  revalidatePath('/communication')
  return { error: null }
}

export async function incrementTemplateUsage(id: string): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  try {
    await supabase.rpc('increment_template_usage', {
      template_id: id,
      p_chef_id: user.entityId,
    })
  } catch (err) {
    // Non-blocking: usage tracking failure should not break the main operation
    console.error('[incrementTemplateUsage] Non-blocking error:', err)
  }
}
