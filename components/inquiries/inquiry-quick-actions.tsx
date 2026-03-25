'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { transitionInquiry } from '@/lib/inquiries/actions'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Props {
  inquiryId: string
  status: string
  clientName: string
}

/**
 * Quick-action buttons rendered directly on inquiry list cards.
 * Lets the chef transition status without opening the detail page.
 * Uses stopPropagation to prevent the parent <Link> from navigating.
 */
export function InquiryQuickActions({ inquiryId, status, clientName }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleTransition = (e: React.MouseEvent, newStatus: string, successMsg: string) => {
    e.preventDefault()
    e.stopPropagation()

    startTransition(async () => {
      try {
        await transitionInquiry(inquiryId, newStatus as any)
        toast.success(successMsg)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update inquiry')
      }
    })
  }

  // Only show quick actions for statuses that need chef action
  if (status === 'new' || status === 'awaiting_chef') {
    return (
      <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
        <Button
          size="sm"
          variant="primary"
          disabled={isPending}
          onClick={(e) =>
            handleTransition(e, 'awaiting_client', `Marked "${clientName}" as responded`)
          }
        >
          {isPending ? 'Updating...' : 'Mark Responded'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={(e) => handleTransition(e, 'declined', `Declined "${clientName}"`)}
        >
          Decline
        </Button>
      </div>
    )
  }

  return null
}
