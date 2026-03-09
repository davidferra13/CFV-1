import { DownloadableQrCard } from '@/components/qr/downloadable-qr-card'
import { getClientPortalUrl } from '@/lib/qr/qr-code'

interface ClientPortalQRProps {
  eventId: string
  appUrl?: string
}

export function ClientPortalQR({ eventId, appUrl }: ClientPortalQRProps) {
  const portalUrl = appUrl ? `${appUrl}/my-events/${eventId}` : getClientPortalUrl(eventId)

  return (
    <DownloadableQrCard
      url={portalUrl}
      title="Client portal"
      description="Share this with your client so they can review event details, tasks, and payment steps from their portal."
      downloadBaseName={`client-portal-${eventId}`}
      printTitle="Client portal"
      printSubtitle="Private event portal"
      openLabel="Open portal"
    />
  )
}
