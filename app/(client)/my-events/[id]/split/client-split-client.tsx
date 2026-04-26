'use client'

import { useState } from 'react'
import { generateClientSplitShareToken } from '@/lib/payments/split-share-actions'
import { SplitBreakdownView } from '@/components/payments/split-breakdown-view'
import type { SplitPublicData } from '@/lib/payments/split-share-actions'

export function ClientSplitPageClient({
  data,
  eventId,
}: {
  data: SplitPublicData
  eventId: string
}) {
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleShare = async () => {
    setLoading(true)
    try {
      const token = await generateClientSplitShareToken(eventId)
      const baseUrl = window.location.origin
      const url = `${baseUrl}/split/${token}`
      setShareUrl(url)

      // Try native share first (mobile)
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Split: ${data.eventName}`,
            text: `Here's the cost breakdown for ${data.eventName}. Each person owes their share.`,
            url,
          })
          return
        } catch {
          // User cancelled or not supported; fall through to copy
        }
      }

      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      console.error('Failed to generate share link', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <SplitBreakdownView data={data} showShareButton onShare={handleShare} />
      {shareUrl && (
        <div className="text-center">
          <p className="text-xs text-stone-400 break-all">
            {copied ? 'Link copied to clipboard!' : shareUrl}
          </p>
        </div>
      )}
      {loading && <p className="text-center text-xs text-stone-500">Generating link...</p>}
    </div>
  )
}
