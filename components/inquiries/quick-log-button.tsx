'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createInquiry } from '@/lib/inquiries/actions'
import { toast } from 'sonner'

const CHANNEL_OPTIONS = [
  { value: 'phone', label: 'Phone call' },
  { value: 'text', label: 'Text message' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'referral', label: 'Referral' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'email', label: 'Email' },
  { value: 'other', label: 'Other' },
] as const

type Channel = (typeof CHANNEL_OPTIONS)[number]['value']

export function QuickLogButton() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [channel, setChannel] = useState<Channel>('phone')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const nameRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Auto-focus name when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => nameRef.current?.focus(), 50)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function handleClose() {
    setOpen(false)
    setName('')
    setPhone('')
    setEmail('')
    setChannel('phone')
    setNote('')
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    const trimmedPhone = phone.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName) {
      setError('Name is required.')
      return
    }
    if (!trimmedPhone && !trimmedEmail) {
      setError('Add a phone number or email so you can follow up.')
      return
    }

    startTransition(async () => {
      try {
        const result = await createInquiry({
          channel,
          client_name: trimmedName,
          client_phone: trimmedPhone || undefined,
          client_email: trimmedEmail || undefined,
          notes: note.trim() || undefined,
        })

        if (!result.success) {
          setError(result.error || 'Could not save inquiry. Try again.')
          return
        }

        const inquiryId = result.inquiry?.id
        toast.success(`${trimmedName} logged.`, {
          description: 'Inquiry added to your pipeline.',
          action: inquiryId
            ? {
                label: 'Open',
                onClick: () => router.push(`/inquiries/${inquiryId}`),
              }
            : undefined,
        })

        handleClose()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm font-medium text-stone-200 transition-colors hover:bg-stone-700 hover:text-white"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Quick Log
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose()
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-stone-900 border border-stone-700 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h2 className="text-base font-semibold text-stone-100">Log a lead</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Fill in details later from the inquiry.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={handleClose}
                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-800 hover:text-stone-200 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3">
              {/* Channel */}
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  How they reached out
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CHANNEL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setChannel(opt.value)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        channel === opt.value
                          ? 'bg-brand-600 text-white'
                          : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label htmlFor="ql-name" className="block text-xs font-medium text-stone-400 mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  ref={nameRef}
                  id="ql-name"
                  type="text"
                  required
                  placeholder="First and last name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="ql-phone"
                    className="block text-xs font-medium text-stone-400 mb-1"
                  >
                    Phone
                  </label>
                  <input
                    id="ql-phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ql-email"
                    className="block text-xs font-medium text-stone-400 mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="ql-email"
                    type="email"
                    placeholder="their@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label htmlFor="ql-note" className="block text-xs font-medium text-stone-400 mb-1">
                  Quick note <span className="text-stone-600">(optional)</span>
                </label>
                <textarea
                  id="ql-note"
                  rows={2}
                  placeholder="Dinner party for 10, checking May dates..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                />
              </div>

              {/* Error */}
              {error && (
                <p className="rounded-lg bg-red-950/50 border border-red-800/40 px-3 py-2 text-xs text-red-300">
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isPending ? 'Saving...' : 'Save to pipeline'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
