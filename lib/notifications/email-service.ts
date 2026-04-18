import { createElement, type ReactElement } from 'react'
import { sendEmail } from '@/lib/email/send'

export type NotificationEmailTemplate =
  | 'generic_alert'
  | 'payment_reminder'
  | 'proposal_ready'
  | 'contract_ready'

export type NotificationEmailInput = {
  to: string | string[]
  template: NotificationEmailTemplate
  variables: {
    recipientName?: string | null
    chefName?: string | null
    title: string
    message?: string | null
    actionUrl?: string | null
    actionLabel?: string | null
    amountCents?: number | null
    dueDate?: string | null
  }
}

export type NotificationEmailResult = {
  success: boolean
  subject: string
  error?: string
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function getTemplateCopy(input: NotificationEmailInput): {
  subject: string
  heading: string
  body: string
  actionLabel: string
} {
  const recipient = input.variables.recipientName?.trim() || 'there'
  const chefName = input.variables.chefName?.trim() || 'your chef'
  const title = input.variables.title.trim()
  const message = input.variables.message?.trim() || ''

  if (input.template === 'payment_reminder') {
    const amount = input.variables.amountCents ? formatCurrency(input.variables.amountCents) : null
    const dueDate = input.variables.dueDate ? ` by ${input.variables.dueDate}` : ''
    return {
      subject: `Payment reminder${amount ? `: ${amount}` : ''}`,
      heading: `Hi ${recipient},`,
      body: message || `A payment${amount ? ` of ${amount}` : ''} is due${dueDate}.`,
      actionLabel: input.variables.actionLabel || 'View invoice',
    }
  }

  if (input.template === 'proposal_ready') {
    return {
      subject: `${chefName} sent you a proposal`,
      heading: `Hi ${recipient},`,
      body: message || `Your proposal is ready to review: ${title}.`,
      actionLabel: input.variables.actionLabel || 'Review proposal',
    }
  }

  if (input.template === 'contract_ready') {
    return {
      subject: `${chefName} sent your contract`,
      heading: `Hi ${recipient},`,
      body: message || `Your contract is ready for review and signature: ${title}.`,
      actionLabel: input.variables.actionLabel || 'Review contract',
    }
  }

  return {
    subject: title,
    heading: `Hi ${recipient},`,
    body: message || title,
    actionLabel: input.variables.actionLabel || 'Open ChefFlow',
  }
}

function buildTemplateElement(copy: {
  heading: string
  body: string
  actionUrl?: string | null
  actionLabel: string
}): ReactElement {
  return createElement(
    'div',
    {
      style: {
        fontFamily: 'Arial, sans-serif',
        lineHeight: '1.5',
        color: '#1f2937',
        maxWidth: '560px',
      },
    },
    createElement('p', { style: { marginBottom: '12px' } }, copy.heading),
    createElement('p', { style: { marginBottom: '16px' } }, copy.body),
    copy.actionUrl
      ? createElement(
          'a',
          {
            href: copy.actionUrl,
            style: {
              display: 'inline-block',
              background: '#0f172a',
              color: '#ffffff',
              textDecoration: 'none',
              borderRadius: '8px',
              padding: '10px 14px',
              fontWeight: 600,
            },
          },
          copy.actionLabel
        )
      : null
  )
}

export async function sendNotificationEmail(
  input: NotificationEmailInput
): Promise<NotificationEmailResult> {
  const copy = getTemplateCopy(input)

  const sent = await sendEmail({
    to: input.to,
    subject: copy.subject,
    react: buildTemplateElement({
      heading: copy.heading,
      body: copy.body,
      actionUrl: input.variables.actionUrl,
      actionLabel: copy.actionLabel,
    }),
    isTransactional: true,
  })

  if (!sent) {
    return {
      success: false,
      subject: copy.subject,
      error: 'Email send failed',
    }
  }

  return { success: true, subject: copy.subject }
}
