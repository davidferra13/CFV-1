'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { sendEmail } from '@/lib/email/send'
import { logChefActivity } from '@/lib/activity/log-chef'
import { createElement } from 'react'

// ── Templates ────────────────────────────────────────────────────────────────

export interface QuickReplyTemplate {
  id: string
  label: string
  /** Template body with placeholders: {clientName}, {occasion}, {chefName} */
  body: string
}

export const QUICK_REPLY_TEMPLATES: QuickReplyTemplate[] = [
  {
    id: 'working-on-it',
    label: 'Working on details',
    body: `Hi {clientName},\n\nWanted to let you know I'm working on the details for your {occasion}. I'll have more information for you shortly.\n\nBest,\n{chefName}`,
  },
  {
    id: 'menu-coming',
    label: 'Menu coming soon',
    body: `Hi {clientName},\n\nI'm putting together a menu for your {occasion} and will send it over for your review soon. Looking forward to cooking for you!\n\nBest,\n{chefName}`,
  },
  {
    id: 'checking-in',
    label: 'Quick check-in',
    body: `Hi {clientName},\n\nJust checking in about your {occasion}. Let me know if you have any questions or if anything has changed on your end.\n\nBest,\n{chefName}`,
  },
  {
    id: 'availability-confirm',
    label: 'Confirming availability',
    body: `Hi {clientName},\n\nGood news, I'm available for your {occasion}. I'll follow up with pricing and menu options shortly.\n\nBest,\n{chefName}`,
  },
]

function fillTemplate(body: string, vars: Record<string, string>): string {
  let result = body
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value)
  }
  return result
}

// ── Simple plain-text email component ────────────────────────────────────────

function PlainTextEmail({ body }: { body: string }) {
  return createElement(
    'div',
    {
      style: {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        lineHeight: '1.6',
        color: '#1a1a1a',
      },
    },
    ...body
      .split('\n')
      .map((line, i) =>
        line.trim() === ''
          ? createElement('br', { key: i })
          : createElement('p', { key: i, style: { margin: '0 0 4px 0' } }, line)
      )
  )
}

// ── Server Actions ───────────────────────────────────────────────────────────

export async function sendQuickReply(input: {
  inquiryId: string
  clientEmail: string
  clientName: string
  occasion: string | null
  templateId?: string
  customMessage?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get chef display name
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, first_name, business_name')
    .eq('id', user.entityId)
    .single()

  const chefName = chef?.display_name || chef?.first_name || chef?.business_name || 'Chef'
  const occasion = input.occasion || 'upcoming event'

  // Build message body
  let body: string
  if (input.customMessage?.trim()) {
    body = input.customMessage.trim()
  } else if (input.templateId) {
    const template = QUICK_REPLY_TEMPLATES.find((t) => t.id === input.templateId)
    if (!template) return { success: false, error: 'Template not found' }
    body = fillTemplate(template.body, {
      clientName: input.clientName.split(' ')[0], // first name only
      occasion,
      chefName,
    })
  } else {
    return { success: false, error: 'No message or template provided' }
  }

  if (!input.clientEmail) {
    return { success: false, error: 'Client has no email address' }
  }

  // Send via Resend
  const subject = `Update on your ${occasion}`
  const sent = await sendEmail({
    to: input.clientEmail,
    subject,
    react: createElement(PlainTextEmail, { body }),
    replyTo: user.email,
  })

  if (!sent) {
    return { success: false, error: 'Email failed to send. Check Resend configuration.' }
  }

  // Log outbound message to messages table for stale-inquiry tracking
  try {
    await db.from('messages').insert({
      tenant_id: user.tenantId,
      inquiry_id: input.inquiryId,
      direction: 'outbound',
      channel: 'email',
      content: body,
      sender_type: 'chef',
      sender_id: user.entityId,
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[quickReply] Failed to log message (non-blocking):', err)
  }

  // Log activity
  try {
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'message_sent',
      domain: 'communication',
      entityType: 'inquiry',
      entityId: input.inquiryId,
      summary: `Quick reply sent to ${input.clientName}`,
      context: { templateId: input.templateId || 'custom', channel: 'email' },
    })
  } catch (err) {
    console.error('[quickReply] Activity log failed (non-blocking):', err)
  }

  revalidatePath('/dashboard')
  revalidatePath('/inbox')

  return { success: true }
}

export async function sendBatchQuickReply(
  items: Array<{
    inquiryId: string
    clientEmail: string
    clientName: string
    occasion: string | null
  }>,
  templateId: string
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = { sent: 0, failed: 0, errors: [] as string[] }

  for (const item of items) {
    if (!item.clientEmail) {
      results.failed++
      results.errors.push(`${item.clientName}: no email`)
      continue
    }

    const result = await sendQuickReply({
      ...item,
      templateId,
    })

    if (result.success) {
      results.sent++
    } else {
      results.failed++
      results.errors.push(`${item.clientName}: ${result.error}`)
    }
  }

  return results
}
