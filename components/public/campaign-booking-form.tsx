'use client'

// Campaign Booking Form — "Count Me In" style
// Intentionally minimal. The whole point is that clients should be able
// to say "that sounds fun" and commit in under 30 seconds.
// Name, email, guest count — that's it. Everything else follows.

import { useState } from 'react'
import { Minus, Plus, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { submitCampaignBooking } from '@/lib/campaigns/public-booking-actions'
import type { PublicDinnerInfo } from '@/lib/campaigns/public-booking-actions'

type Props = {
  token: string
  dinner: PublicDinnerInfo
}

type FormState = 'idle' | 'submitting' | 'success' | 'error'

export function CampaignBookingForm({ token, dinner }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [guests, setGuests] = useState(Math.max(dinner.guest_count_min ?? 2, 2))
  const [dietary, setDietary] = useState('')
  const [message, setMessage] = useState('')
  const [showMore, setShowMore] = useState(false)
  const [formState, setFormState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const min = dinner.guest_count_min ?? 1
  const max = dinner.guest_count_max ?? 20

  function adjustGuests(delta: number) {
    setGuests((g) => Math.min(max, Math.max(min, g + delta)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return

    setFormState('submitting')
    setErrorMsg('')

    const result = await submitCampaignBooking(token, {
      full_name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      guest_count: guests,
      dietary_restrictions: dietary.trim() || undefined,
      message: message.trim() || undefined,
    })

    if (result.success) {
      setFormState('success')
    } else {
      setErrorMsg(result.error)
      setFormState('error')
    }
  }

  if (formState === 'success') {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <Check className="w-7 h-7 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-stone-800">You're in!</h3>
          <p className="text-sm text-stone-500 mt-1">
            {dinner.chef_name} will reach out shortly to confirm your reservation.
          </p>
          <p className="text-xs text-stone-400 mt-3">
            Check your email — a confirmation is on its way to {email}.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Guest count — the most fun part */}
      <div>
        <label className="text-xs text-stone-500 font-medium uppercase tracking-wide block mb-2">
          How many guests?
        </label>
        <div className="flex items-center gap-4 justify-center">
          <button
            type="button"
            onClick={() => adjustGuests(-1)}
            disabled={guests <= min}
            className="w-10 h-10 rounded-full border border-stone-200 flex items-center justify-center text-stone-600 hover:border-stone-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-4xl font-bold text-stone-800 w-12 text-center tabular-nums">
            {guests}
          </span>
          <button
            type="button"
            onClick={() => adjustGuests(1)}
            disabled={guests >= max}
            className="w-10 h-10 rounded-full border border-stone-200 flex items-center justify-center text-stone-600 hover:border-stone-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-xs text-stone-400 mt-1.5">
          {min === max ? `${min} guests` : `${min}–${max} guests`}
        </p>
      </div>

      {/* Name */}
      <div>
        <label className="text-xs text-stone-500 font-medium uppercase tracking-wide block mb-1">
          Your name
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Smith"
          className="w-full border border-stone-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
        />
      </div>

      {/* Email */}
      <div>
        <label className="text-xs text-stone-500 font-medium uppercase tracking-wide block mb-1">
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@example.com"
          className="w-full border border-stone-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
        />
      </div>

      {/* Optional details (collapsed by default) */}
      {!showMore ? (
        <button
          type="button"
          onClick={() => setShowMore(true)}
          className="text-xs text-stone-400 hover:text-stone-600 underline underline-offset-2 transition-colors"
        >
          + Add dietary restrictions, phone number, or a note
        </button>
      ) : (
        <div className="space-y-3 border-t border-stone-100 pt-3">
          <div>
            <label className="text-xs text-stone-500 font-medium uppercase tracking-wide block mb-1">
              Phone (optional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
              className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs text-stone-500 font-medium uppercase tracking-wide block mb-1">
              Dietary restrictions (optional)
            </label>
            <input
              type="text"
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              placeholder="e.g. vegetarian, nut allergy..."
              className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs text-stone-500 font-medium uppercase tracking-wide block mb-1">
              Anything else? (optional)
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Questions, special requests, occasion notes..."
              className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-none"
            />
          </div>
        </div>
      )}

      {/* Error */}
      {formState === 'error' && errorMsg && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {errorMsg}
        </p>
      )}

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        disabled={formState === 'submitting' || !name.trim() || !email.trim()}
        className="w-full h-12 text-base gap-2"
      >
        {formState === 'submitting' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Reserving your spot...
          </>
        ) : (
          'Count me in'
        )}
      </Button>

      <p className="text-center text-xs text-stone-400">
        No payment now. {dinner.chef_name} will follow up to confirm details.
      </p>
    </form>
  )
}
