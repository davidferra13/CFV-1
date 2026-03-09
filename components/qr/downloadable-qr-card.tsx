'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Download, ExternalLink, Printer, QrCode } from '@/components/ui/icons'
import { toast } from 'sonner'

type DownloadableQrCardProps = {
  url: string
  title: string
  description?: string | null
  downloadBaseName: string
  printTitle?: string
  printSubtitle?: string
  openLabel?: string
  previewSize?: number
  className?: string
}

function getQrUrl(
  data: string,
  size: number,
  format: 'png' | 'svg' | 'jpg' | 'eps' = 'png'
): string {
  const params = new URLSearchParams({
    size: `${size}x${size}`,
    data,
    format,
  })

  return `https://api.qrserver.com/v1/create-qr-code/?${params}`
}

function sanitizeFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function DownloadableQrCard({
  url,
  title,
  description,
  downloadBaseName,
  printTitle,
  printSubtitle,
  openLabel = 'Open link',
  previewSize = 180,
  className = '',
}: DownloadableQrCardProps) {
  const [copied, setCopied] = useState(false)
  const [downloadingFormat, setDownloadingFormat] = useState<'png' | 'svg' | null>(null)

  const previewUrl = getQrUrl(url, previewSize)
  const fileBaseName = sanitizeFileName(downloadBaseName) || 'qr-code'

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Link copied')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy link')
    }
  }

  async function handleDownload(format: 'png' | 'svg') {
    setDownloadingFormat(format)

    try {
      const response = await fetch(getQrUrl(url, 1000, format))
      if (!response.ok) {
        throw new Error('QR download failed')
      }

      const blob = await response.blob()
      const objectUrl = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `${fileBaseName}.${format}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(objectUrl)
    } catch {
      toast.error(`Could not download ${format.toUpperCase()} QR`)
    } finally {
      setDownloadingFormat(null)
    }
  }

  function handlePrint() {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')

    if (!printWindow) {
      toast.error('Allow popups to print this QR code')
      return
    }

    const safeTitle = escapeHtml(printTitle || title)
    const safeSubtitle = escapeHtml(printSubtitle || description || '')
    const safeUrl = escapeHtml(url)
    const safeQrUrl = escapeHtml(getQrUrl(url, 900))

    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>${safeTitle}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        font-family: Inter, "Segoe UI", sans-serif;
        margin: 0;
        padding: 32px;
        color: #1c1917;
        background: #ffffff;
      }
      .card {
        max-width: 560px;
        margin: 0 auto;
        border: 2px solid #e7e5e4;
        border-radius: 24px;
        padding: 32px;
        text-align: center;
      }
      .eyebrow {
        letter-spacing: 0.16em;
        text-transform: uppercase;
        font-size: 12px;
        color: #78716c;
        margin: 0 0 10px;
      }
      h1 {
        margin: 0;
        font-size: 32px;
        line-height: 1.1;
      }
      p {
        margin: 12px 0 0;
        color: #57534e;
      }
      img {
        width: 320px;
        height: 320px;
        margin: 28px auto 20px;
        display: block;
      }
      .url {
        margin-top: 20px;
        font-size: 12px;
        word-break: break-all;
        color: #78716c;
      }
      @media print {
        body {
          padding: 0;
        }
        .card {
          border: none;
          max-width: none;
          padding: 32px 24px;
        }
      }
    </style>
  </head>
  <body>
    <main class="card">
      <p class="eyebrow">ChefFlow QR</p>
      <h1>${safeTitle}</h1>
      ${safeSubtitle ? `<p>${safeSubtitle}</p>` : ''}
      <img src="${safeQrUrl}" alt="QR code for ${safeTitle}" />
      <p class="url">${safeUrl}</p>
    </main>
    <script>
      window.onload = function() {
        window.print()
      }
    </script>
  </body>
</html>`)
    printWindow.document.close()
  }

  return (
    <div
      className={`rounded-xl border border-stone-700 bg-stone-900/60 p-4 sm:p-5 ${className}`}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center">
        <div className="flex shrink-0 flex-col items-center rounded-xl border border-stone-700 bg-stone-950/60 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={`${title} QR code`}
            width={previewSize}
            height={previewSize}
            className="rounded-lg bg-white p-2 shadow-sm"
          />
          <div className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-stone-400">
            <QrCode className="h-4 w-4" />
            Scan to open
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h3 className="text-base font-semibold text-stone-100">{title}</h3>
            {description && <p className="mt-1 text-sm text-stone-400">{description}</p>}
          </div>

          <div className="rounded-lg border border-stone-700 bg-stone-950/40 px-3 py-2">
            <p className="break-all text-xs text-stone-300">{url}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
              {copied ? 'Copied' : 'Copy link'}
            </Button>

            <Button variant="secondary" size="sm" onClick={() => handleDownload('png')}>
              <Download className="h-4 w-4" />
              {downloadingFormat === 'png' ? 'Downloading...' : 'PNG'}
            </Button>

            <Button variant="secondary" size="sm" onClick={() => handleDownload('svg')}>
              <Download className="h-4 w-4" />
              {downloadingFormat === 'svg' ? 'Downloading...' : 'SVG'}
            </Button>

            <Button variant="secondary" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print
            </Button>

            <Button variant="ghost" size="sm" href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              {openLabel}
            </Button>
          </div>

          <p className="text-xs text-stone-500">
            SVG is best for print. PNG is better for chat, email, and digital sharing.
          </p>
        </div>
      </div>
    </div>
  )
}
