'use client'

import { useState, useTransition } from 'react'
import { claimInquiryForFounder } from '@/lib/admin/inquiry-admin-actions'
import { useRouter } from 'next/navigation'

export function ClaimButton({ inquiryId, isLocal }: { inquiryId: string; isLocal: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [claimed, setClaimed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleClaim() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await claimInquiryForFounder({ inquiryId })
        if (result.success) {
          setClaimed(true)
          router.refresh()
        } else {
          setError(result.error || 'Failed to claim')
        }
      } catch (err) {
        setError('Claim failed. Try again.')
      }
    })
  }

  if (claimed) {
    return <span className="text-xs text-green-400 font-medium">Claimed</span>
  }

  return (
    <div>
      <button
        onClick={handleClaim}
        disabled={isPending}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
          isLocal
            ? 'bg-orange-900/50 text-orange-300 hover:bg-orange-800/60'
            : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
        }`}
      >
        {isPending ? 'Claiming...' : 'Claim'}
      </button>
      {error && <p className="mt-1 text-[10px] text-red-400">{error}</p>}
    </div>
  )
}
