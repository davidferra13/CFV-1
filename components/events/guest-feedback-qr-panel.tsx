import { QrLinkSelector, type QrLinkSelectorOption } from '@/components/qr/qr-link-selector'
import { getGuestFeedbackUrl } from '@/lib/qr/qr-code'

type GuestFeedbackRequest = {
  id: string
  token: string
  guestName: string
  guestEmail?: string | null
  submitted_at?: string | null
  overall_rating?: number | null
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function GuestFeedbackQrPanel({
  eventTitle,
  feedbackRequests,
}: {
  eventTitle: string
  feedbackRequests: GuestFeedbackRequest[]
}) {
  const options: QrLinkSelectorOption[] = feedbackRequests.map((request) => {
    const status = request.submitted_at
      ? request.overall_rating
        ? `Submitted • ${request.overall_rating}/5`
        : 'Submitted'
      : 'Pending response'

    return {
      id: request.id,
      label: `${request.guestName} feedback`,
      description: request.guestEmail ? `${request.guestEmail} • ${status}` : status,
      url: getGuestFeedbackUrl(request.token),
      downloadBaseName: `guest-feedback-${slugify(request.guestName)}`,
      printTitle: `${request.guestName} feedback`,
      printSubtitle: eventTitle,
    }
  })

  return (
    <QrLinkSelector
      title="Guest Feedback QR"
      description="Use these cards on thank-you notes or follow-up materials so guests can submit testimonials without logging in."
      fieldLabel="Guest"
      options={options}
      emptyMessage="Send guest feedback requests first. QR cards appear after feedback tokens are created."
    />
  )
}
