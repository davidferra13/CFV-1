// ClientPortalQR — displays a scannable QR code for the client's event portal URL.
// Uses QR Server (https://api.qrserver.com) — free, no API key required.

interface ClientPortalQRProps {
  eventId: string
  /** Override the base URL. Defaults to NEXT_PUBLIC_APP_URL or window.location.origin. */
  appUrl?: string
}

export function ClientPortalQR({ eventId, appUrl }: ClientPortalQRProps) {
  const base = appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://your-domain.com'

  const portalUrl = `${base}/my-events/${eventId}`
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&ecc=M&data=${encodeURIComponent(portalUrl)}`

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrSrc}
        alt="Client portal QR code"
        width={180}
        height={180}
        className="rounded border border-stone-200 shadow-sm"
      />
      <div className="text-center">
        <p className="text-xs text-stone-500 font-medium">Client Portal</p>
        <p className="text-xs text-stone-400 max-w-[200px] break-all mt-0.5">{portalUrl}</p>
      </div>
      <a
        href={portalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-brand-600 hover:underline"
      >
        Open portal ↗
      </a>
    </div>
  )
}
