'use client'

import { useState, useTransition } from 'react'
import {
  getFeatureRequests,
  updateFeatureStatus,
  type FeatureRequest,
} from '@/lib/community/feature-voting-actions'

const STATUS_OPTIONS = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'declined', label: 'Declined' },
]

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-gray-100 text-gray-700',
  under_review: 'bg-yellow-100 text-yellow-800',
  planned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  shipped: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-700',
}

function AdminFeatureCard({
  feature,
  onUpdate,
}: {
  feature: FeatureRequest
  onUpdate: () => void
}) {
  const [status, setStatus] = useState(feature.status)
  const [adminResponse, setAdminResponse] = useState(feature.admin_response ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setError(null)
    setSaved(false)

    const previousStatus = feature.status
    const previousResponse = feature.admin_response

    startTransition(async () => {
      try {
        const result = await updateFeatureStatus(
          feature.id,
          status,
          adminResponse || undefined
        )
        if (!result.success) {
          // Rollback
          setStatus(previousStatus)
          setAdminResponse(previousResponse ?? '')
          setError(result.error ?? 'Failed to update')
        } else {
          setSaved(true)
          onUpdate()
          setTimeout(() => setSaved(false), 2000)
        }
      } catch {
        setStatus(previousStatus)
        setAdminResponse(previousResponse ?? '')
        setError('Failed to update. Please try again.')
      }
    })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{feature.title}</h3>
            <span className="text-xs text-gray-400">
              {feature.vote_count} vote{feature.vote_count !== 1 ? 's' : ''}
            </span>
          </div>
          {feature.description && (
            <p className="mt-1 text-sm text-gray-600">{feature.description}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            Submitted {new Date(feature.created_at).toLocaleDateString()}
          </p>
        </div>

        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_COLORS[feature.status] ?? 'bg-gray-100 text-gray-700'}`}
        >
          {STATUS_OPTIONS.find((s) => s.value === feature.status)?.label ?? feature.status}
        </span>
      </div>

      <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
        <div>
          <label className="block text-xs font-medium text-gray-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">Admin Response</label>
          <textarea
            value={adminResponse}
            onChange={(e) => setAdminResponse(e.target.value)}
            placeholder="Optional response visible to the submitter..."
            rows={2}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && (
            <span className="text-xs text-green-600">Saved!</span>
          )}
        </div>
      </div>
    </div>
  )
}

export function FeatureAdminPanel({
  initialFeatures,
  isAdminUser,
}: {
  initialFeatures: FeatureRequest[]
  isAdminUser: boolean
}) {
  const [features, setFeatures] = useState<FeatureRequest[]>(initialFeatures)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!isAdminUser) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Admin access is required to manage feature requests.
      </div>
    )
  }

  function refresh() {
    startTransition(async () => {
      try {
        const updated = await getFeatureRequests()
        setFeatures(updated)
        setError(null)
      } catch {
        setError('Failed to refresh feature requests')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Feature Request Admin</h2>
          <p className="mt-1 text-sm text-gray-500">
            Review and manage feature requests. Update statuses and respond to submissions.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={isPending}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {features.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 py-12 text-center">
          <p className="text-sm text-gray-500">No feature requests yet.</p>
        </div>
      )}

      <div className="space-y-4">
        {features.map((feature) => (
          <AdminFeatureCard key={feature.id} feature={feature} onUpdate={refresh} />
        ))}
      </div>
    </div>
  )
}
