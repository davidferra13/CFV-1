'use client'

// Archive a client from the client detail page. Low emphasis on purpose: it sits
// at the bottom of the page and always asks first.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { archiveClientFromUi } from '@/lib/clients/archive-actions'

export function ArchiveClientButton({
  clientId,
  clientName,
}: {
  clientId: string
  clientName: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [refusal, setRefusal] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await archiveClientFromUi(clientId)
      if (!result.ok) {
        setRefusal(result.reason)
        return
      }
      setOpen(false)
      toast.success(`${clientName} archived`)
      router.push('/clients')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2 border-t border-stone-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-stone-500">
        No longer working with this client? Archive them to take them off your list.
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-h-11 self-start sm:self-auto"
        onClick={() => {
          setRefusal(null)
          setOpen(true)
        }}
        data-testid="archive-client"
      >
        Archive client
      </Button>

      <ConfirmModal
        open={open}
        title={`Archive ${clientName}?`}
        description="They leave your client list, and any pending follow-ups or scheduled messages to them are cancelled. Their events and history are kept. You can restore them from the bottom of the Clients page."
        confirmLabel="Archive"
        variant="danger"
        loading={pending}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      >
        {refusal && (
          <p
            role="alert"
            className="rounded-lg border border-amber-700/50 bg-amber-950/40 p-3 text-sm text-amber-200"
          >
            {refusal}
          </p>
        )}
      </ConfirmModal>
    </div>
  )
}
