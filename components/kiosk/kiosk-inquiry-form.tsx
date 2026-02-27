'use client'

import { useState } from 'react'
import type { StaffPinSession } from '@/lib/devices/types'

interface KioskInquiryFormProps {
  token: string
  staffSession: StaffPinSession | null
  onSubmitted: () => void
}

export function KioskInquiryForm({ token, staffSession, onSubmitted }: KioskInquiryFormProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [partySize, setPartySize] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function resetForm() {
    setFullName('')
    setEmail('')
    setPhone('')
    setEventDate('')
    setPartySize('')
    setNotes('')
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!fullName.trim()) {
      setError('Name is required')
      return
    }
    if (!email.trim() && !phone.trim()) {
      setError('Email or phone number is required')
      return
    }
    if (!eventDate) {
      setError('Date is required')
      return
    }
    if (!partySize || parseInt(partySize) < 1) {
      setError('Party size is required')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/kiosk/inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          event_date: eventDate,
          party_size: parseInt(partySize),
          notes: notes.trim() || undefined,
          staff_member_id: staffSession?.staff_member_id,
          session_id: staffSession?.session_id,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Submission failed')
        setLoading(false)
        return
      }

      resetForm()
      onSubmitted()
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  // Get tomorrow's date as minimum for date picker
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-stone-100">Book a Private Chef</h2>
        <p className="mt-1 text-sm text-stone-400">
          Tell us about your event and we'll be in touch
        </p>
      </div>

      {error && <div className="rounded-lg bg-red-950 px-4 py-3 text-sm text-red-300">{error}</div>}

      {/* Name */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-stone-300">Your Name *</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Smith"
          className="w-full rounded-xl bg-stone-800 px-4 py-3.5 text-lg text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          autoComplete="name"
        />
      </div>

      {/* Email + Phone side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-300">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@email.com"
            className="w-full rounded-xl bg-stone-800 px-4 py-3.5 text-base text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-300">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="w-full rounded-xl bg-stone-800 px-4 py-3.5 text-base text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            autoComplete="tel"
          />
        </div>
      </div>
      <p className="text-xs text-stone-500">At least one contact method required</p>

      {/* Date + Party Size side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-300">Event Date *</label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            min={minDate}
            className="w-full rounded-xl bg-stone-800 px-4 py-3.5 text-base text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500 [color-scheme:dark]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-300">Party Size *</label>
          <input
            type="number"
            value={partySize}
            onChange={(e) => setPartySize(e.target.value)}
            placeholder="8"
            min={1}
            max={500}
            className="w-full rounded-xl bg-stone-800 px-4 py-3.5 text-base text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-stone-300">
          Notes <span className="text-stone-500">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Dietary restrictions, occasion details, preferences..."
          rows={3}
          maxLength={2000}
          className="w-full resize-none rounded-xl bg-stone-800 px-4 py-3.5 text-base text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-brand-500 py-4 text-lg font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Submitting...' : 'Submit Inquiry'}
      </button>
    </form>
  )
}
