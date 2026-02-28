// Email Notification Dispatchers
// Centralized email-sending functions called from transitions, webhooks, and crons.
// Each function is non-blocking (fire-and-forget) — errors logged, never thrown.

import { parseISO } from 'date-fns'
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
import { PrepSheetReadyEmail } from './templates/prep-sheet-ready'
import { IncentiveDeliveryEmail } from './templates/incentive-delivery'
import { GiftCardPurchaseConfirmationEmail } from './templates/gift-card-purchase-confirmation'
import { InquiryReceivedEmail } from './templates/inquiry-received'
import { OfflinePaymentReceiptEmail } from './templates/offline-payment-receipt'
import { RefundInitiatedEmail } from './templates/refund-initiated'
import { PaymentReminderEmail } from './templates/payment-reminder'
import { PaymentReceivedChefEmail } from './templates/payment-received-chef'
import { EventPrepareEmail } from './templates/event-prepare'
import { EventReminder2dEmail } from './templates/event-reminder-2d'
import { EventReminder30dEmail } from './templates/event-reminder-30d'
import { EventReminder14dEmail } from './templates/event-reminder-14d'
import { QuoteExpiringEmail } from './templates/quote-expiring'
import { PhotosReadyEmail } from './templates/photos-ready'
import { NewMessageChefEmail } from './templates/new-message-chef'
import { QuoteAcceptedChefEmail } from './templates/quote-accepted-chef'
import { FollowUpDueChefEmail } from './templates/follow-up-due-chef'
import { NewInquiryChefEmail } from './templates/new-inquiry-chef'
import { GiftCardPurchasedChefEmail } from './templates/gift-card-purchased-chef'
import { CollaborationInviteEmail } from './templates/collaboration-invite'
import { RecipeShareEmail } from './templates/recipe-share'
import { PostEventSurveyEmail } from './templates/post-event-survey'
import { InstantBookingChefEmail } from './templates/instant-booking-chef'
import { QuoteRejectedChefEmail } from './templates/quote-rejected-chef'
import { QuoteExpiredChefEmail } from './templates/quote-expired-chef'
import { QuoteExpiredClientEmail } from './templates/quote-expired-client'
import { EventStartingEmail } from './templates/event-starting'
import { InstantBookingClientEmail } from './templates/instant-booking-client'
import { ReviewSubmittedChefEmail } from './templates/review-submitted-chef'
import { PostEventThankYouEmail } from './templates/post-event-thank-you'
import { PostEventReviewRequestEmail } from './templates/post-event-review-request'
import { PostEventReferralAskEmail } from './templates/post-event-referral-ask'
import { ContractSignedChefEmail } from './templates/contract-signed-chef'
import { MenuApprovedChefEmail } from './templates/menu-approved-chef'
import { MenuRevisionChefEmail } from './templates/menu-revision-chef'
import { AvailabilitySignalEmail } from './templates/availability-signal'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(date: string): string {
  return parseISO(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function buildLocation(event: {
  location_address?: string | null
  location_city?: string | null
  location_state?: string | null
}): string | null {
  const parts = [event.location_address, event.location_city, event.location_state].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

// ─── Inquiry Received ───────────────────────────────────────────────────

export async function sendInquiryReceivedEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  occasion: string
  eventDate: string | null
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `${params.chefName} received your inquiry`,
    react: createElement(InquiryReceivedEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      occasion: params.occasion,
      eventDate: params.eventDate,
    }),
  })
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
    subject: `${params.chefName} invited you to ChefFlow`,
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
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum' | null
  loyaltyPoints?: number | null
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
      remainingBalanceFormatted:
        params.remainingBalanceCents && params.remainingBalanceCents > 0
          ? formatCents(params.remainingBalanceCents)
          : null,
      loyaltyTier: params.loyaltyTier ?? null,
      loyaltyPoints: params.loyaltyPoints ?? null,
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
  eventId: string
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
      calendarUrl: `${APP_URL}/api/calendar/event/${params.eventId}`,
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
    subject: `Thank you for dining with ${params.chefName}`,
    react: createElement(EventCompletedEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      occasion: params.occasion,
      eventDate: formatDate(params.eventDate),
      receiptUrl: `${APP_URL}/my-events/${params.eventId}`,
      reviewUrl: `${APP_URL}/my-events/${params.eventId}#review`,
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

export async function sendIncentiveDeliveryEmail(params: {
  recipientEmail: string
  recipientName?: string | null
  senderName: string
  incentiveType: 'voucher' | 'gift_card'
  title: string
  code: string
  valueLabel: string
  expiresAt?: string | null
  personalMessage?: string | null
}) {
  const typeLabel = params.incentiveType === 'gift_card' ? 'gift card' : 'voucher'

  await sendEmail({
    to: params.recipientEmail,
    subject: `You received a ${typeLabel} from ${params.senderName}`,
    react: createElement(IncentiveDeliveryEmail, {
      recipientName: params.recipientName,
      senderName: params.senderName,
      incentiveType: params.incentiveType,
      title: params.title,
      code: params.code,
      valueLabel: params.valueLabel,
      expiresAt: params.expiresAt,
      personalMessage: params.personalMessage,
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
    subject: `Your guest menu is ready: ${params.occasion}`,
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

// ─── Prep Sheet Ready (chef only) ───────────────────────────────────────

export async function sendPrepSheetReadyEmail(params: {
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
    subject: `Prep sheet ready: ${params.occasion}`,
    react: createElement(PrepSheetReadyEmail, {
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

// ─── Gift Card Purchase Confirmation ────────────────────────────────────

export async function sendGiftCardPurchaseConfirmationEmail(params: {
  buyerEmail: string
  recipientEmail: string
  recipientName?: string | null
  amountCents: number
  code: string
  chefName: string
}) {
  const amountFormatted = formatCents(params.amountCents)

  await sendEmail({
    to: params.buyerEmail,
    subject: `Your ${amountFormatted} gift card for ${params.chefName} has been sent`,
    react: createElement(GiftCardPurchaseConfirmationEmail, {
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName,
      amountFormatted,
      code: params.code,
      chefName: params.chefName,
    }),
  })
}

// ─── Offline Payment Receipt ─────────────────────────────────────────────

export async function sendOfflinePaymentReceiptEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  amountCents: number
  paymentMethod: string
  entryType: string
  occasion: string
  eventDate: string | null
  paidAt: string
  remainingBalanceCents: number | null
  loyaltyTier?: string
  loyaltyPoints?: number
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `Payment receipt: ${formatCents(params.amountCents)} for ${params.occasion}`,
    react: createElement(OfflinePaymentReceiptEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      amountFormatted: formatCents(params.amountCents),
      paymentMethod: params.paymentMethod,
      entryType: params.entryType,
      occasion: params.occasion,
      eventDate: params.eventDate ? formatDate(params.eventDate) : params.paidAt,
      remainingBalanceFormatted:
        params.remainingBalanceCents && params.remainingBalanceCents > 0
          ? formatCents(params.remainingBalanceCents)
          : null,
      loyaltyTier: params.loyaltyTier,
      loyaltyPoints: params.loyaltyPoints,
    }),
  })
}

// ─── Refund Initiated ────────────────────────────────────────────────────

export async function sendRefundInitiatedEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  amountCents: number
  reason: string
  isStripeRefund: boolean
  occasion: string
  eventDate: string | null
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `Refund of ${formatCents(params.amountCents)} initiated for ${params.occasion}`,
    react: createElement(RefundInitiatedEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      amountFormatted: formatCents(params.amountCents),
      reason: params.reason,
      isStripeRefund: params.isStripeRefund,
      occasion: params.occasion,
      eventDate: params.eventDate ? formatDate(params.eventDate) : 'your event',
    }),
  })
}

// ─── Payment Reminder ────────────────────────────────────────────────────

export async function sendPaymentReminderEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  daysUntilEvent: number
  amountDueCents: number
  depositAmountCents: number | null
  eventId: string
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `Payment reminder: ${params.occasion} is in ${params.daysUntilEvent} day${params.daysUntilEvent === 1 ? '' : 's'}`,
    react: createElement(PaymentReminderEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      occasion: params.occasion,
      eventDate: formatDate(params.eventDate),
      daysUntilEvent: params.daysUntilEvent,
      amountDueFormatted: formatCents(params.amountDueCents),
      depositAmountFormatted:
        params.depositAmountCents && params.depositAmountCents > 0
          ? formatCents(params.depositAmountCents)
          : null,
      paymentUrl: `${APP_URL}/my-events/${params.eventId}/pay`,
    }),
  })
}

// ─── Payment Received — Chef Notification ───────────────────────────────

export async function sendPaymentReceivedChefEmail(params: {
  chefEmail: string
  chefName: string
  clientName: string
  amountCents: number
  paymentType: string
  occasion: string
  eventDate: string | null
  eventId: string
  remainingBalanceCents: number | null
}) {
  await sendEmail({
    to: params.chefEmail,
    subject: `Payment received: ${formatCents(params.amountCents)} from ${params.clientName}`,
    react: createElement(PaymentReceivedChefEmail, {
      chefName: params.chefName,
      clientName: params.clientName,
      amountFormatted: formatCents(params.amountCents),
      paymentType: params.paymentType,
      occasion: params.occasion,
      eventDate: params.eventDate ? formatDate(params.eventDate) : 'TBD',
      eventUrl: `${APP_URL}/events/${params.eventId}`,
      remainingBalanceFormatted:
        params.remainingBalanceCents && params.remainingBalanceCents > 0
          ? formatCents(params.remainingBalanceCents)
          : null,
    }),
  })
}

// ─── Event Prepare (7-day pre-event) ─────────────────────────────────────

export async function sendEventPrepareEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  serveTime: string | null
  arrivalTime: string | null
  location: string | null
  guestCount: number | null
  eventId: string
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `${params.chefName} is coming in 7 days — here's what to know`,
    react: createElement(EventPrepareEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      occasion: params.occasion,
      eventDate: formatDate(params.eventDate),
      serveTime: params.serveTime,
      arrivalTime: params.arrivalTime,
      location: params.location,
      guestCount: params.guestCount,
      eventId: params.eventId,
      appUrl: APP_URL,
    }),
  })
}

// ─── Event 2-Day Reminder ────────────────────────────────────────────────

export async function sendEventReminder2dEmail(params: {
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
  eventId: string
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `Reminder: ${params.occasion} is in 2 days`,
    react: createElement(EventReminder2dEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      occasion: params.occasion,
      eventDate: formatDate(params.eventDate),
      serveTime: params.serveTime,
      arrivalTime: params.arrivalTime,
      location: params.location,
      guestCount: params.guestCount,
      specialRequests: params.specialRequests,
      eventId: params.eventId,
      appUrl: APP_URL,
    }),
  })
}

// ─── Event 30-Day Reminder ──────────────────────────────────────────────

export async function sendEventReminder30dEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  guestCount: number | null
  location: string | null
  eventId: string
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `Looking forward to your ${params.occasion} next month`,
    react: createElement(EventReminder30dEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      occasion: params.occasion,
      eventDate: formatDate(params.eventDate),
      guestCount: params.guestCount,
      location: params.location,
      eventId: params.eventId,
      appUrl: APP_URL,
    }),
  })
}

// ─── Event 14-Day Reminder ──────────────────────────────────────────────

export async function sendEventReminder14dEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  serveTime: string | null
  guestCount: number | null
  location: string | null
  specialRequests: string | null
  eventId: string
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `Your ${params.occasion} is coming up in two weeks`,
    react: createElement(EventReminder14dEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      occasion: params.occasion,
      eventDate: formatDate(params.eventDate),
      serveTime: params.serveTime,
      guestCount: params.guestCount,
      location: params.location,
      specialRequests: params.specialRequests,
      eventId: params.eventId,
      appUrl: APP_URL,
    }),
  })
}

// ─── Quote Expiring (48h warning) ───────────────────────────────────────

export async function sendQuoteExpiringEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  occasion: string | null
  validUntil: string // ISO date string
  totalCents: number
  quoteId: string
}) {
  const occasionLabel = params.occasion || 'your event'
  await sendEmail({
    to: params.clientEmail,
    subject: `Your quote for ${occasionLabel} expires in 48 hours`,
    react: createElement(QuoteExpiringEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      occasion: params.occasion,
      validUntil: formatDate(params.validUntil),
      totalFormatted: formatCents(params.totalCents),
      quoteId: params.quoteId,
      appUrl: APP_URL,
    }),
  })
}

// ─── Photos Ready ────────────────────────────────────────────────────────

export async function sendPhotosReadyEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  photoCount: number
  eventId: string
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `Your ${params.occasion} photos are ready`,
    react: createElement(PhotosReadyEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      occasion: params.occasion,
      eventDate: formatDate(params.eventDate),
      photoCount: params.photoCount,
      eventId: params.eventId,
      appUrl: APP_URL,
    }),
  })
}

// ─── New Message — Chef Notification ────────────────────────────────────────

export async function sendNewMessageChefEmail(params: {
  chefEmail: string
  chefName: string
  clientName: string
  messagePreview: string
  conversationUrl: string
}) {
  await sendEmail({
    to: params.chefEmail,
    subject: `New message from ${params.clientName}`,
    react: createElement(NewMessageChefEmail, {
      chefName: params.chefName,
      clientName: params.clientName,
      messagePreview: params.messagePreview.slice(0, 120),
      conversationUrl: params.conversationUrl,
    }),
  })
}

// ─── Quote Accepted — Chef Notification ─────────────────────────────────────

export async function sendQuoteAcceptedChefEmail(params: {
  chefEmail: string
  chefName: string
  clientName: string
  quoteName: string
  totalCents: number
  depositRequired: boolean
  depositCents: number | null
  inquiryId: string
}) {
  await sendEmail({
    to: params.chefEmail,
    subject: `${params.clientName} accepted your quote`,
    react: createElement(QuoteAcceptedChefEmail, {
      chefName: params.chefName,
      clientName: params.clientName,
      quoteName: params.quoteName,
      totalFormatted: formatCents(params.totalCents),
      depositRequired: params.depositRequired,
      depositFormatted: params.depositCents ? formatCents(params.depositCents) : null,
      inquiryUrl: `${APP_URL}/inquiries/${params.inquiryId}`,
    }),
  })
}

// ─── Follow-Up Due — Chef Notification ──────────────────────────────────────

export async function sendFollowUpDueChefEmail(params: {
  chefEmail: string
  chefName: string
  clientName: string
  occasion: string | null
  followUpNote: string | null
  daysOverdue: number
  inquiryId: string
}) {
  await sendEmail({
    to: params.chefEmail,
    subject: `Follow-up due: ${params.clientName}`,
    react: createElement(FollowUpDueChefEmail, {
      chefName: params.chefName,
      clientName: params.clientName,
      occasion: params.occasion,
      followUpNote: params.followUpNote,
      daysOverdue: params.daysOverdue,
      clientUrl: `${APP_URL}/inquiries/${params.inquiryId}`,
    }),
  })
}

// ─── New Inquiry — Chef Notification ────────────────────────────────────────

export async function sendNewInquiryChefEmail(params: {
  chefEmail: string
  chefName: string
  clientName: string
  occasion: string | null
  eventDate: string | null
  guestCount: number | null
  source: 'portal' | 'wix' | 'gmail' | 'manual'
  inquiryId: string
}) {
  await sendEmail({
    to: params.chefEmail,
    subject: `New inquiry from ${params.clientName}`,
    react: createElement(NewInquiryChefEmail, {
      chefName: params.chefName,
      clientName: params.clientName,
      occasion: params.occasion,
      eventDate: params.eventDate ? formatDate(params.eventDate) : null,
      guestCount: params.guestCount,
      source: params.source,
      inquiryUrl: `${APP_URL}/inquiries/${params.inquiryId}`,
    }),
  })
}

// ─── Gift Card Purchased — Chef Notification ─────────────────────────────────

export async function sendGiftCardPurchasedChefEmail(params: {
  chefEmail: string
  chefName: string
  buyerName: string | null
  recipientName: string | null
  amountCents: number
  code: string
}) {
  await sendEmail({
    to: params.chefEmail,
    subject: `Gift card sold: ${formatCents(params.amountCents)}`,
    react: createElement(GiftCardPurchasedChefEmail, {
      chefName: params.chefName,
      buyerName: params.buyerName,
      recipientName: params.recipientName,
      amountFormatted: formatCents(params.amountCents),
      code: params.code,
    }),
  })
}

// ─── Collaboration Invite — Chef-to-Chef ─────────────────────────────────────

export async function sendCollaborationInviteEmail(params: {
  chefEmail: string // Recipient (invited chef)
  chefName: string
  inviterName: string
  occasion: string
  eventDate: string | null // ISO date string or null
  role: string // CollaboratorRole
  note: string | null
}) {
  await sendEmail({
    to: params.chefEmail,
    subject: `${params.inviterName} invited you to collaborate on ${params.occasion}`,
    react: createElement(CollaborationInviteEmail, {
      chefName: params.chefName,
      inviterName: params.inviterName,
      occasion: params.occasion,
      eventDate: params.eventDate ? formatDate(params.eventDate) : null,
      role: params.role,
      note: params.note,
      dashboardUrl: `${APP_URL}/dashboard`,
    }),
  })
}

// ─── Recipe Share — Chef-to-Chef ─────────────────────────────────────────────

export async function sendRecipeShareEmail(params: {
  chefEmail: string // Recipient (chef receiving the share)
  chefName: string
  sharerName: string
  recipeName: string
  category: string | null
  note: string | null
}) {
  await sendEmail({
    to: params.chefEmail,
    subject: `${params.sharerName} shared a recipe with you: ${params.recipeName}`,
    react: createElement(RecipeShareEmail, {
      chefName: params.chefName,
      sharerName: params.sharerName,
      recipeName: params.recipeName,
      category: params.category,
      note: params.note,
      dashboardUrl: `${APP_URL}/dashboard`,
    }),
  })
}

// ─── Post-Event Survey ───────────────────────────────────────────────────────

export async function sendPostEventSurveyEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  occasion: string
  surveyUrl: string
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `How was your ${params.occasion} with ${params.chefName}?`,
    react: createElement(PostEventSurveyEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      occasion: params.occasion,
      surveyUrl: params.surveyUrl,
    }),
  })
}

/**
 * Send instant-booking notification to chef.
 * Fired when a client books instantly via the public booking page and pays the deposit.
 */
export async function sendInstantBookingChefEmail(params: {
  chefEmail: string
  chefName: string
  clientName: string
  clientEmail: string
  occasion: string
  eventDate: string | null
  guestCount: number
  depositCents: number
  totalCents: number
  eventId: string
}) {
  await sendEmail({
    to: params.chefEmail,
    subject: `New instant booking: ${params.clientName} — ${params.occasion}`,
    react: createElement(InstantBookingChefEmail, {
      chefName: params.chefName,
      clientName: params.clientName,
      clientEmail: params.clientEmail,
      occasion: params.occasion,
      eventDate: params.eventDate ? formatDate(params.eventDate) : 'TBD',
      guestCount: params.guestCount,
      depositFormatted: formatCents(params.depositCents),
      totalFormatted: formatCents(params.totalCents),
      eventUrl: `${APP_URL}/events/${params.eventId}`,
    }),
  })
}

// ─── Quote Rejected — Chef Notification ─────────────────────────────────────

export async function sendQuoteRejectedChefEmail(params: {
  chefEmail: string
  chefName: string
  clientName: string
  quoteName: string
  rejectionReason: string | null
  inquiryId: string | null
}) {
  await sendEmail({
    to: params.chefEmail,
    subject: `${params.clientName} declined your quote`,
    react: createElement(QuoteRejectedChefEmail, {
      chefName: params.chefName,
      clientName: params.clientName,
      quoteName: params.quoteName,
      rejectionReason: params.rejectionReason,
      inquiryUrl: params.inquiryId
        ? `${APP_URL}/inquiries/${params.inquiryId}`
        : `${APP_URL}/inquiries`,
    }),
  })
}

// ─── Quote Expired — Chef Notification ──────────────────────────────────────

export async function sendQuoteExpiredChefEmail(params: {
  chefEmail: string
  chefName: string
  clientName: string
  quoteName: string
  inquiryId: string | null
}) {
  await sendEmail({
    to: params.chefEmail,
    subject: `Quote for ${params.clientName} expired`,
    react: createElement(QuoteExpiredChefEmail, {
      chefName: params.chefName,
      clientName: params.clientName,
      quoteName: params.quoteName,
      inquiryUrl: params.inquiryId
        ? `${APP_URL}/inquiries/${params.inquiryId}`
        : `${APP_URL}/inquiries`,
    }),
  })
}

// ─── Quote Expired — Client Notification ────────────────────────────────────

export async function sendQuoteExpiredClientEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  quoteName: string
  chefEmail: string | null
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `Your quote from ${params.chefName} has expired`,
    react: createElement(QuoteExpiredClientEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      quoteName: params.quoteName,
      chefEmail: params.chefEmail,
    }),
  })
}

// ─── Event Starting — Client Notification ───────────────────────────────────

export async function sendEventStartingEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  arrivalTime: string | null
  serveTime: string | null
  location: string | null
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `${params.chefName} is on the way — ${params.occasion}`,
    react: createElement(EventStartingEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      occasion: params.occasion,
      eventDate: formatDate(params.eventDate),
      arrivalTime: params.arrivalTime,
      serveTime: params.serveTime,
      location: params.location,
    }),
  })
}

// ─── Instant Booking — Client Confirmation ──────────────────────────────────

export async function sendInstantBookingClientEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  occasion: string
  eventDate: string | null
  guestCount: number
  depositCents: number
  totalCents: number
  eventId: string
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `Booking confirmed — ${params.occasion} with ${params.chefName}`,
    react: createElement(InstantBookingClientEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      occasion: params.occasion,
      eventDate: params.eventDate ? formatDate(params.eventDate) : 'TBD',
      guestCount: params.guestCount,
      depositFormatted: formatCents(params.depositCents),
      totalFormatted: formatCents(params.totalCents),
      eventUrl: `${APP_URL}/my-events/${params.eventId}`,
    }),
  })
}

// ─── Review Submitted — Chef Notification ───────────────────────────────────

export async function sendReviewSubmittedChefEmail(params: {
  chefEmail: string
  chefName: string
  clientName: string
  occasion: string
  rating: number
  reviewExcerpt: string | null
  reviewId: string
}) {
  await sendEmail({
    to: params.chefEmail,
    subject: `${params.clientName} left you a review`,
    react: createElement(ReviewSubmittedChefEmail, {
      chefName: params.chefName,
      clientName: params.clientName,
      occasion: params.occasion,
      rating: params.rating,
      reviewExcerpt: params.reviewExcerpt,
      reviewUrl: `${APP_URL}/reviews/${params.reviewId}`,
    }),
  })
}

// ─── Post-Event Thank You (3 days after completion) ─────────────────────────

export async function sendPostEventThankYouEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  bookAgainUrl: string
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum' | null
  loyaltyPointsEarned?: number | null
  loyaltyPointsBalance?: number | null
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `${params.chefName} wanted to say thank you`,
    react: createElement(PostEventThankYouEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      occasion: params.occasion,
      eventDate: formatDate(params.eventDate),
      bookAgainUrl: params.bookAgainUrl,
      loyaltyTier: params.loyaltyTier ?? null,
      loyaltyPointsEarned: params.loyaltyPointsEarned ?? null,
      loyaltyPointsBalance: params.loyaltyPointsBalance ?? null,
    }),
  })
}

// ─── Post-Event Review Request (7 days after completion) ────────────────────

export async function sendPostEventReviewRequestEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  reviewUrl: string
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `Your feedback means the world to ${params.chefName}`,
    react: createElement(PostEventReviewRequestEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      occasion: params.occasion,
      eventDate: formatDate(params.eventDate),
      reviewUrl: params.reviewUrl,
    }),
  })
}

// ─── Post-Event Referral Ask (14 days after completion) ─────────────────────

export async function sendPostEventReferralAskEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  occasion: string
  bookingUrl: string
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `Know someone who'd love a private chef experience?`,
    react: createElement(PostEventReferralAskEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      occasion: params.occasion,
      bookingUrl: params.bookingUrl,
    }),
  })
}

// ─── Contract Signed — Chef Notification ────────────────────────────────────

export async function sendContractSignedChefEmail(params: {
  chefEmail: string
  chefName: string
  clientName: string
  occasion: string
  eventDate: string
  eventId: string
}) {
  await sendEmail({
    to: params.chefEmail,
    subject: `Contract signed — ${params.occasion}`,
    react: createElement(ContractSignedChefEmail, {
      chefName: params.chefName,
      clientName: params.clientName,
      occasion: params.occasion,
      eventDate: params.eventDate ? formatDate(params.eventDate) : 'TBD',
      eventUrl: `${APP_URL}/events/${params.eventId}`,
    }),
  })
}

// ─── Menu Approved — Chef Notification ──────────────────────────────────────

export async function sendMenuApprovedChefEmail(params: {
  chefEmail: string
  chefName: string
  clientName: string
  occasion: string
  eventDate: string
  eventId: string
}) {
  await sendEmail({
    to: params.chefEmail,
    subject: `Menu approved — ${params.occasion}`,
    react: createElement(MenuApprovedChefEmail, {
      chefName: params.chefName,
      clientName: params.clientName,
      occasion: params.occasion,
      eventDate: params.eventDate ? formatDate(params.eventDate) : 'TBD',
      eventUrl: `${APP_URL}/events/${params.eventId}`,
    }),
  })
}

// ─── Menu Revision Requested — Chef Notification ────────────────────────────

export async function sendMenuRevisionChefEmail(params: {
  chefEmail: string
  chefName: string
  clientName: string
  occasion: string
  eventDate: string
  revisionNotes: string
  eventId: string
}) {
  await sendEmail({
    to: params.chefEmail,
    subject: `Menu revision requested — ${params.occasion}`,
    react: createElement(MenuRevisionChefEmail, {
      chefName: params.chefName,
      clientName: params.clientName,
      occasion: params.occasion,
      eventDate: params.eventDate ? formatDate(params.eventDate) : 'TBD',
      revisionNotes: params.revisionNotes,
      eventUrl: `${APP_URL}/events/${params.eventId}`,
    }),
  })
}

// ─── Availability Signal — Notify Opted-In Clients ──────────────────────────

export async function sendAvailabilitySignalEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  title: string
  date: string
  publicNote: string | null
}) {
  await sendEmail({
    to: params.clientEmail,
    subject: `${params.chefName} has availability on ${formatDate(params.date)}`,
    react: createElement(AvailabilitySignalEmail, {
      clientName: params.clientName,
      chefName: params.chefName,
      title: params.title,
      date: formatDate(params.date),
      publicNote: params.publicNote,
    }),
  })
}

// Re-export helper for use in integration points
export { buildLocation }
