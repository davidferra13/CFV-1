// Messaging & Response Templates Server Actions
// Chef-only: Log communication history, manage response templates
// This is a COMMUNICATION LOG, not a sending system — V1 records conversations, not dispatches them

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Database } from '@/types/database'

type MessageChannel = Database['public']['Enums']['message_channel']
type MessageDirection = Database['public']['Enums']['message_direction']
type MessageStatus = Database['public']['Enums']['message_status']

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreateMessageSchema = z.object({
  body: z.string().min(1, 'Message content is required'),
  direction: z.enum(['inbound', 'outbound']),
  channel: z.enum(['text', 'email', 'instagram', 'take_a_chef', 'phone', 'internal_note']),
  inquiry_id: z.string().uuid().nullable().optional(),
  event_id: z.string().uuid().nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  subject: z.string().nullable().optional(),
  sent_at: z.string().nullable().optional(),
  status: z.enum(['draft', 'approved', 'sent', 'logged']).optional(),
}).refine(
  (data) => data.inquiry_id || data.event_id || data.client_id,
  { message: 'Message must be attached to an inquiry, event, or client' }
)

const UpdateMessageSchema = z.object({
  body: z.string().min(1).optional(),
  status: z.enum(['draft', 'approved', 'sent', 'logged']).optional(),
  subject: z.string().nullable().optional(),
  sent_at: z.string().nullable().optional(),
})

const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  template_text: z.string().min(1, 'Template content is required'),
  category: z.string().nullable().optional(),
})

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  template_text: z.string().min(1).optional(),
  category: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
})

export type CreateMessageInput = z.infer<typeof CreateMessageSchema>
export type UpdateMessageInput = z.infer<typeof UpdateMessageSchema>
export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>

// ============================================
// 1. CREATE MESSAGE
// ============================================

export async function createMessage(input: CreateMessageInput) {
  const user = await requireChef()
  const validated = CreateMessageSchema.parse(input)
  const supabase = createServerClient()

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      tenant_id: user.tenantId!,
      body: validated.body,
      direction: validated.direction,
      channel: validated.channel,
      inquiry_id: validated.inquiry_id ?? null,
      event_id: validated.event_id ?? null,
      client_id: validated.client_id ?? null,
      subject: validated.subject ?? null,
      sent_at: validated.sent_at ?? new Date().toISOString(),
      status: validated.status ?? 'logged',
      from_user_id: validated.direction === 'outbound' ? user.id : null,
      to_user_id: validated.direction === 'inbound' ? user.id : null,
    })
    .select()
    .single()

  if (error) {
    console.error('[createMessage] Error:', error)
    throw new Error('Failed to log message')
  }

  // Revalidate affected pages
  if (validated.inquiry_id) revalidatePath(`/inquiries/${validated.inquiry_id}`)
  if (validated.event_id) revalidatePath(`/events/${validated.event_id}`)
  if (validated.client_id) revalidatePath(`/clients/${validated.client_id}`)

  return { success: true, message }
}

// ============================================
// 2. GET MESSAGES (FILTERED)
// ============================================

export async function getMessages(filters?: {
  inquiry_id?: string
  event_id?: string
  client_id?: string
  channel?: MessageChannel
  direction?: MessageDirection
  dateFrom?: string
  dateTo?: string
}) {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('messages')
    .select('*')
    .eq('tenant_id', user.tenantId!)

  if (filters?.inquiry_id) query = query.eq('inquiry_id', filters.inquiry_id)
  if (filters?.event_id) query = query.eq('event_id', filters.event_id)
  if (filters?.client_id) query = query.eq('client_id', filters.client_id)
  if (filters?.channel) query = query.eq('channel', filters.channel)
  if (filters?.direction) query = query.eq('direction', filters.direction)
  if (filters?.dateFrom) query = query.gte('sent_at', filters.dateFrom)
  if (filters?.dateTo) query = query.lte('sent_at', filters.dateTo)

  const { data: messages, error } = await query.order('sent_at', { ascending: false })

  if (error) {
    console.error('[getMessages] Error:', error)
    throw new Error('Failed to fetch messages')
  }

  return messages
}

// ============================================
// 3. GET MESSAGE THREAD
// ============================================

/**
 * Get all messages for a specific entity in chronological order (conversation view)
 * For events converted from inquiries, optionally includes inquiry messages too
 */
export async function getMessageThread(
  entityType: 'inquiry' | 'event' | 'client',
  entityId: string,
  options?: { includeInquiryMessages?: boolean; inquiryId?: string }
) {
  const user = await requireChef()
  const supabase = createServerClient()

  if (entityType === 'client') {
    // Client thread: ALL messages for this client across all inquiries and events
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('tenant_id', user.tenantId!)
      .eq('client_id', entityId)
      .order('sent_at', { ascending: true })

    if (error) {
      console.error('[getMessageThread] Error:', error)
      throw new Error('Failed to fetch message thread')
    }

    return messages
  }

  // For inquiry or event, build combined thread if needed
  const filterColumn = entityType === 'inquiry' ? 'inquiry_id' : 'event_id'

  let query = supabase
    .from('messages')
    .select('*')
    .eq('tenant_id', user.tenantId!)

  if (options?.includeInquiryMessages && options?.inquiryId && entityType === 'event') {
    // Combined thread: event messages + inquiry messages
    query = query.or(`event_id.eq.${entityId},inquiry_id.eq.${options.inquiryId}`)
  } else {
    query = query.eq(filterColumn, entityId)
  }

  const { data: messages, error } = await query.order('sent_at', { ascending: true })

  if (error) {
    console.error('[getMessageThread] Error:', error)
    throw new Error('Failed to fetch message thread')
  }

  return messages
}

// ============================================
// 4. UPDATE MESSAGE
// ============================================

export async function updateMessage(id: string, input: UpdateMessageInput) {
  const user = await requireChef()
  const validated = UpdateMessageSchema.parse(input)
  const supabase = createServerClient()

  const { data: message, error } = await supabase
    .from('messages')
    .update(validated)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateMessage] Error:', error)
    throw new Error('Failed to update message')
  }

  return { success: true, message }
}

// ============================================
// 5. DELETE MESSAGE
// ============================================

export async function deleteMessage(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteMessage] Error:', error)
    throw new Error('Failed to delete message')
  }

  return { success: true }
}

// ============================================
// 6. CREATE RESPONSE TEMPLATE
// ============================================

export async function createResponseTemplate(input: CreateTemplateInput) {
  const user = await requireChef()
  const validated = CreateTemplateSchema.parse(input)
  const supabase = createServerClient()

  const { data: template, error } = await supabase
    .from('response_templates')
    .insert({
      tenant_id: user.tenantId!,
      name: validated.name,
      template_text: validated.template_text,
      category: validated.category ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('[createResponseTemplate] Error:', error)
    throw new Error('Failed to create template')
  }

  revalidatePath('/settings/templates')
  return { success: true, template }
}

// ============================================
// 7. GET RESPONSE TEMPLATES
// ============================================

export async function getResponseTemplates(category?: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('response_templates')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)

  if (category) {
    query = query.eq('category', category)
  }

  const { data: templates, error } = await query.order('category').order('name')

  if (error) {
    console.error('[getResponseTemplates] Error:', error)
    throw new Error('Failed to fetch response templates')
  }

  return templates
}

// ============================================
// 8. UPDATE RESPONSE TEMPLATE
// ============================================

export async function updateResponseTemplate(id: string, input: UpdateTemplateInput) {
  const user = await requireChef()
  const validated = UpdateTemplateSchema.parse(input)
  const supabase = createServerClient()

  const { data: template, error } = await supabase
    .from('response_templates')
    .update(validated)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateResponseTemplate] Error:', error)
    throw new Error('Failed to update template')
  }

  revalidatePath('/settings/templates')
  return { success: true, template }
}

// ============================================
// 9. DELETE RESPONSE TEMPLATE
// ============================================

export async function deleteResponseTemplate(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('response_templates')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteResponseTemplate] Error:', error)
    throw new Error('Failed to delete template')
  }

  revalidatePath('/settings/templates')
  return { success: true }
}

// ============================================
// 10. GET DEFAULT TEMPLATES
// ============================================

/**
 * Returns built-in default templates that every chef starts with.
 * These are suggestions — the chef can customize or replace them entirely.
 * Professional but warm tone, reflecting a private chef's real communication style.
 */
export async function getDefaultTemplates(): Promise<Array<{
  name: string
  template_text: string
  category: string
}>> {
  return [
    {
      name: 'First response — new inquiry',
      template_text:
        "Thanks so much for reaching out! I'd love to cook for you. Can you tell me a bit more about what you're thinking — date, number of guests, any dietary restrictions or allergies?",
      category: 'first_response',
    },
    {
      name: 'Mid-service acknowledgment',
      template_text:
        "Hey [name]! I'm in the middle of a dinner right now but I'd love to chat about this. I'll follow up with you tomorrow!",
      category: 'mid_service',
    },
    {
      name: 'Menu proposal',
      template_text:
        "Here's what I'm thinking for your dinner. Take a look and let me know if anything jumps out or if you'd like any changes.",
      category: 'follow_up',
    },
    {
      name: 'Scheduling confirmation',
      template_text:
        "We're all set! I'll arrive at [time] on [date]. Looking forward to it.",
      category: 'scheduling',
    },
    {
      name: 'Unavailable',
      template_text:
        "Unfortunately I'm already booked on that date. Would [alternative date] work for you?",
      category: 'unavailable',
    },
    {
      name: 'Follow-up (no response)',
      template_text:
        "Hey [name], just following up on the dinner we discussed. Still interested? Happy to put something together whenever you're ready.",
      category: 'follow_up',
    },
    {
      name: 'Thank you + review request',
      template_text:
        "Thank you so much for having me last night! I had a great time cooking for you. If you have a moment, I'd really appreciate a review — [link]",
      category: 'thank_you',
    },
  ]
}

// ============================================
// HELPER: Seed defaults for a new chef
// ============================================

/**
 * Seed default templates for a chef who has none.
 * Called from the templates management page when chef first visits.
 */
export async function seedDefaultTemplates() {
  const user = await requireChef()
  const supabase = createServerClient()

  // Check if chef already has templates
  const { count } = await supabase
    .from('response_templates')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)

  if (count && count > 0) {
    return { success: true, seeded: false }
  }

  const defaults = await getDefaultTemplates()

  const { error } = await supabase
    .from('response_templates')
    .insert(
      defaults.map((t) => ({
        tenant_id: user.tenantId!,
        name: t.name,
        template_text: t.template_text,
        category: t.category,
      }))
    )

  if (error) {
    console.error('[seedDefaultTemplates] Error:', error)
    throw new Error('Failed to seed default templates')
  }

  revalidatePath('/settings/templates')
  return { success: true, seeded: true }
}
