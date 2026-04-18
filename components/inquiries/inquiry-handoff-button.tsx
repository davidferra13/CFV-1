'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getHandoffDataFromInquiry } from '@/lib/network/collab-actions'
import { toast } from 'sonner'

export function InquiryHandoffButton({ inquiryId }: { inquiryId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleHandoff() {
    startTransition(async () => {
      try {
        const data = await getHandoffDataFromInquiry(inquiryId)
        if (!data) {
          toast.error('Could not load inquiry data for handoff')
          return
        }
        // Encode handoff data as query params for the network handoff form
        const params = new URLSearchParams()
        params.set('source', 'inquiry')
        params.set('sourceId', inquiryId)
        if (data.title) params.set('title', data.title)
        if (data.occasion) params.set('occasion', data.occasion)
        if (data.eventDate) params.set('eventDate', data.eventDate)
        if (data.guestCount) params.set('guestCount', String(data.guestCount))
        if (data.locationText) params.set('location', data.locationText)
        if (data.budgetCents) params.set('budget', String(data.budgetCents))
        if (data.clientContext) params.set('context', JSON.stringify(data.clientContext))

        router.push(`/network?tab=handoffs&action=create&${params.toString()}`)
      } catch (err) {
        toast.error('Failed to prepare handoff')
      }
    })
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleHandoff} disabled={isPending}>
      {isPending ? 'Loading...' : 'Hand Off This Lead'}
    </Button>
  )
}
