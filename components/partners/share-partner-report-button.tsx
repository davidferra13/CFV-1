// Share Partner Report Button
// Generates a public share URL for the partner contribution report
// and copies it to the clipboard.
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { generatePartnerShareLink } from '@/lib/partners/actions'
import { Share2 } from 'lucide-react'

export function SharePartnerReportButton({ partnerId }: { partnerId: string }) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleShare() {
    setError(null)
    setIsPending(true)
    try {
      const { url } = await generatePartnerShareLink(partnerId)
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      setError('Could not generate link.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="relative">
      <Button variant="secondary" onClick={handleShare} disabled={isPending} loading={isPending}>
        <Share2 className="w-4 h-4 mr-1.5" />
        {copied ? 'Link Copied!' : 'Share with Partner'}
      </Button>
      {error && (
        <p className="absolute top-full mt-1 right-0 text-xs text-red-600 whitespace-nowrap">
          {error}
        </p>
      )}
    </div>
  )
}
