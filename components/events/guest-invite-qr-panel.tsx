import { QrLinkSelector, type QrLinkSelectorOption } from '@/components/qr/qr-link-selector'
import { getGuestPortalUrl } from '@/lib/qr/qr-code'

type GuestRecord = {
  id: string
  full_name: string | null
  email?: string | null
  guest_token?: string | null
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function GuestInviteQrPanel({
  eventId,
  eventTitle,
  eventDate,
  guests,
}: {
  eventId: string
  eventTitle: string
  eventDate?: string | null
  guests: GuestRecord[]
}) {
  const options: QrLinkSelectorOption[] = guests
    .filter((guest) => !!guest.guest_token)
    .map((guest, index) => {
      const guestName = guest.full_name?.trim() || guest.email?.trim() || `Guest ${index + 1}`
      const subtitleParts = [
        eventTitle,
        eventDate
          ? new Date(`${eventDate}T00:00:00`).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })
          : null,
      ].filter(Boolean)

      return {
        id: guest.id,
        label: `${guestName} RSVP invite`,
        description: guest.email || 'Secure guest RSVP portal',
        url: getGuestPortalUrl(eventId, guest.guest_token as string),
        downloadBaseName: `guest-invite-${slugify(guestName)}`,
        printTitle: `${guestName} RSVP`,
        printSubtitle: subtitleParts.join(' • '),
      }
    })

  return (
    <QrLinkSelector
      title="Guest Invite QR"
      description="Select an invited guest to generate a private RSVP QR card that lands directly in their secure portal."
      fieldLabel="Guest"
      options={options}
      emptyMessage="Add guests first. Each guest QR is tied to an existing secure RSVP token."
    />
  )
}
