'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { bulkConvertToClients } from '@/lib/inquiries/actions'
import { toast } from 'sonner'

/**
 * Floating action bar that appears when inquiries are selected.
 * Shows count + "Convert to Clients" button.
 */
export function BulkConvertBar({
  selectedIds,
  onClear,
}: {
  selectedIds: string[]
  onClear: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (selectedIds.length === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-stone-800 border border-stone-600 rounded-xl px-5 py-3 shadow-2xl">
      <span className="text-sm text-stone-300 font-medium">{selectedIds.length} selected</span>
      <Button
        variant="primary"
        size="sm"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            try {
              const result = await bulkConvertToClients(selectedIds)
              if (result.converted > 0) {
                toast.success(`Converted ${result.converted} to clients`)
              }
              if (result.skipped > 0) {
                toast.info(`${result.skipped} skipped (already linked or no email)`)
              }
              if (result.errors.length > 0) {
                toast.error(`${result.errors.length} failed`)
              }
              onClear()
              router.refresh()
            } catch {
              toast.error('Bulk convert failed')
            }
          })
        }}
      >
        {isPending ? 'Converting...' : 'Convert to Clients'}
      </Button>
      <Button variant="ghost" size="sm" onClick={onClear} disabled={isPending}>
        Clear
      </Button>
    </div>
  )
}
