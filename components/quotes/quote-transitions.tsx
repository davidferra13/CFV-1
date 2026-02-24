// Quote Transitions Component
// Shows action buttons for moving quotes through the pipeline
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { transitionQuote, deleteQuote } from '@/lib/quotes/actions'

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

type Quote = {
  id: string
  status: QuoteStatus
  total_quoted_cents: number
  valid_until: string | null
}

export function QuoteTransitions({ quote }: { quote: Quote }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTransition = async (newStatus: QuoteStatus) => {
    setLoading(true)
    setError(null)

    try {
      const result = await transitionQuote(quote.id, newStatus)
      if (result.success) {
        router.refresh()
      }
    } catch (err) {
      console.error('Quote transition error:', err)
      setError(err instanceof Error ? err.message : 'Transition failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this quote? This cannot be undone.')) return

    setLoading(true)
    setError(null)

    try {
      const result = await deleteQuote(quote.id)
      if (result.success) {
        router.push('/quotes')
      }
    } catch (err) {
      console.error('Delete error:', err)
      setError(err instanceof Error ? err.message : 'Delete failed')
      setLoading(false)
    }
  }

  // Terminal states
  if (quote.status === 'accepted') {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>
        <p className="text-green-700">
          This quote has been accepted by the client. Pricing is frozen.
        </p>
      </Card>
    )
  }

  if (quote.status === 'rejected') {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>
        <p className="text-stone-500">This quote was rejected by the client.</p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Actions</h2>

      {error && (
        <Alert variant="error" title="Error" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {quote.status === 'draft' && (
            <>
              <Button onClick={() => handleTransition('sent')} loading={loading} disabled={loading}>
                Send to Client
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push(`/quotes/${quote.id}/edit`)}
                disabled={loading}
              >
                Edit Quote
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDelete} disabled={loading}>
                Delete
              </Button>
            </>
          )}

          {quote.status === 'sent' && (
            <>
              <Button
                onClick={() => handleTransition('accepted')}
                loading={loading}
                disabled={loading}
              >
                Mark Accepted
              </Button>
              <Button
                variant="danger"
                onClick={() => handleTransition('rejected')}
                disabled={loading}
              >
                Mark Rejected
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleTransition('expired')}
                disabled={loading}
              >
                Mark Expired
              </Button>
            </>
          )}

          {quote.status === 'expired' && (
            <Button onClick={() => handleTransition('draft')} loading={loading} disabled={loading}>
              Revise & Resend
            </Button>
          )}
        </div>

        {/* Status-specific help text */}
        <div className="text-sm text-stone-400">
          {quote.status === 'draft' && (
            <p>This quote is in draft. Review pricing and send it to the client when ready.</p>
          )}
          {quote.status === 'sent' && (
            <p>
              Quote sent to client. Waiting for their response. You can also mark it manually if
              they respond outside the portal.
            </p>
          )}
          {quote.status === 'expired' && (
            <p>This quote expired. You can revise it and send a new version.</p>
          )}
        </div>
      </div>
    </Card>
  )
}
