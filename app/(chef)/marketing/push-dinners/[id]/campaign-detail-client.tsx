'use client'

import { Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type Props = { bookingUrl: string }

export function CampaignDetailClient({ bookingUrl }: Props) {
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(bookingUrl)
      toast.success('Booking link copied')
    } catch {
      toast.error('Could not copy booking link')
    }
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Button
        variant="ghost"
        onClick={copyLink}
        className="h-8 w-8 p-0"
        title="Copy link"
        aria-label="Copy booking link"
      >
        <Copy className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        className="h-8 w-8 p-0"
        title="Open booking page"
        aria-label="Open booking page"
        href={bookingUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}
