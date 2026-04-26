'use client'

import { useState } from 'react'
import { generateSplitShareToken } from '@/lib/payments/split-share-actions'
import { Button } from '@/components/ui/button'

export function ShareSplitButton({ eventId }: { eventId: string }) {
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await generateSplitShareToken(eventId)
      const baseUrl = window.location.origin
      const url = `${baseUrl}/split/${token}`
      setShareUrl(url)

      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      setError('Failed to generate link')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  if (shareUrl) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-stone-400 break-all">{shareUrl}</p>
        <Button variant="secondary" size="sm" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy Link'}
        </Button>
      </div>
    )
  }

  return (
    <div>
      <Button variant="secondary" size="sm" onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generating...' : 'Share Group Split'}
      </Button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
