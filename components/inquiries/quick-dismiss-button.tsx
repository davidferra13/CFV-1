'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

export function QuickDismissButton({
  inquiryId,
  onDismiss,
}: {
  inquiryId: string
  onDismiss: (id: string) => Promise<{ success: boolean; error?: string }>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <span className="flex items-center gap-1 text-xs">
        <button
          className="text-red-400 hover:text-red-300 font-medium"
          disabled={isPending}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            startTransition(async () => {
              try {
                const result = await onDismiss(inquiryId)
                if (result.success) {
                  router.refresh()
                }
              } catch {
                // Non-fatal
              }
              setConfirming(false)
            })
          }}
        >
          {isPending ? 'Dismissing...' : 'Dismiss'}
        </button>
        <button
          className="text-stone-400 hover:text-stone-300"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setConfirming(false)
          }}
        >
          Cancel
        </button>
      </span>
    )
  }

  return (
    <button
      className="text-stone-500 hover:text-red-400 transition-colors p-1 rounded"
      title="Dismiss inquiry"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setConfirming(true)
      }}
    >
      <X className="h-4 w-4" />
    </button>
  )
}
