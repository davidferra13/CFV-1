'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Props = {
  eventId: string
  guestCode: string
  guestLeadCount: number
}

export function GuestCodePanel({ eventId, guestCode, guestLeadCount }: Props) {
  const [copied, setCopied] = useState(false)

  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
  const landingUrl = `${baseUrl}/g/${guestCode}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(landingUrl)}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(landingUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy guest link')
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-stone-100">Guest Pipeline</h3>
          <p className="text-sm text-stone-500 mt-0.5">
            Display this QR code at your event to capture guest interest
          </p>
        </div>
        {guestLeadCount > 0 && (
          <a
            href="/guest-leads"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
          >
            {guestLeadCount} lead{guestLeadCount !== 1 ? 's' : ''}
          </a>
        )}
      </div>

      <div className="flex items-center gap-5">
        {/* QR Code */}
        <div className="flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="Guest QR Code"
            width={120}
            height={120}
            className="rounded-lg border border-stone-700"
          />
        </div>

        {/* Actions */}
        <div className="flex-1 space-y-2">
          <Button variant="secondary" className="w-full text-sm" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>

          <Button
            variant="ghost"
            className="w-full text-sm"
            href={`/events/${eventId}/guest-card`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Print Table Card
          </Button>

          <a
            href={landingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-stone-400 hover:text-stone-400 truncate text-center"
          >
            {landingUrl}
          </a>
        </div>
      </div>
    </Card>
  )
}
