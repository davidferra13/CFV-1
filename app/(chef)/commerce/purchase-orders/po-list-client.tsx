'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from '@/components/ui/icons'
import { listVendors } from '@/lib/vendors/actions'
import { createPurchaseOrder } from '@/lib/commerce/purchase-order-actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function POListClient() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showPicker, setShowPicker] = useState(false)
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    if (showPicker) {
      listVendors(true)
        .then((v) => setVendors(v as any[]))
        .catch(() => {
          toast.error('Failed to load vendors')
        })
    }
  }, [showPicker])

  function handleCreatePO(vendorId: string) {
    startTransition(async () => {
      try {
        const po = await createPurchaseOrder(vendorId)
        setShowPicker(false)
        router.push(`/commerce/purchase-orders/${po.id}`)
      } catch (err) {
        toast.error('Failed to create purchase order')
      }
    })
  }

  if (showPicker) {
    return (
      <div className="relative">
        <div className="absolute right-0 top-0 z-10 w-64 rounded-lg border bg-background shadow-lg p-2 space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">Select vendor</p>
          {vendors.length === 0 && (
            <p className="text-sm text-muted-foreground px-2 py-2">
              No vendors found. Add vendors first.
            </p>
          )}
          {vendors.map((v) => (
            <button
              key={v.id}
              className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
              onClick={() => handleCreatePO(v.id)}
              disabled={isPending}
            >
              {v.name}
            </button>
          ))}
          <button
            className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowPicker(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <Button onClick={() => setShowPicker(true)}>
      <Plus className="h-4 w-4 mr-1" />
      New PO
    </Button>
  )
}
