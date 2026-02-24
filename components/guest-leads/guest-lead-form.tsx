'use client'

import { useState } from 'react'
import { submitGuestLead } from '@/lib/guest-leads/actions'

type Props = {
  guestCode: string
  chefName: string
  primaryColor: string
}

export function GuestLeadForm({ guestCode, chefName, primaryColor }: Props) {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await submitGuestLead({
        guestCode,
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        message: form.message || undefined,
      })
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div
          className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{ backgroundColor: primaryColor + '15' }}
        >
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke={primaryColor}
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-stone-100 mb-2">Thank you!</h2>
        <p className="text-stone-400 max-w-sm mx-auto">
          {chefName} will be in touch soon. Looking forward to cooking for you!
        </p>

        <div className="mt-8 pt-6 border-t border-stone-700 max-w-sm mx-auto">
          <p className="text-sm text-stone-500 mb-3">
            Want to browse menus, track events, and book directly?
          </p>
          <a
            href="/auth/client-signup"
            className="inline-block px-6 py-2.5 rounded-lg font-medium text-sm border transition-colors hover:opacity-90"
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            Create your free account
          </a>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-stone-900 rounded-2xl shadow-sm border border-stone-700 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-100">I'd love to host my own event</h2>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-stone-300 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-stone-600 focus:outline-none focus:ring-2 focus:border-transparent text-stone-100"
            style={{ '--tw-ring-color': primaryColor } as any}
            placeholder="Your full name"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-300 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-stone-600 focus:outline-none focus:ring-2 focus:border-transparent text-stone-100"
            style={{ '--tw-ring-color': primaryColor } as any}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-stone-300 mb-1">
            Phone <span className="text-stone-400 font-normal">(optional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-stone-600 focus:outline-none focus:ring-2 focus:border-transparent text-stone-100"
            style={{ '--tw-ring-color': primaryColor } as any}
            placeholder="(555) 123-4567"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-stone-300 mb-1">
            What kind of event are you thinking?{' '}
            <span className="text-stone-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="message"
            rows={3}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-stone-600 focus:outline-none focus:ring-2 focus:border-transparent text-stone-100 resize-none"
            style={{ '--tw-ring-color': primaryColor } as any}
            placeholder="Birthday dinner, date night, holiday party..."
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-950 rounded-lg px-3 py-2">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-lg font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
        >
          {submitting ? 'Submitting...' : 'Connect with ' + chefName}
        </button>
      </div>

      <p className="text-xs text-stone-400 text-center">
        Your information is only shared with {chefName} and will never be sold.
      </p>
    </form>
  )
}
