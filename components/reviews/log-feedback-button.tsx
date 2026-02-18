// Log Feedback Button — Opens a form to capture verbal/external feedback
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { logChefFeedback } from '@/lib/reviews/chef-feedback-actions'
import { getClients } from '@/lib/clients/actions'

type Client = {
  id: string
  full_name: string
  email: string
}

const SOURCE_OPTIONS = [
  { value: 'verbal', label: 'Verbal / In-Person' },
  { value: 'google', label: 'Google Review' },
  { value: 'yelp', label: 'Yelp Review' },
  { value: 'email', label: 'Email' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'text_message', label: 'Text Message' },
  { value: 'other', label: 'Other' },
]

export function LogFeedbackButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [source, setSource] = useState('')
  const [feedbackText, setFeedbackText] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [clientId, setClientId] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [feedbackDate, setFeedbackDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  // Fetch clients when modal opens
  useEffect(() => {
    if (!open) return
    setLoading(true)
    getClients()
      .then((data) => setClients(data as Client[]))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  const resetForm = () => {
    setSource('')
    setFeedbackText('')
    setRating(null)
    setClientId('')
    setSourceUrl('')
    setFeedbackDate(new Date().toISOString().split('T')[0])
    setError(null)
  }

  const handleClose = () => {
    setOpen(false)
    resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!source || !feedbackText.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      await logChefFeedback({
        source: source as any,
        feedback_text: feedbackText.trim(),
        rating,
        client_id: clientId || null,
        source_url: sourceUrl.trim() || '',
        feedback_date: feedbackDate,
      })
      handleClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log feedback')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        + Log Feedback
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-stone-900">Log Feedback</h3>
              <button
                onClick={handleClose}
                className="text-stone-400 hover:text-stone-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <p className="text-sm text-stone-500 mb-4">
              Capture verbal feedback, Google reviews, or any external testimonials.
            </p>

            {error && <Alert variant="error" className="mb-4">{error}</Alert>}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Source */}
              <Select
                label="Source"
                required
                options={SOURCE_OPTIONS}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                helperText="Where did this feedback come from?"
              />

              {/* Feedback Text */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Feedback <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="What did they say?"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
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
                  {rating && (
                    <button
                      type="button"
                      onClick={() => setRating(null)}
                      className="text-xs text-stone-400 hover:text-stone-600 ml-2"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Client */}
              <Select
                label="Client (optional)"
                options={[
                  { value: '', label: 'No specific client' },
                  ...clients.map((c) => ({
                    value: c.id,
                    label: `${c.full_name} (${c.email})`,
                  })),
                ]}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={loading}
              />

              {/* Source URL */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Link (optional)
                </label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                />
                <p className="text-xs text-stone-400 mt-1">
                  Link to the external review if applicable
                </p>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Date
                </label>
                <Input
                  type="date"
                  value={feedbackDate}
                  onChange={(e) => setFeedbackDate(e.target.value)}
                />
              </div>

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
                <Button
                  type="submit"
                  disabled={!source || !feedbackText.trim() || submitting}
                  loading={submitting}
                >
                  Log Feedback
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
