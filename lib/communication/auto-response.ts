'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { UnknownAppError } from '@/lib/errors/app-error'

import { renderTemplateVariables } from './template-utils'

// ==========================================
// AUTO-RESPONSE CONFIGURATION
// ==========================================

const AutoResponseConfigSchema = z.object({
  enabled: z.boolean(),
  default_response_time: z.string().max(100).optional(),
  reply_to_email: z.string().email().optional().nullable(),
  personalize_with_ai: z.boolean().optional(),
})

export type AutoResponseConfig = {
  id: string
  chef_id: string
  enabled: boolean
  default_response_time: string
  reply_to_email: string | null
  personalize_with_ai: boolean
}

export async function getAutoResponseConfig(): Promise<AutoResponseConfig | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('auto_response_config')
    .select('*')
    .eq('chef_id', user.entityId)
    .maybeSingle()

  if (error) {
    console.error('[auto-response] Failed to load config:', error.message)
    return null
  }

  return data
}

export async function updateAutoResponseConfig(
  input: z.infer<typeof AutoResponseConfigSchema>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const parsed = AutoResponseConfigSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid configuration.' }
  }

  const supabase: any = createServerClient()

  const { error } = await supabase.from('auto_response_config').upsert(
    {
      chef_id: user.entityId,
      enabled: parsed.data.enabled,
      default_response_time: parsed.data.default_response_time ?? 'within 24 hours',
      reply_to_email: parsed.data.reply_to_email ?? null,
      personalize_with_ai: parsed.data.personalize_with_ai ?? true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chef_id' }
  )

  if (error) {
    console.error('[auto-response] Failed to update config:', error.message)
    return { success: false, error: 'Failed to save configuration.' }
  }

  revalidatePath('/settings/communication')
  return { success: true }
}

// ==========================================
// AUTO-RESPONSE TRIGGER
// ==========================================

export async function triggerAutoResponse(
  inquiryId: string,
  tenantId: string
): Promise<{ sent: boolean; reason?: string }> {
  const supabase: any = createServerClient({ admin: true })

  // 1. Check if auto-response is enabled
  const { data: config } = await supabase
    .from('auto_response_config')
    .select('*')
    .eq('chef_id', tenantId)
    .eq('enabled', true)
    .maybeSingle()

  if (!config) {
    return { sent: false, reason: 'auto_response_disabled' }
  }

  // 2. Load inquiry
  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('id, client_id, channel, confirmed_occasion, confirmed_date, auto_responded_at')
    .eq('id', inquiryId)
    .eq('tenant_id', tenantId)
    .single()

  if (!inquiry) {
    return { sent: false, reason: 'inquiry_not_found' }
  }

  // Don't double-send
  if (inquiry.auto_responded_at) {
    return { sent: false, reason: 'already_responded' }
  }

  if (!inquiry.client_id) {
    return { sent: false, reason: 'no_client_linked' }
  }

  // 3. Load client email
  const { data: client } = await supabase
    .from('clients')
    .select('id, full_name, email')
    .eq('id', inquiry.client_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!client?.email) {
    return { sent: false, reason: 'no_client_email' }
  }

  // 4. Find matching template
  const template = await selectAutoResponseTemplate(supabase, tenantId, {
    channel: inquiry.channel,
    occasion: inquiry.confirmed_occasion,
  })

  if (!template) {
    return { sent: false, reason: 'no_template_found' }
  }

  // 5. Load chef info for template personalization
  const { data: chef } = await supabase
    .from('chefs')
    .select('id, business_name, email')
    .eq('id', tenantId)
    .single()

  // 6. Render template
  const rendered = renderTemplateVariables(template.body, {
    client_name: extractFirstName(client.full_name),
    occasion: inquiry.confirmed_occasion ?? 'your event',
    event_date: inquiry.confirmed_date ?? '',
    chef_name: chef?.business_name ?? 'Your Chef',
    business_name: chef?.business_name ?? 'ChefFlow',
    response_time: config.default_response_time,
  })

  const renderedSubject = renderTemplateVariables(template.subject, {
    client_name: extractFirstName(client.full_name),
    occasion: inquiry.confirmed_occasion ?? 'your event',
    chef_name: chef?.business_name ?? 'Your Chef',
    business_name: chef?.business_name ?? 'ChefFlow',
  })

  // 7. Send email (non-blocking import to avoid circular deps)
  try {
    const { sendEmail } = await import('@/lib/email/send')
    await (sendEmail as any)({
      to: client.email,
      subject: renderedSubject,
      text: rendered,
      replyTo: config.reply_to_email ?? chef?.email ?? undefined,
    })
  } catch (err) {
    console.error('[auto-response] Email send failed:', err)
    return { sent: false, reason: 'email_send_failed' }
  }

  // 8. Record auto-response
  await supabase
    .from('inquiries')
    .update({
      auto_responded_at: new Date().toISOString(),
      auto_response_template_id: template.id,
    })
    .eq('id', inquiryId)

  // 9. Increment template usage
  await supabase
    .from('response_templates')
    .update({
      usage_count: (template.usage_count ?? 0) + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', template.id)

  return { sent: true }
}

// ==========================================
// HELPERS
// ==========================================

async function selectAutoResponseTemplate(
  supabase: any,
  chefId: string,
  context: { channel: string | null; occasion: string | null }
) {
  // Priority: exact match (channel + occasion) > channel only > default > system default
  const { data: templates } = await supabase
    .from('response_templates')
    .select('*')
    .eq('chef_id', chefId)
    .eq('category', 'auto_response')
    .is('deleted_at', null)
    .order('is_default', { ascending: false })

  if (!templates || templates.length === 0) {
    // Return built-in default
    return getSystemDefaultAutoResponseTemplate()
  }

  // Exact match: channel + occasion
  const exact = templates.find(
    (t: any) => t.channel_filter === context.channel && t.occasion_filter === context.occasion
  )
  if (exact) return exact

  // Channel match only
  const channelMatch = templates.find(
    (t: any) => t.channel_filter === context.channel && !t.occasion_filter
  )
  if (channelMatch) return channelMatch

  // Default template
  const defaultTemplate = templates.find((t: any) => t.is_default)
  if (defaultTemplate) return defaultTemplate

  // Any template in category
  return templates[0] ?? getSystemDefaultAutoResponseTemplate()
}

function getSystemDefaultAutoResponseTemplate() {
  return {
    id: 'system-default-auto-response',
    name: 'System Default',
    category: 'auto_response' as const,
    subject: 'Thank you for your inquiry, {{client_name}}!',
    body: `Hi {{client_name}},

Thank you for reaching out about {{occasion}}! I received your inquiry and wanted to let you know I am reviewing the details now.

I will get back to you {{response_time}} with more information and next steps.

In the meantime, feel free to reply to this email if you have any additional details to share.

Looking forward to connecting,
{{chef_name}}`,
    usage_count: 0,
    is_system: true,
  }
}

// renderTemplateVariables is in ./template-utils.ts and re-exported above.

function extractFirstName(fullName: string): string {
  return fullName.split(' ')[0] || fullName
}
