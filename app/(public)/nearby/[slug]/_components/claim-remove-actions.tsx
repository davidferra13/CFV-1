'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { requestListingClaim, requestListingRemoval } from '@/lib/discover/actions'

type Props = {
  listingId: string
  status: string
  enhancePath?: string
}

export function ClaimRemoveActions({ listingId, status, enhancePath }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'idle' | 'claim' | 'remove'>('idle')
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')

  const isClaimed = status === 'claimed' || status === 'verified'

  function handleClaimSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        const result = await requestListingClaim({
          listingId,
          name: name.trim(),
          email: email.trim(),
        })
        if (result.success) {
          toast.success(
            enhancePath
              ? 'Claim submitted. Redirecting you to complete your profile.'
              : 'Claim submitted! We will verify your ownership shortly.'
          )
          if (enhancePath) {
            router.push(enhancePath)
            return
          }
          setMode('idle')
        } else {
          toast.error(result.error || 'Failed to submit claim.')
        }
      } catch {
        toast.error('Something went wrong.')
      }
    })
  }

  function handleRemoveSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        const result = await requestListingRemoval({
          listingId,
          reason: reason.trim(),
          email: email.trim(),
        })
        if (result.success) {
          toast.success('Removal request submitted. We will process it within 48 hours.')
          setMode('idle')
        } else {
          toast.error(result.error || 'Failed to submit removal request.')
        }
      } catch {
        toast.error('Something went wrong.')
      }
    })
  }

  if (mode === 'idle') {
    return (
      <div className="space-y-2">
        {!isClaimed && (
          <button
            onClick={() => setMode('claim')}
            className="w-full rounded-lg border border-brand-600/50 bg-brand-950/30 px-4 py-2.5 text-xs font-semibold text-brand-300 transition-colors hover:bg-brand-950/50"
          >
            Is this your business? Claim it
          </button>
        )}
        <button
          onClick={() => setMode('remove')}
          className="w-full rounded-lg border border-stone-700 px-4 py-2 text-xs text-stone-500 transition-colors hover:border-stone-600 hover:text-stone-300"
        >
          Request removal
        </button>
      </div>
    )
  }

  if (mode === 'claim') {
    return (
      <div className="rounded-xl border border-stone-700 bg-stone-900/50 p-4">
        <h3 className="text-sm font-semibold text-stone-200">Claim this listing</h3>
        <p className="mt-1 text-xs-tight text-stone-500">
          Provide your details and we will verify your ownership.
        </p>
        <form onSubmit={handleClaimSubmit} className="mt-3 space-y-2">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-8 w-full rounded-md border border-stone-700 bg-stone-800 px-3 text-xs text-stone-100 focus:border-brand-500 focus:outline-none"
          />
          <input
            type="email"
            placeholder="Business email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-8 w-full rounded-md border border-stone-700 bg-stone-800 px-3 text-xs text-stone-100 focus:border-brand-500 focus:outline-none"
          />
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {isPending ? 'Submitting...' : 'Submit claim'}
            </button>
            <button
              type="button"
              onClick={() => setMode('idle')}
              className="rounded-md border border-stone-700 px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    )
  }

  // mode === 'remove'
  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900/50 p-4">
      <h3 className="text-sm font-semibold text-stone-200">Request removal</h3>
      <p className="mt-1 text-xs-tight text-stone-500">
        We will process removal requests within 48 hours. No questions asked.
      </p>
      <form onSubmit={handleRemoveSubmit} className="mt-3 space-y-2">
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-8 w-full rounded-md border border-stone-700 bg-stone-800 px-3 text-xs text-stone-100 focus:border-brand-500 focus:outline-none"
        />
        <textarea
          placeholder="Reason for removal (optional but helpful)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          rows={2}
          className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-xs text-stone-100 focus:border-brand-500 focus:outline-none resize-none"
        />
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Submitting...' : 'Request removal'}
          </button>
          <button
            type="button"
            onClick={() => setMode('idle')}
            className="rounded-md border border-stone-700 px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
