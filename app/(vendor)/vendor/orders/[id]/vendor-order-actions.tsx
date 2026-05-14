'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrderStatus } from '@/lib/vendors/order-actions'
import { Button } from '@/components/ui/button'

const VALID_TRANSITIONS: Record<string, { label: string; target: string }[]> = {
  sent: [{ label: 'Acknowledge', target: 'acknowledged' }],
  acknowledged: [
    { label: 'Mark Partially Received', target: 'partially_received' },
    { label: 'Mark Received', target: 'received' },
  ],
  partially_received: [{ label: 'Mark Received', target: 'received' }],
}

export function VendorOrderActions({
  orderId,
  currentStatus,
}: {
  orderId: string
  currentStatus: string
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const actions = VALID_TRANSITIONS[currentStatus]

  if (!actions || actions.length === 0) return null

  const handleAction = (target: string) => {
    startTransition(async () => {
      try {
        const result = await updateOrderStatus(orderId, target)
        if (result.success) {
          router.refresh()
        } else {
          console.error('[order-action]', result.error)
        }
      } catch (error) {
        console.error('[order-action]', error)
      }
    })
  }

  return (
    <div className="flex gap-2">
      {actions.map(({ label, target }) => (
        <Button
          key={target}
          onClick={() => handleAction(target)}
          disabled={isPending}
          variant="outline"
          className="border-stone-600 text-stone-200 hover:bg-stone-700"
        >
          {isPending ? 'Updating...' : label}
        </Button>
      ))}
    </div>
  )
}
