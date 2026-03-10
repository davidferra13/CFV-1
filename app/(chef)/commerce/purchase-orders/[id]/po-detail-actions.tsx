'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { X } from '@/components/ui/icons'
import { cancelPurchaseOrder } from '@/lib/commerce/purchase-order-actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type Props = {
  poId: string
  status: string
}

export function PODetailActions({ poId, status }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const canCancel = ['draft', 'sent', 'acknowledged'].includes(status)

  if (!canCancel) return null

  function handleCancel() {
    if (!confirm('Cancel this purchase order?')) return

    startTransition(async () => {
      try {
        await cancelPurchaseOrder(poId)
        toast.success('Purchase order cancelled')
        router.push('/commerce/purchase-orders')
      } catch (err) {
        toast.error('Failed to cancel')
      }
    })
  }

  return (
    <Button variant="danger" size="sm" onClick={handleCancel} disabled={isPending}>
      <X className="h-4 w-4 mr-1" />
      Cancel PO
    </Button>
  )
}
