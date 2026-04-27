'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ==========================================
// TYPES
// ==========================================

export type ResponseTemplate = {
  id: string
  chef_id: string
  name: string
  category: string
  subject: string
  body: string
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

export async function getTemplates(category?: TemplateCategory): Promise<ResponseTemplate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('response_templates')
    .select('*')
    .eq('chef_id', user.entityId)
    .is('deleted_at', null)
    .order('is_default', { ascending: false })
    .order('usage_count', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('[templates] Failed to load templates:', error.message)
    return []
  }

  return data ?? []
}

export async function getTemplate(id: string): Promise<ResponseTemplate | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('response_templates')
    .select('*')
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .is('deleted_at', null)
    .single()

  if (error) {
    return null
  }

  return data
}

// ==========================================
// MUTATIONS
// ==========================================

const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum([
    'auto_response',
    'follow_up',
    'menu_proposal',
    'booking_confirmation',
    'payment_reminder',
    'post_event',
    'pre_event',
    'general',
    'onboarding',
    're_engagement',
  ]),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(10000),
  channel_filter: z.string().nullable().optional(),
  occasion_filter: z.string().nullable().optional(),
  is_default: z.boolean().optional(),
})

export async function createTemplate(
  input: z.infer<typeof CreateTemplateSchema>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()
  const parsed = CreateTemplateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid template data.' }
  }

  const db: any = createServerClient()

  // If this is set as default, unset other defaults in same category
  if (parsed.data.is_default) {
    await db
      .from('response_templates')
      .update({ is_default: false })
      .eq('chef_id', user.entityId)
      .eq('category', parsed.data.category)
  }

  const { data, error } = await db
    .from('response_templates')
    .insert({
      chef_id: user.entityId,
      name: parsed.data.name,
      category: parsed.data.category,
      subject: parsed.data.subject,
      body: parsed.data.body,
      channel_filter: parsed.data.channel_filter ?? null,
      occasion_filter: parsed.data.occasion_filter ?? null,
      is_default: parsed.data.is_default ?? false,
      is_system: false,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[templates] Failed to create template:', error.message)
    return { success: false, error: 'Failed to create template.' }
  }

  revalidatePath('/settings/communication')
  return { success: true, id: data.id }
}

const UpdateTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  subject: z.string().min(1).max(500).optional(),
  body: z.string().min(1).max(10000).optional(),
  channel_filter: z.string().nullable().optional(),
  occasion_filter: z.string().nullable().optional(),
  is_default: z.boolean().optional(),
})

export async function updateTemplate(
  input: z.infer<typeof UpdateTemplateSchema>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const parsed = UpdateTemplateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid template data.' }
  }

  const db: any = createServerClient()

  // If setting as default, unset others
  if (parsed.data.is_default) {
    // Get category of this template first
    const { data: existing } = await db
      .from('response_templates')
      .select('category')
      .eq('id', parsed.data.id)
      .eq('chef_id', user.entityId)
      .single()

    if (existing) {
      await db
        .from('response_templates')
        .update({ is_default: false })
        .eq('chef_id', user.entityId)
        .eq('category', existing.category)
    }
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.subject !== undefined) updates.subject = parsed.data.subject
  if (parsed.data.body !== undefined) updates.body = parsed.data.body
  if (parsed.data.channel_filter !== undefined) updates.channel_filter = parsed.data.channel_filter
  if (parsed.data.occasion_filter !== undefined)
    updates.occasion_filter = parsed.data.occasion_filter
  if (parsed.data.is_default !== undefined) updates.is_default = parsed.data.is_default

  const { error } = await db
    .from('response_templates')
    .update(updates)
    .eq('id', parsed.data.id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[templates] Failed to update template:', error.message)
    return { success: false, error: 'Failed to update template.' }
  }

  revalidatePath('/settings/communication')
  return { success: true }
}

export async function deleteTemplate(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('response_templates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .eq('is_system', false) // Can't delete system templates

  if (error) {
    console.error('[templates] Failed to delete template:', error.message)
    return { success: false, error: 'Failed to delete template.' }
  }

  revalidatePath('/settings/communication')
  return { success: true }
}

// ==========================================
// TEMPLATE VARIABLE REFERENCE
// ==========================================

const TEMPLATE_VARIABLES = [
  { key: 'client_name', description: "Client's first name", example: 'Sarah' },
  { key: 'client_full_name', description: "Client's full name", example: 'Sarah Johnson' },
  { key: 'occasion', description: 'Event occasion', example: 'Birthday Dinner' },
  { key: 'event_date', description: 'Event date', example: 'March 20, 2026' },
  { key: 'guest_count', description: 'Number of guests', example: '12' },
  { key: 'chef_name', description: 'Chef/business name', example: 'Chef Maria' },
  { key: 'business_name', description: 'Business name', example: 'ChefFlow' },
  { key: 'response_time', description: 'Expected response time', example: 'within 24 hours' },
  { key: 'quoted_price', description: 'Quoted price', example: '$1,800' },
  { key: 'deposit_amount', description: 'Deposit amount', example: '$450' },
  { key: 'balance_due', description: 'Remaining balance', example: '$1,350' },
  { key: 'payment_due_date', description: 'Payment due date', example: 'March 15, 2026' },
  { key: 'event_location', description: 'Event location', example: '123 Main St' },
  { key: 'booking_link', description: 'Direct booking link', example: 'https://...' },
  { key: 'feedback_link', description: 'Feedback survey link', example: 'https://...' },
] as const
