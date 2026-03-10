'use client'

// Client Outreach Action Buttons
// Handles "Mark Contacted" and "Send Outreach" interactions.

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { markOutreachSent } from '@/lib/outreach/recurring-outreach-actions'
import { markReferralRequestSent } from '@/lib/outreach/referral-sequence-actions'
import { toast } from 'sonner'

type OutreachActionsProps = {
  clientId: string
  clientName: string
  type: 'outreach' | 'referral'
  eventId?: string
  suggestedMessage?: string
}

export function OutreachActions({
  clientId,
  clientName,
  type,
  eventId,
  suggestedMessage,
}: OutreachActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [marked, setMarked] = useState(false)

  function handleMarkContacted(method: 'email' | 'call') {
    const previousMarked = marked
    setMarked(true)

    startTransition(async () => {
      try {
        if (type === 'referral' && eventId) {
          await markReferralRequestSent(clientId, eventId)
        } else {
          await markOutreachSent(clientId, method)
        }
        toast.success(`Marked ${clientName} as contacted`)
      } catch (err) {
        setMarked(previousMarked)
        toast.error('Failed to record outreach')
      }
    })
  }

  if (marked) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-500">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Contacted
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="primary"
        size="sm"
        onClick={() => handleMarkContacted('email')}
        disabled={isPending}
      >
        {type === 'referral' ? 'Ask for Referral' : 'Send Outreach'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleMarkContacted('call')}
        disabled={isPending}
      >
        Mark Called
      </Button>
    </div>
  )
}
