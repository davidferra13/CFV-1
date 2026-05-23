'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { sendEmail } from '@/lib/email/send'
import { logChefActivity } from '@/lib/activity/log-chef'
import { createElement } from 'react'
import { fillQuickReplyTemplate, QUICK_REPLY_TEMPLATES } from './quick-reply-templates'

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
    body = fillQuickReplyTemplate(template.body, {
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
