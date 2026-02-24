'use client'

// Menu Approval Client Component
// Interactive: approve button or revision request form.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { approveMenu, requestMenuRevision } from '@/lib/events/menu-approval-actions'

type MenuItem = { menu_name: string; dishes: string[] }

type Props = {
  requestId: string
  menuSnapshot: MenuItem[]
  status: 'sent' | 'approved' | 'revision_requested'
  revisionNotes: string | null
  eventId: string
}

export function MenuApprovalClient({
  requestId,
  menuSnapshot,
  status,
  revisionNotes,
  eventId,
}: Props) {
  const router = useRouter()
  const [showRevisionForm, setShowRevisionForm] = useState(false)
  const [revisionText, setRevisionText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleApprove() {
    setLoading(true)
    setError(null)
    try {
      await approveMenu(requestId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve')
    } finally {
      setLoading(false)
    }
  }

  async function handleRevision() {
    if (!revisionText.trim()) return
    setLoading(true)
    setError(null)
    try {
      await requestMenuRevision({ request_id: requestId, notes: revisionText })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit revision request')
    } finally {
      setLoading(false)
    }
  }

  // Already responded
  if (status === 'approved') {
    return (
      <div className="rounded-xl border border-green-200 bg-green-950 p-6 text-center space-y-2">
        <div className="text-3xl">✓</div>
        <p className="font-semibold text-green-800">Menu approved</p>
        <p className="text-sm text-green-700">Your chef has been notified.</p>
        <Button variant="secondary" onClick={() => router.push(`/my-events/${eventId}`)}>
          Back to Event
        </Button>
      </div>
    )
  }

  if (status === 'revision_requested') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-950 p-6 space-y-3">
        <p className="font-semibold text-amber-800">Revision request sent</p>
        <p className="text-sm text-amber-700">Your note: &ldquo;{revisionNotes}&rdquo;</p>
        <p className="text-xs text-stone-500">Your chef will reach out with an updated menu.</p>
        <Button variant="secondary" onClick={() => router.push(`/my-events/${eventId}`)}>
          Back to Event
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Menu display */}
      {menuSnapshot.length > 0 ? (
        <div className="rounded-xl border border-stone-700 bg-stone-900 p-5 space-y-4">
          {menuSnapshot.map((menu, i) => (
            <div key={i}>
              <h3 className="text-sm font-semibold text-stone-200 mb-1">{menu.menu_name}</h3>
              <ul className="space-y-1">
                {menu.dishes.map((dish, j) => (
                  <li key={j} className="text-sm text-stone-400">
                    • {dish}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-stone-700 bg-stone-900 p-5">
          <p className="text-sm text-stone-500">
            Menu details are being finalized. Contact your chef for the full list.
          </p>
        </div>
      )}

      {/* Action buttons */}
      {!showRevisionForm ? (
        <div className="flex flex-col gap-3">
          <Button onClick={handleApprove} disabled={loading} className="w-full">
            {loading ? 'Approving…' : 'Approve Menu'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowRevisionForm(true)}
            disabled={loading}
            className="w-full"
          >
            Request Changes
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-stone-300">
            What would you like changed?
          </label>
          <textarea
            value={revisionText}
            onChange={(e) => setRevisionText(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-stone-600 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="e.g. Could we swap the salmon for halibut? One guest is vegetarian."
          />
          <div className="flex gap-2">
            <Button onClick={handleRevision} disabled={loading || !revisionText.trim()}>
              {loading ? 'Sending…' : 'Send Request'}
            </Button>
            <Button variant="ghost" onClick={() => setShowRevisionForm(false)} disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
