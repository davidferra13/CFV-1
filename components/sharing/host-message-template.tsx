'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type Props = {
  shareUrl: string
  occasion: string | null
  eventDate: string | null
  chefName: string
}

export function HostMessageTemplate({ shareUrl, occasion, eventDate, chefName }: Props) {
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const dateLabel = eventDate
    ? new Date(eventDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : null

  const message = [
    `Hey everyone! 🎉`,
    ``,
    occasion && dateLabel
      ? `You're invited to ${occasion} on ${dateLabel}!`
      : occasion
        ? `You're invited to ${occasion}!`
        : dateLabel
          ? `You're invited to a private dinner on ${dateLabel}!`
          : `You're invited to a private dinner!`,
    ``,
    `We have an amazing private chef (${chefName}) cooking for us. Please take 30 seconds to RSVP and add any allergies or dietary restrictions so the chef can plan the perfect menu for everyone.`,
    ``,
    `RSVP here: ${shareUrl}`,
    ``,
    `Can't wait to see you there!`,
  ].join('\n')

  function handleCopy() {
    navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-4 pt-4 border-t border-stone-100">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-stone-700">Message for Host</h4>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="text-xs text-stone-500 hover:text-stone-700"
        >
          {showPreview ? 'Hide' : 'Preview'}
        </button>
      </div>
      <p className="text-xs text-stone-500 mb-3">
        Copy this message and send it to your client. They drop it in the group chat — done.
      </p>

      {showPreview && (
        <pre className="text-sm text-stone-700 bg-stone-50 rounded-lg p-4 mb-3 whitespace-pre-wrap font-sans leading-relaxed">
          {message}
        </pre>
      )}

      <Button variant="secondary" className="w-full text-sm" onClick={handleCopy}>
        {copied ? 'Copied to clipboard!' : 'Copy Group Chat Message'}
      </Button>
    </div>
  )
}
