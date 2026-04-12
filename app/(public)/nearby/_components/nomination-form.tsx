'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { submitNomination } from '@/lib/discover/actions'
import { BUSINESS_TYPES } from '@/lib/discover/constants'

export function NominationForm() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('restaurant')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [nominatorEmail, setNominatorEmail] = useState('')
  const [reason, setReason] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    startTransition(async () => {
      try {
        const result = await submitNomination({
          businessName,
          businessType,
          city: city || undefined,
          state: state || undefined,
          websiteUrl: websiteUrl || undefined,
          nominatorEmail: nominatorEmail || undefined,
          reason: reason || undefined,
        })

        if (result.success) {
          toast.success('Nomination submitted! We will review it shortly.')
          setBusinessName('')
          setCity('')
          setState('')
          setWebsiteUrl('')
          setNominatorEmail('')
          setReason('')
          setOpen(false)
        } else {
          toast.error(result.error || 'Failed to submit nomination.')
        }
      } catch {
        toast.error('Something went wrong. Please try again.')
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-stone-600 px-5 py-2.5 text-sm font-medium text-stone-300 transition-colors hover:border-brand-600 hover:text-stone-100"
      >
        Know a great spot? Tell us about it
      </button>
    )
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-stone-700 bg-stone-900 p-6">
      <h3 className="text-base font-semibold text-stone-100">Nominate a business</h3>
      <p className="mt-1 text-xs text-stone-500">
        Know a restaurant, chef, or food business that should be listed? Tell us about them.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-stone-300 mb-1">Business name *</label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            className="h-9 w-full rounded-lg border border-stone-700 bg-stone-800 px-3 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">Type</label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="h-9 w-full rounded-lg border border-stone-700 bg-stone-800 px-3 text-sm text-stone-300 focus:border-brand-500 focus:outline-none"
            >
              {BUSINESS_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-9 w-full rounded-lg border border-stone-700 bg-stone-800 px-3 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-300 mb-1">Website URL</label>
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://..."
            className="h-9 w-full rounded-lg border border-stone-700 bg-stone-800 px-3 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-300 mb-1">
            Your email (optional)
          </label>
          <input
            type="email"
            value={nominatorEmail}
            onChange={(e) => setNominatorEmail(e.target.value)}
            className="h-9 w-full rounded-lg border border-stone-700 bg-stone-800 px-3 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-300 mb-1">
            Why should they be listed?
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none resize-none"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={isPending || !businessName.trim()}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {isPending ? 'Submitting...' : 'Submit nomination'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-stone-700 px-4 py-2 text-sm text-stone-400 transition-colors hover:text-stone-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
