// TakeAChef Menu Creation Nudge
// Shown on confirmed TakeAChef inquiries that have a linked event but no menu yet.
// Encourages the chef to build the final menu (not the throwaway initial TakeAChef menu).
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface TacMenuNudgeProps {
  inquiryId: string
  eventId: string
  clientName: string | null
  hasMenu: boolean
}

export function TacMenuNudge({ inquiryId, eventId, clientName, hasMenu }: TacMenuNudgeProps) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const key = `tac-menu-nudge-dismissed-${inquiryId}`
    if (typeof window !== 'undefined' && localStorage.getItem(key) === '1') {
      setDismissed(true)
    }
  }, [inquiryId])

  // Don't show if menu already exists or dismissed
  if (hasMenu || dismissed) return null

  const displayName = clientName || 'this client'

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`tac-menu-nudge-dismissed-${inquiryId}`, '1')
    }
    setDismissed(true)
  }

  return (
    <Card className="p-4 border-green-400/30 bg-green-50/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <Badge variant="success" className="shrink-0 mt-0.5">
            Booked
          </Badge>
          <div>
            <p className="text-sm font-medium text-stone-800">
              Booking confirmed for {displayName}! Ready to build the final menu?
            </p>
            <p className="text-xs text-stone-500 mt-0.5">
              The initial TakeAChef menu was just a door-opener. Now create the real menu based on
              your conversation.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="text-stone-400 hover:text-stone-600 text-lg leading-none shrink-0"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
      <div className="flex gap-2 mt-3 ml-8">
        <Link href={`/events/${eventId}`}>
          <Button size="sm" variant="primary">
            Create Menu
          </Button>
        </Link>
        <Button size="sm" variant="ghost" onClick={handleDismiss}>
          I'll do it later
        </Button>
      </div>
    </Card>
  )
}
