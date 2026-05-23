'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Calendar, Users, MapPin, Star, Camera } from '@/components/ui/icons'

interface PostEventPhoto {
  id: string
  url: string
  caption: string | null
}

interface PostEventExperienceProps {
  eventId: string
  eventDate: string
  occasion: string | null
  guestCount: number | null
  location: string | null
  chefName: string | null
  menuItems: Array<{ name: string; course: string | null }>
  photos: PostEventPhoto[]
  hasReviewed: boolean
  onSubmitRating?: (rating: number, note: string) => Promise<void>
}

export function PostEventExperience({
  eventId,
  eventDate,
  occasion,
  guestCount,
  location,
  chefName,
  menuItems,
  photos,
  hasReviewed,
  onSubmitRating,
}: PostEventExperienceProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(hasReviewed)

  const formattedDate = format(new Date(eventDate), 'EEEE, MMMM d, yyyy')

  async function handleSubmit() {
    if (!onSubmitRating || rating === 0) return
    setIsSubmitting(true)
    try {
      await onSubmitRating(rating, note)
      setSubmitted(true)
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false)
    }
  }

  // Suppress unused variable lint for eventId (used for future link wiring)
  void eventId

  return (
    <div className="space-y-8">
      {/* Thank you header */}
      <div className="rounded-2xl border border-[#c4a35a]/20 bg-gradient-to-br from-[#faf9f7] to-[#f5f0e8] p-8 sm:p-12 text-center">
        <div className="mx-auto w-12 h-px bg-[#c4a35a]/30 mb-6" />
        <h1 className="font-display-serif text-2xl sm:text-3xl font-bold text-[#2d2d2d] mb-3">
          Thank you for a wonderful evening
        </h1>
        <p className="text-sm text-[#2d2d2d]/60 max-w-md mx-auto">
          {chefName
            ? `${chefName} hopes you and your guests had an unforgettable experience.`
            : 'We hope you and your guests had an unforgettable experience.'}
        </p>
        <div className="mx-auto w-12 h-px bg-[#c4a35a]/30 mt-6" />
      </div>

      {/* Event summary */}
      <div className="rounded-2xl border border-stone-200 bg-[#faf9f7] p-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#c4a35a] mb-4">
          Event Summary
        </p>
        <h2 className="font-display-serif text-xl font-bold text-[#2d2d2d] mb-4">
          {occasion || 'Your Dinner'}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-[#2d2d2d]/70">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#c4a35a]/70" />
            <span>{formattedDate}</span>
          </div>
          {guestCount && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#c4a35a]/70" />
              <span>
                {guestCount} guest{guestCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#c4a35a]/70" />
              <span className="truncate">{location}</span>
            </div>
          )}
        </div>

        {/* Menu served */}
        {menuItems.length > 0 && (
          <div className="mt-6 pt-6 border-t border-[#c4a35a]/10">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#2d2d2d]/50 mb-3">
              Menu Served
            </p>
            <div className="flex flex-wrap gap-2">
              {menuItems.map((item, idx) => (
                <span
                  key={idx}
                  className="text-xs text-[#2d2d2d]/70 border border-stone-200 rounded-full px-3 py-1"
                >
                  {item.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Photo gallery */}
      {photos.length > 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-[#faf9f7] p-8">
          <div className="flex items-center gap-2 mb-6">
            <Camera className="h-4 w-4 text-[#c4a35a]" />
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#c4a35a]">
              Photos from the Evening
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="aspect-square rounded-xl overflow-hidden bg-stone-100 border border-stone-200"
              >
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Event photo'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className="h-8 w-8 text-stone-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-[#faf9f7] p-8 text-center">
          <Camera className="h-8 w-8 text-stone-300 mx-auto mb-3" />
          <p className="text-sm text-[#2d2d2d]/50">
            Photos will appear here once your chef shares them.
          </p>
        </div>
      )}

      {/* Rating prompt */}
      {!submitted && onSubmitRating && (
        <div className="rounded-2xl border border-[#c4a35a]/20 bg-[#faf9f7] p-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#c4a35a] mb-3">
            How was your experience?
          </p>
          <p className="text-sm text-[#2d2d2d]/60 mb-6 max-w-sm mx-auto">
            Your feedback helps {chefName || 'your chef'} continue to create exceptional dining
            experiences.
          </p>

          {/* Stars */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#c4a35a]/30 rounded-full p-1"
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    star <= (hoverRating || rating) ? 'text-[#c4a35a]' : 'text-stone-300'
                  }`}
                  weight={star <= (hoverRating || rating) ? 'fill' : 'regular'}
                />
              </button>
            ))}
          </div>

          {/* Note */}
          {rating > 0 && (
            <div className="max-w-md mx-auto space-y-4">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Share a note about your experience (optional)"
                rows={3}
                className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-[#2d2d2d] placeholder:text-stone-400 focus:border-[#c4a35a] focus:outline-none focus:ring-1 focus:ring-[#c4a35a]/30 resize-none"
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2d2d2d] px-6 py-3 text-sm font-medium text-[#faf9f7] transition-colors hover:bg-[#2d2d2d]/90 disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Send Feedback'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Thank you after review */}
      {submitted && (
        <div className="rounded-2xl border border-[#c4a35a]/20 bg-[#faf9f7] p-8 text-center">
          <Star className="h-6 w-6 text-[#c4a35a] mx-auto mb-3" weight="fill" />
          <p className="text-sm text-[#2d2d2d]/70">
            Thank you for your feedback. {chefName || 'Your chef'} appreciates it.
          </p>
        </div>
      )}

      {/* Book Again CTA */}
      <div className="text-center py-4">
        <Link
          href="/book-now"
          className="inline-flex items-center gap-2 rounded-xl bg-[#c4a35a] px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-[#b3943f] hover:shadow-lg"
        >
          Book Another Experience
        </Link>
        <p className="text-xs text-[#2d2d2d]/40 mt-3">We would love to cook for you again.</p>
      </div>
    </div>
  )
}
