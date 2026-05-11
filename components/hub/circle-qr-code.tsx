'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

type CircleQrCodeProps = {
  /** The full URL to encode (e.g. join URL) */
  url: string
  /** QR image size in pixels (default 200) */
  size?: number
  /** Show a download button beneath the QR */
  showDownload?: boolean
  className?: string
}

export function CircleQrCode({
  url,
  size = 200,
  showDownload = false,
  className,
}: CircleQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!url) return
    QRCode.toDataURL(url, {
      width: size,
      margin: 2,
      color: { dark: '#1c1917', light: '#fafaf9' },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(null))
  }, [url, size])

  if (!dataUrl) return null

  return (
    <div className={className}>
      <img
        src={dataUrl}
        alt="Dinner Circle QR code"
        width={size}
        height={size}
        className="rounded-lg"
      />
      {showDownload && (
        <a
          href={dataUrl}
          download="dinner-circle-qr.png"
          className="mt-2 block text-center text-xs font-medium text-stone-400 transition hover:text-[#e88f47]"
        >
          Save QR
        </a>
      )}
    </div>
  )
}
