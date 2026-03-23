// CallStatusActions - confirm / cancel buttons for an active call

'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateCallStatus, type ScheduledCall } from '@/lib/calls/actions'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function CallStatusActions({ call }: { call: ScheduledCall }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function transition(status: 'confirmed' | 'cancelled') {
    startTransition(async () => {
      try {
        await updateCallStatus(call.id, status)
        router.refresh()
      } catch (err) {
        console.error(err)
        toast.error('Failed to update call status')
      }
    })
  }

  if (call.status === 'scheduled') {
    return (
      <div className="flex gap-3 pt-2 flex-wrap">
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => transition('confirmed')}
          className="border-green-300 text-green-700 hover:bg-green-950"
        >
          Mark confirmed
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => transition('cancelled')}
          className="border-red-200 text-red-500 hover:bg-red-950"
        >
          Cancel call
        </Button>
      </div>
    )
  }

  if (call.status === 'confirmed') {
    return (
      <div className="flex gap-3 pt-2 flex-wrap">
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => transition('cancelled')}
          className="border-red-200 text-red-500 hover:bg-red-950"
        >
          Cancel call
        </Button>
      </div>
    )
  }

  return null
}
