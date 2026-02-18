// Email Notification Dispatchers
// Centralized email-sending functions called from transitions, webhooks, and crons.
// Each function is non-blocking (fire-and-forget) — errors logged, never thrown.

import { createElement } from 'react'
import { sendEmail } from './send'
import { ClientInvitationEmail } from './templates/client-invitation'
import { QuoteSentEmail } from './templates/quote-sent'
import { EventProposedEmail } from './templates/event-proposed'
import { PaymentConfirmationEmail } from './templates/payment-confirmation'
import { PaymentFailedEmail } from './templates/payment-failed'
import { EventConfirmedEmail } from './templates/event-confirmed'
import { EventCompletedEmail } from './templates/event-completed'
import { EventCancelledEmail } from './templates/event-cancelled'
import { EventReminderEmail } from './templates/event-reminder'
import { FrontOfHouseMenuReadyEmail } from './templates/front-of-house-menu-ready'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function buildLocation(event: { location_address?: string | null; location_city?: string | null; location_state?: string | null }): string | null {
  const parts = [event.location_address, event.location_city, event.location_state].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

// ─── Client Invitation ──────────────────────────────────────────────────

export async function sendClientInvitationEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  invitationUrl: string
  expiresInDays?: number
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `${params.chefName} invited you to CheFlow`,
    react: createElement(ClientInvitationEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      invitationUrl: params.invitationUrl,
      expiresInDays: params.expiresInDays ?? 7,
    }),
  })
}

// ─── Quote Sent ─────────────────────────────────────────────────────────

export async function sendQuoteSentEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  quoteId: string
  totalCents: number
  depositRequired: boolean
  depositCents: number | null
  occasion: string | null
  validUntil: string | null
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `New quote from ${params.chefName}: ${formatCents(params.totalCents)}`,
    react: createElement(QuoteSentEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      totalFormatted: formatCents(params.totalCents),
      depositFormatted: params.depositCents ? formatCents(params.depositCents) : null,
      depositRequired: params.depositRequired,
      occasion: params.occasion,
      validUntil: params.validUntil ? formatDate(params.validUntil) : null,
      quoteUrl: `${APP_URL}/my-quotes`,
    }),
  })
}

// ─── Event Proposed ─────────────────────────────────────────────────────

export async function sendEventProposedEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  eventId: string
  occasion: string
  eventDate: string
  guestCount: number | null
  location: string | null
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `Event proposal from ${params.chefName}: ${params.occasion}`,
    react: createElement(EventProposedEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      occasion: params.occasion,
      eventDate: formatDate(params.eventDate),
      guestCount: params.guestCount,
      location: params.location,
      eventUrl: `${APP_URL}/my-events/${params.eventId}`,
    }),
  })
}

// ─── Payment Confirmation ───────────────────────────────────────────────

export async function sendPaymentConfirmationEmail(params: {
  clientEmail: string
  clientName: string
  amountCents: number
  paymentType: string
  occasion: string
  eventDate: string | null
  remainingBalanceCents: number | null
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `Payment of ${formatCents(params.amountCents)} confirmed`,
    react: createElement(PaymentConfirmationEmail, {
      clientName: params.clientName,
      amountFormatted: formatCents(params.amountCents),
      paymentType: params.paymentType,
      occasion: params.occasion,
      eventDate: params.eventDate ? formatDate(params.eventDate) : null,
      remainingBalanceFormatted: params.remainingBalanceCents && params.remainingBalanceCents > 0
        ? formatCents(params.remainingBalanceCents)
        : null,
    }),
  })
}

// ─── Payment Failed ─────────────────────────────────────────────────────

export async function sendPaymentFailedEmail(params: {
  clientEmail: string
  clientName: string
  occasion: string
  eventId: string
  errorMessage: string | null
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `Payment failed for ${params.occasion}`,
    react: createElement(PaymentFailedEmail, {
      clientName: params.clientName,
      occasion: params.occasion,
      errorMessage: params.errorMessage,
      retryUrl: `${APP_URL}/my-events/${params.eventId}/pay`,
    }),
  })
}

// ─── Event Confirmed ────────────────────────────────────────────────────

export async function sendEventConfirmedEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  serveTime: string | null
  location: string | null
  guestCount: number | null
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `Your ${params.occasion} event is confirmed!`,
    react: createElement(EventConfirmedEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      occasion: params.occasion,
      eventDate: formatDate(params.eventDate),
      serveTime: params.serveTime,
      location: params.location,
      guestCount: params.guestCount,
    }),
  })
}

// ─── Event Completed ────────────────────────────────────────────────────

export async function sendEventCompletedEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  eventId: string
  occasion: string
  eventDate: string
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `How was your ${params.occasion}?`,
    react: createElement(EventCompletedEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      occasion: params.occasion,
      eventDate: formatDate(params.eventDate),
      reviewUrl: `${APP_URL}/my-events/${params.eventId}`,
    }),
  })
}

// ─── Event Cancelled ────────────────────────────────────────────────────

export async function sendEventCancelledEmail(params: {
  recipientEmail: string
  recipientName: string
  occasion: string
  eventDate: string
  cancelledBy: string
  reason: string | null
}) {
  await sendEmail({
    to: params.recipientEmail,
    subject: `${params.occasion} event has been cancelled`,
    react: createElement(EventCancelledEmail, {
      recipientName: params.recipientName,
      occasion: params.occasion,
      eventDate: formatDate(params.eventDate),
      cancelledBy: params.cancelledBy,
      reason: params.reason,
    }),
  })
}

// ─── Event Reminder ─────────────────────────────────────────────────────

export async function sendEventReminderEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  serveTime: string | null
  arrivalTime: string | null
  location: string | null
  guestCount: number | null
  specialRequests: string | null
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `Reminder: ${params.occasion} is tomorrow!`,
    react: createElement(EventReminderEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      occasion: params.occasion,
      eventDate: formatDate(params.eventDate),
      serveTime: params.serveTime,
      arrivalTime: params.arrivalTime,
      location: params.location,
      guestCount: params.guestCount,
      specialRequests: params.specialRequests,
    }),
  })
}

export async function sendFrontOfHouseMenuReadyEmail(params: {
  to: string | string[]
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  pdfFilename: string
  pdfBuffer: Buffer
}) {
  await sendEmail({
    to: params.to,
    subject: `Front-of-house menu ready: ${params.occasion}`,
    react: createElement(FrontOfHouseMenuReadyEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      occasion: params.occasion,
      eventDate: formatDate(params.eventDate),
    }),
    attachments: [
      {
        filename: params.pdfFilename,
        content: params.pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  })
}

// Re-export helper for use in integration points
export { buildLocation }
