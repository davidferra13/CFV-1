import { formatSmsBody, sendSms } from '@/lib/sms/send'

export type NotificationSmsTemplate =
  | 'generic_alert'
  | 'payment_reminder'
  | 'event_update'
  | 'contract_ready'

export type NotificationSmsInput = {
  to: string
  template: NotificationSmsTemplate
  variables: {
    title: string
    message?: string | null
    amountCents?: number | null
    dueDate?: string | null
  }
}

export type NotificationSmsResult = {
  success: boolean
  status: 'sent' | 'failed' | 'not_configured'
  body: string
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function renderMessage(input: NotificationSmsInput): string {
  const title = input.variables.title.trim()
  const message = input.variables.message?.trim()

  if (input.template === 'payment_reminder') {
    const amount = input.variables.amountCents ? formatCurrency(input.variables.amountCents) : null
    const due = input.variables.dueDate ? ` due ${input.variables.dueDate}` : ''
    return message || `Payment reminder: ${amount ? `${amount}` : title}${due}.`
  }

  if (input.template === 'event_update') {
    return message || `Event update: ${title}`
  }

  if (input.template === 'contract_ready') {
    return message || `Contract ready: ${title}`
  }

  return message || title
}

export async function sendNotificationSms(
  input: NotificationSmsInput
): Promise<NotificationSmsResult> {
  const message = renderMessage(input)
  const body = formatSmsBody(input.variables.title, message)
  const status = await sendSms(input.to, body)

  return {
    success: status === 'sent',
    status,
    body,
  }
}
