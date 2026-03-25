import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { verifyCsrfOrigin } from '@/lib/security/csrf'
import { createServerClient } from '@/lib/db/server'
import { createNotification } from '@/lib/notifications/actions'
import { sendNotificationEmail } from '@/lib/notifications/email-service'
import { sendNotificationSms } from '@/lib/notifications/sms-service'
import { NOTIFICATION_CONFIG, type NotificationAction } from '@/lib/notifications/types'
import { checkRateLimit } from '@/lib/rateLimit'

const NotificationSendSchema = z.object({
  recipientAuthUserId: z.string().uuid().optional(),
  action: z.string().default('system_alert'),
  title: z.string().min(1),
  message: z.string().optional(),
  actionUrl: z.string().optional(),
  eventId: z.string().uuid().optional(),
  inquiryId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  channels: z
    .object({
      inApp: z.boolean().default(true),
      email: z.boolean().default(false),
      sms: z.boolean().default(false),
    })
    .default({ inApp: true, email: false, sms: false }),
  email: z
    .object({
      to: z.union([z.string().email(), z.array(z.string().email())]).optional(),
      template: z
        .enum(['generic_alert', 'payment_reminder', 'proposal_ready', 'contract_ready'])
        .default('generic_alert'),
    })
    .optional(),
  sms: z
    .object({
      to: z.string().optional(),
      template: z
        .enum(['generic_alert', 'payment_reminder', 'event_update', 'contract_ready'])
        .default('generic_alert'),
    })
    .optional(),
})

async function verifyRecipientScope(input: {
  tenantId: string
  recipientAuthUserId: string
}): Promise<boolean> {
  const db: any = createServerClient({ admin: true })
  const { data: role, error } = await db
    .from('user_roles')
    .select('role, entity_id')
    .eq('auth_user_id', input.recipientAuthUserId)
    .single()

  if (error || !role) return false
  if (role.role === 'chef') return role.entity_id === input.tenantId
  if (role.role === 'client') {
    const { data: client } = await db
      .from('clients')
      .select('tenant_id')
      .eq('id', role.entity_id)
      .single()
    return client?.tenant_id === input.tenantId
  }
  return false
}

export async function POST(request: NextRequest) {
  const csrfError = verifyCsrfOrigin(request)
  if (csrfError) return csrfError

  // Rate limit: 30 notifications per minute per IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  try {
    await checkRateLimit(`notif-send:${ip}`, 30, 60_000)
  } catch {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  let user
  try {
    user = await requireChef()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let parsed: z.infer<typeof NotificationSendSchema>
  try {
    parsed = NotificationSendSchema.parse(await request.json())
  } catch (error) {
    console.warn('[notifications/send] Invalid payload:', error)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const recipientId = parsed.recipientAuthUserId || user.id
  const recipientIsScoped = await verifyRecipientScope({
    tenantId: user.tenantId!,
    recipientAuthUserId: recipientId,
  })

  if (!recipientIsScoped) {
    return NextResponse.json({ error: 'Recipient is outside tenant scope' }, { status: 403 })
  }

  const action = parsed.action as NotificationAction
  const category = NOTIFICATION_CONFIG[action]?.category || 'system'
  const response: Record<string, unknown> = {
    inApp: 'skipped',
    email: 'skipped',
    sms: 'skipped',
  }

  if (parsed.channels.inApp) {
    await createNotification({
      tenantId: user.tenantId!,
      recipientId,
      category,
      action,
      title: parsed.title,
      body: parsed.message,
      actionUrl: parsed.actionUrl,
      eventId: parsed.eventId,
      inquiryId: parsed.inquiryId,
      clientId: parsed.clientId,
      metadata: {},
    })
    response.inApp = 'sent'
  }

  if (parsed.channels.email) {
    const emailResult = await sendNotificationEmail({
      to: parsed.email?.to || user.email,
      template: parsed.email?.template || 'generic_alert',
      variables: {
        recipientName: null,
        chefName: user.email,
        title: parsed.title,
        message: parsed.message,
        actionUrl: parsed.actionUrl,
      },
    })
    response.email = emailResult.success ? 'sent' : 'failed'
    response.emailSubject = emailResult.subject
  }

  if (parsed.channels.sms) {
    const phone = parsed.sms?.to
    if (!phone) {
      response.sms = 'skipped'
      response.smsReason = 'Missing phone number'
    } else {
      const smsResult = await sendNotificationSms({
        to: phone,
        template: parsed.sms?.template || 'generic_alert',
        variables: {
          title: parsed.title,
          message: parsed.message,
        },
      })
      response.sms = smsResult.success ? 'sent' : smsResult.status
    }
  }

  return NextResponse.json({
    success: true,
    tenantId: user.tenantId,
    recipientId,
    result: response,
  })
}
