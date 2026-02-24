// Import Platform Review — Modal to manually log a review from any external platform
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, type SelectOptionGroup } from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { logChefFeedback } from '@/lib/reviews/chef-feedback-actions'

// ============================================
// PLATFORM METADATA
// ============================================

type PlatformMeta = {
  label: string
  urlPlaceholder: string
  needsName: boolean // true for all external platforms; false for direct/verbal
}

const PLATFORM_META: Record<string, PlatformMeta> = {
  // Booking / Hosting
  airbnb: {
    label: 'Airbnb',
    urlPlaceholder: 'https://www.airbnb.com/users/show/...',
    needsName: true,
  },
  thumbtack: {
    label: 'Thumbtack',
    urlPlaceholder: 'https://www.thumbtack.com/...',
    needsName: true,
  },
  gigsalad: { label: 'GigSalad', urlPlaceholder: 'https://www.gigsalad.com/...', needsName: true },
  taskrabbit: {
    label: 'TaskRabbit',
    urlPlaceholder: 'https://www.taskrabbit.com/...',
    needsName: true,
  },
  // Service Directories
  angi: { label: 'Angi', urlPlaceholder: 'https://www.angi.com/...', needsName: true },
  houzz: { label: 'Houzz', urlPlaceholder: 'https://www.houzz.com/...', needsName: true },
  bark: { label: 'Bark', urlPlaceholder: 'https://www.bark.com/...', needsName: true },
  // Social & General Reviews
  facebook: { label: 'Facebook', urlPlaceholder: 'https://www.facebook.com/...', needsName: true },
  tripadvisor: {
    label: 'TripAdvisor',
    urlPlaceholder: 'https://www.tripadvisor.com/...',
    needsName: true,
  },
  yelp: { label: 'Yelp', urlPlaceholder: 'https://www.yelp.com/biz/...', needsName: true },
  yelp_guest: {
    label: 'Yelp (Guest)',
    urlPlaceholder: 'https://www.yelp.com/biz/...',
    needsName: true,
  },
  nextdoor: { label: 'Nextdoor', urlPlaceholder: 'https://nextdoor.com/...', needsName: true },
  instagram: {
    label: 'Instagram',
    urlPlaceholder: 'https://www.instagram.com/...',
    needsName: true,
  },
  // Direct / Verbal
  verbal: { label: 'Verbal / In-Person', urlPlaceholder: '', needsName: false },
  email: { label: 'Email', urlPlaceholder: '', needsName: false },
  text_message: { label: 'Text Message', urlPlaceholder: '', needsName: false },
  social_media: { label: 'Social Media (DM)', urlPlaceholder: 'https://...', needsName: false },
  google: { label: 'Google', urlPlaceholder: 'https://g.page/...', needsName: true },
  other: { label: 'Other', urlPlaceholder: '', needsName: false },
}

const SOURCE_SELECT_GROUPS: SelectOptionGroup[] = [
  {
    label: 'Booking Platforms',
    options: [
      { label: 'Airbnb', value: 'airbnb' },
      { label: 'Thumbtack', value: 'thumbtack' },
      { label: 'GigSalad', value: 'gigsalad' },
      { label: 'TaskRabbit', value: 'taskrabbit' },
    ],
  },
  {
    label: 'Service Directories',
    options: [
      { label: 'Angi', value: 'angi' },
      { label: 'Houzz', value: 'houzz' },
      { label: 'Bark', value: 'bark' },
    ],
  },
  {
    label: 'Social & General Reviews',
    options: [
      { label: 'Facebook', value: 'facebook' },
      { label: 'Google', value: 'google' },
      { label: 'TripAdvisor', value: 'tripadvisor' },
      { label: 'Yelp', value: 'yelp' },
      { label: 'Yelp (Guest)', value: 'yelp_guest' },
      { label: 'Nextdoor', value: 'nextdoor' },
      { label: 'Instagram', value: 'instagram' },
    ],
  },
  {
    label: 'Direct',
    options: [
      { label: 'Verbal / In-Person', value: 'verbal' },
      { label: 'Email', value: 'email' },
      { label: 'Text Message', value: 'text_message' },
      { label: 'Social Media (DM)', value: 'social_media' },
      { label: 'Other', value: 'other' },
    ],
  },
]

// ============================================
// COMPONENT
// ============================================

export function ImportPlatformReview() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [source, setSource] = useState('')
  const [reviewerName, setReviewerName] = useState('')
  const [feedbackText, setFeedbackText] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const [feedbackDate, setFeedbackDate] = useState(new Date().toISOString().split('T')[0])
  const [publicDisplay, setPublicDisplay] = useState(true)

  const platformMeta = source ? PLATFORM_META[source] : null
  const needsName = platformMeta?.needsName ?? false

  const resetForm = () => {
    setSource('')
    setReviewerName('')
    setFeedbackText('')
    setRating(null)
    setSourceUrl('')
    setFeedbackDate(new Date().toISOString().split('T')[0])
    setPublicDisplay(true)
    setError(null)
  }

  const handleClose = () => {
    setOpen(false)
    resetForm()
  }

  const isSubmittable =
    source.length > 0 &&
    feedbackText.trim().length > 0 &&
    (!needsName || reviewerName.trim().length > 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSubmittable) return

    setSubmitting(true)
    setError(null)

    try {
      await logChefFeedback({
        source: source as any,
        reviewer_name: reviewerName.trim() || null,
        feedback_text: feedbackText.trim(),
        rating,
        client_id: null,
        source_url: sourceUrl.trim() || '',
        feedback_date: feedbackDate,
        public_display: publicDisplay,
      })
      handleClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save review')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        + Import Platform Review
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

          {/* Modal */}
          <div className="relative bg-stone-900 rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-stone-100">Import Platform Review</h3>
              <button
                onClick={handleClose}
                className="text-stone-400 hover:text-stone-400 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <p className="text-sm text-stone-500 mb-4">
              Manually log a review from Airbnb, Facebook, TripAdvisor, or any platform. Google and
              personal website reviews that auto-sync are configured separately.
            </p>

            {error && (
              <Alert variant="error" className="mb-4">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Platform picker */}
              <Select
                label="Platform"
                required
                groups={SOURCE_SELECT_GROUPS}
                value={source}
                onChange={(e) => {
                  setSource(e.target.value)
                  setSourceUrl('')
                  setReviewerName('')
                }}
                helperText="Where did this review come from?"
              />

              {/* Reviewer name — shown for all external platforms */}
              {needsName && (
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">
                    Reviewer Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Sarah M."
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    required
                  />
                  <p className="text-xs text-stone-400 mt-1">
                    The person&apos;s name as shown on the platform
                  </p>
                </div>
              )}

              {/* Review text */}
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Review Text <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="Paste or type the review text here..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              {/* Star rating */}
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Rating (optional)
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(rating === star ? null : star)}
                      className="p-1"
                    >
                      <svg
                        className={`w-6 h-6 ${
                          star <= (rating ?? 0)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-stone-300 fill-stone-300'
                        }`}
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </button>
                  ))}
                  {rating !== null && (
                    <button
                      type="button"
                      onClick={() => setRating(null)}
                      className="text-xs text-stone-400 hover:text-stone-400 ml-2"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Source URL — dynamic placeholder per platform */}
              {platformMeta && (
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">
                    Review Link (optional)
                  </label>
                  <Input
                    type="url"
                    placeholder={platformMeta.urlPlaceholder || 'https://...'}
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                  />
                  <p className="text-xs text-stone-400 mt-1">
                    Direct link to the review if available
                  </p>
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Review Date</label>
                <Input
                  type="date"
                  value={feedbackDate}
                  onChange={(e) => setFeedbackDate(e.target.value)}
                />
              </div>

              {/* Public display toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publicDisplay}
                  onChange={(e) => setPublicDisplay(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-600 bg-stone-800 text-brand-500 focus:ring-brand-500"
                />
                <div>
                  <span className="text-sm font-medium text-stone-300">Show on public profile</span>
                  <p className="text-xs text-stone-500">
                    This review will be visible to visitors on your public profile page
                  </p>
                </div>
              </label>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClose}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!isSubmittable || submitting} loading={submitting}>
                  Save Review
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
