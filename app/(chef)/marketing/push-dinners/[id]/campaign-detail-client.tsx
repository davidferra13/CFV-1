'use client'

import { Copy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = { bookingUrl: string }

export function CampaignDetailClient({ bookingUrl }: Props) {
  function copyLink() {
    navigator.clipboard.writeText(bookingUrl).catch(() => {})
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Button variant="ghost" onClick={copyLink} className="h-8 w-8 p-0" title="Copy link">
        <Copy className="w-3.5 h-3.5" />
      </Button>
      <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
        <Button variant="ghost" className="h-8 w-8 p-0" title="Open booking page">
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>
      </a>
    </div>
  )
}
