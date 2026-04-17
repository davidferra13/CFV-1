'use client'

import { useState, useTransition } from 'react'
import { purchaseTicket, type PublicEventInfo } from '@/lib/tickets/purchase-actions'
import type { EventTicketType } from '@/lib/tickets/types'

interface Props {
  event: PublicEventInfo
  shareToken: string
  justPurchased: boolean
  purchaseCancelled: boolean
  ticketId?: string
}

export function PublicEventView({ event, shareToken, justPurchased, purchaseCancelled }: Props) {
  const [selectedType, setSelectedType] = useState<EventTicketType | null>(
    event.ticketTypes.length === 1 ? event.ticketTypes[0] : null
  )
  const [quantity, setQuantity] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [dietary, setDietary] = useState('')
  const [allergies, setAllergies] = useState('')
  const [notes, setNotes] = useState('')

  const handlePurchase = () => {
    if (!selectedType) return
    setError(null)

    startTransition(async () => {
      try {
        const result = await purchaseTicket({
          shareToken,
          ticketTypeId: selectedType.id,
          quantity,
          buyerName: name.trim(),
          buyerEmail: email.trim(),
          buyerPhone: phone.trim() || undefined,
          dietaryRestrictions: dietary
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          allergies: allergies
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          notes: notes.trim() || undefined,
        })
        // Redirect to Stripe Checkout
        window.location.href = result.checkoutUrl
      } catch (err: any) {
        setError(err.message || 'Something went wrong')
      }
    })
  }

  const totalCapacity = event.ticketTypes.reduce(
    (sum, tt) => sum + (tt.capacity ?? event.guestCount ?? 0),
    0
  )
  const totalSold = event.ticketTypes.reduce((sum, tt) => sum + tt.sold_count, 0)
  const totalRemaining = totalCapacity - totalSold

  if (justPurchased) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-6xl">🎉</div>
          <h1 className="text-2xl font-bold text-white">You're In!</h1>
          <p className="text-stone-400">
            Your ticket for <span className="text-white font-semibold">{event.eventName}</span> is
            confirmed. Check your email for details.
          </p>
          {event.eventDate && (
            <p className="text-stone-500 text-sm">
              See you on{' '}
              {new Date(event.eventDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      {purchaseCancelled && (
        <div className="bg-amber-900/50 border-b border-amber-700 px-4 py-3 text-center text-sm text-amber-200">
          Purchase cancelled. You can try again below.
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        {/* Event Header */}
        <div className="space-y-4">
          {event.chefImageUrl && (
            <img
              src={event.chefImageUrl}
              alt={event.chefName || 'Chef'}
              className="w-16 h-16 rounded-full object-cover border-2 border-stone-700"
            />
          )}
          <h1 className="text-3xl font-bold">{event.eventName}</h1>

          <div className="flex flex-wrap gap-4 text-sm text-stone-400">
            {event.eventDate && (
              <span>
                📅{' '}
                {new Date(event.eventDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
                {event.serveTime ? ` at ${event.serveTime}` : ''}
              </span>
            )}
            {event.locationText && <span>📍 {event.locationText}</span>}
            {event.chefName && <span>👨‍🍳 {event.chefName}</span>}
          </div>
        </div>

        {/* Menu Preview */}
        {event.menuSummary && (
          <div className="rounded-xl border border-stone-700 bg-stone-900/50 p-5">
            <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-2">
              Menu
            </h2>
            <p className="text-stone-300 whitespace-pre-line">{event.menuSummary}</p>
          </div>
        )}

        {/* Ticket Types */}
        {event.ticketsEnabled && event.ticketTypes.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Get Tickets</h2>

            {/* Capacity indicator */}
            {totalRemaining <= 10 && totalRemaining > 0 && (
              <p className="text-amber-400 text-sm font-medium">
                Only {totalRemaining} spot{totalRemaining !== 1 ? 's' : ''} left
              </p>
            )}

            <div className="space-y-3">
              {event.ticketTypes.map((tt) => {
                const soldOut = tt.remaining != null && tt.remaining <= 0
                const isSelected = selectedType?.id === tt.id

                return (
                  <button
                    key={tt.id}
                    onClick={() => {
                      if (!soldOut) {
                        setSelectedType(tt)
                        setShowForm(true)
                      }
                    }}
                    disabled={soldOut}
                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                      isSelected
                        ? 'border-[#e88f47] bg-[#e88f47]/10'
                        : soldOut
                          ? 'border-stone-800 bg-stone-900/30 opacity-50 cursor-not-allowed'
                          : 'border-stone-700 bg-stone-900/50 hover:border-stone-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{tt.name}</h3>
                        {tt.description && (
                          <p className="text-sm text-stone-400 mt-1">{tt.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold">
                          ${(tt.price_cents / 100).toFixed(tt.price_cents % 100 === 0 ? 0 : 2)}
                        </span>
                        {soldOut ? (
                          <p className="text-xs text-red-400 mt-1">Sold Out</p>
                        ) : tt.remaining !== null ? (
                          <p className="text-xs text-stone-500 mt-1">{tt.remaining} left</p>
                        ) : null}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Purchase Form */}
            {showForm && selectedType && (
              <div className="rounded-xl border border-stone-700 bg-stone-900/50 p-5 space-y-4 mt-4">
                <h3 className="font-semibold">
                  {selectedType.name} - $
                  {(selectedType.price_cents / 100).toFixed(
                    selectedType.price_cents % 100 === 0 ? 0 : 2
                  )}
                </h3>

                {/* Quantity */}
                <div>
                  <label className="block text-sm text-stone-400 mb-1">Tickets</label>
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-white"
                  >
                    {Array.from(
                      {
                        length: Math.min(10, selectedType.remaining ?? 10),
                      },
                      (_, i) => i + 1
                    ).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-stone-400 mb-1">Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-white placeholder:text-stone-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-stone-400 mb-1">Email *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-white placeholder:text-stone-600"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-stone-400 mb-1">Phone (optional)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="555-123-4567"
                    className="w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-white placeholder:text-stone-600"
                  />
                </div>

                {/* Dietary + Allergies */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-stone-400 mb-1">
                      Dietary Restrictions
                    </label>
                    <input
                      type="text"
                      value={dietary}
                      onChange={(e) => setDietary(e.target.value)}
                      placeholder="Vegetarian, gluten-free..."
                      className="w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-white placeholder:text-stone-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-stone-400 mb-1">Allergies</label>
                    <input
                      type="text"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      placeholder="Nuts, shellfish..."
                      className="w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-white placeholder:text-stone-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-stone-400 mb-1">Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything else we should know?"
                    rows={2}
                    className="w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-white placeholder:text-stone-600"
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-900/50 border border-red-700 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                {/* Total + Buy Button */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="text-stone-400 text-sm">Total: </span>
                    <span className="text-xl font-bold">
                      ${((selectedType.price_cents * quantity) / 100).toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={handlePurchase}
                    disabled={isPending || !name.trim() || !email.trim()}
                    className="rounded-lg bg-[#e88f47] px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {isPending ? 'Processing...' : 'Get Tickets'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : !event.ticketsEnabled ? (
          <div className="rounded-xl border border-stone-700 bg-stone-900/50 p-5 text-center text-stone-500">
            Tickets are not yet available for this event. Check back soon.
          </div>
        ) : null}

        {/* Footer */}
        <div className="text-center text-xs text-stone-600 pt-8">
          Powered by{' '}
          <a
            href="https://cheflowhq.com"
            className="text-stone-500 hover:text-stone-400"
            target="_blank"
            rel="noopener noreferrer"
          >
            ChefFlow
          </a>
        </div>
      </div>
    </div>
  )
}
