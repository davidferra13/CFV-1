'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { deleteKitchenRental } from '@/lib/kitchen-rentals/actions'

export function DeleteKitchenRentalButton({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  function handleDelete() {
    setShowDeleteConfirm(true)
  }

  async function handleConfirmedDelete() {
    setShowDeleteConfirm(false)
    setBusy(true)
    try {
      await deleteKitchenRental(id)
      toast.success('Kitchen rental deleted')
      router.refresh()
    } catch {
      toast.error('Failed to delete rental')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-stone-400 hover:text-red-600 flex-shrink-0"
        onClick={handleDelete}
        disabled={busy}
      >
        {busy ? '…' : 'Delete'}
      </Button>
      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete this kitchen rental record?"
        description="This kitchen rental record will be permanently removed."
        confirmLabel="Delete"
        variant="danger"
        loading={busy}
        onConfirm={handleConfirmedDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  )
}
