'use client'

// iCal Subscription Card
// Shows the subscription URL and provides a copy-to-clipboard button.

import { useState } from 'react'
import { Check, Copy } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

interface IcalSubscriptionCardProps {
  url: string
}

export function IcalSubscriptionCard({ url }: IcalSubscriptionCardProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for non-secure contexts
      const input = document.querySelector<HTMLInputElement>('#ical-url-input')
      if (input) {
        input.select()
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          id="ical-url-input"
          type="text"
          readOnly
          value={url}
          title="iCal subscription URL"
          aria-label="iCal subscription URL"
          className="flex-1 rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
          onFocus={(e) => e.target.select()}
        />
        <Button variant="secondary" size="sm" onClick={handleCopy} className="shrink-0">
          {copied ? (
            <>
              <Check className="mr-1 h-4 w-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="mr-1 h-4 w-4" />
              Copy Link
            </>
          )}
        </Button>
      </div>
      <p className="text-xs text-stone-500">
        Paste this URL into Google Calendar, Apple Calendar, or Outlook as a subscription. Your
        blocked dates and confirmed events will sync automatically.
      </p>
    </div>
  )
}
