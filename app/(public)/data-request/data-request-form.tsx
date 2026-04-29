'use client'

import { useState, useTransition } from 'react'
import { submitContactForm } from '@/lib/contact/actions'
import {
  PRIVACY_DATA_REQUEST_SOURCE_CTA,
  PRIVACY_DATA_REQUEST_SOURCE_PAGE,
} from '@/lib/contact/operator-evaluation'

const REQUEST_TYPES = [
  { value: 'deletion', label: 'Delete my data' },
  { value: 'access', label: 'Access a copy of my data' },
  { value: 'correction', label: 'Correct my data' },
  { value: 'portability', label: 'Export my data in a portable format' },
  { value: 'objection', label: 'Object to processing of my data' },
]

export function DataRequestForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [requestType, setRequestType] = useState('deletion')
  const [details, setDetails] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationText, setConfirmationText] = useState(
    'We will respond to your request within 30 days.'
  )
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const typeLabel = REQUEST_TYPES.find((t) => t.value === requestType)?.label ?? requestType

    startTransition(async () => {
      try {
        const requestDetails = details.trim()
        const result = await submitContactForm({
          name: name.trim(),
          email: email.trim(),
          subject: `Data Request: ${typeLabel}`,
          message: [
            `Request type: ${typeLabel}`,
            requestDetails || 'No additional details provided.',
          ].join('\n\n'),
          sourcePage: PRIVACY_DATA_REQUEST_SOURCE_PAGE,
          sourceCta: PRIVACY_DATA_REQUEST_SOURCE_CTA,
          website,
        })
        setConfirmationText(
          result.acknowledgmentSent
            ? 'We will respond to your request within 30 days. Check your inbox for a confirmation.'
            : 'We will respond to your request within 30 days.'
        )
        setDone(true)
      } catch {
        setError('Something went wrong. Please try again or email privacy@cheflowhq.com.')
      }
    })
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/20 p-6 text-center">
        <p className="text-emerald-400 font-medium">Request received</p>
        <p className="text-stone-400 text-sm mt-2">{confirmationText}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
      />

      <div>
        <label htmlFor="dr-name" className="block text-sm font-medium text-stone-300 mb-1">
          Full name
        </label>
        <input
          id="dr-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      <div>
        <label htmlFor="dr-email" className="block text-sm font-medium text-stone-300 mb-1">
          Email address
        </label>
        <input
          id="dr-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="The email address associated with your data"
          className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      <div>
        <label htmlFor="dr-type" className="block text-sm font-medium text-stone-300 mb-1">
          Request type
        </label>
        <select
          id="dr-type"
          value={requestType}
          onChange={(e) => setRequestType(e.target.value)}
          className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          {REQUEST_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="dr-details" className="block text-sm font-medium text-stone-300 mb-1">
          Additional details (optional)
        </label>
        <textarea
          id="dr-details"
          rows={4}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Any specific information to help us process your request..."
          className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 px-4 py-2.5 text-sm font-medium text-white transition-colors"
      >
        {isPending ? 'Submitting...' : 'Submit Request'}
      </button>
    </form>
  )
}
