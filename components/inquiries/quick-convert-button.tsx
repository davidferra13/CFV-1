'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import { addClientFromInquiry } from '@/lib/clients/actions'
import { toast } from 'sonner'

/**
 * Quick "Convert to Client" button for the inquiry list.
 * Shown on lead rows (no client linked). One-click converts using
 * the inquiry's contact info, no form needed.
 */
export function QuickConvertButton({
  inquiryId,
  contactName,
  contactEmail,
  contactPhone,
}: {
  inquiryId: string
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)

  // Can't convert without at least a name and email
  if (!contactName || !contactEmail) return null

  if (confirming) {
    return (
      <span className="flex items-center gap-1 text-xs">
        <button
          className="text-emerald-400 hover:text-emerald-300 font-medium"
          disabled={isPending}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            startTransition(async () => {
              try {
                const result = await addClientFromInquiry({
                  full_name: contactName,
                  email: contactEmail,
                  phone: contactPhone ?? undefined,
                  inquiryId,
                })
                if (result.success) {
                  toast.success(`${contactName} added as client`)
                  router.refresh()
                } else {
                  toast.error(result.error)
                }
              } catch {
                toast.error('Failed to convert')
              }
              setConfirming(false)
            })
          }}
        >
          {isPending ? 'Converting...' : 'Convert'}
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
      className="text-stone-500 hover:text-emerald-400 transition-colors p-1 rounded"
      title="Save as client"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setConfirming(true)
      }}
    >
      <UserPlus className="h-4 w-4" />
    </button>
  )
}
