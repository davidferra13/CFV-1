'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Guest = {
  full_name: string
  rsvp_status: string
  email: string | null
}

type Props = {
  guests: Guest[]
  totalExpected: number
  shareUrl: string | null
  occasion: string | null
}

export function RSVPTrackerPanel({ guests, totalExpected, shareUrl, occasion }: Props) {
  const [copied, setCopied] = useState(false)

  const attending = guests.filter((g) => g.rsvp_status === 'attending')
  const maybe = guests.filter((g) => g.rsvp_status === 'maybe')
  const declined = guests.filter((g) => g.rsvp_status === 'declined')
  const responded = guests.length
  const notResponded = Math.max(0, totalExpected - responded)

  // Generate a nudge message for the host to send
  function generateNudge() {
    const lines = [
      `Hey! Quick reminder about ${occasion || 'our upcoming dinner'}.`,
      ``,
      `${responded} of ${totalExpected} guests have RSVPed so far${attending.length > 0 ? ` (${attending.length} attending!)` : ''}.`,
      ``,
      notResponded > 0
        ? `We still need ${notResponded} more response${notResponded !== 1 ? 's' : ''} so the chef can finalize the menu.`
        : `Everyone has responded!`,
      ``,
      shareUrl ? `RSVP here if you haven't yet: ${shareUrl}` : '',
      ``,
      `Takes 10 seconds. Thank you!`,
    ]
      .filter(Boolean)
      .join('\n')

    navigator.clipboard.writeText(lines)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-stone-900 mb-3">RSVP Tracker</h3>

      {/* Status bars */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-600">{attending.length}</p>
          <p className="text-xs text-stone-500">Attending</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-amber-600">{maybe.length}</p>
          <p className="text-xs text-stone-500">Maybe</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-500">{declined.length}</p>
          <p className="text-xs text-stone-500">Declined</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-stone-400">{notResponded}</p>
          <p className="text-xs text-stone-500">No reply</p>
        </div>
      </div>

      {/* Progress */}
      <div className="w-full bg-stone-200 rounded-full h-2 mb-3">
        <div
          className="h-2 rounded-full bg-emerald-500 transition-all"
          style={{ width: `${totalExpected > 0 ? (responded / totalExpected) * 100 : 0}%` }}
        />
      </div>
      <p className="text-xs text-stone-500 mb-4">
        {responded}/{totalExpected} responded (
        {totalExpected > 0 ? Math.round((responded / totalExpected) * 100) : 0}%)
      </p>

      {/* Nudge button */}
      {notResponded > 0 && shareUrl && (
        <Button variant="secondary" className="w-full text-sm" onClick={generateNudge}>
          {copied
            ? 'Copied reminder to clipboard!'
            : `Copy RSVP Reminder for Host (${notResponded} pending)`}
        </Button>
      )}
    </Card>
  )
}
