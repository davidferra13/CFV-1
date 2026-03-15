'use client'

import { useState, useTransition } from 'react'
import {
  getFeatureRequests,
  submitFeatureRequest,
  voteForFeature,
  type FeatureRequest,
} from '@/lib/community/feature-voting-actions'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'declined', label: 'Declined' },
]

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'core_ops', label: 'Core Operations' },
  { value: 'clients', label: 'Clients' },
  { value: 'finance', label: 'Finance' },
  { value: 'scheduling', label: 'Scheduling' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'recipes', label: 'Recipes' },
  { value: 'team', label: 'Team' },
  { value: 'integrations', label: 'Integrations' },
  { value: 'other', label: 'Other' },
]

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-gray-100 text-gray-700',
  under_review: 'bg-yellow-100 text-yellow-800',
  planned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  shipped: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-700',
}

const CATEGORY_COLORS: Record<string, string> = {
  core_ops: 'bg-indigo-50 text-indigo-700',
  clients: 'bg-pink-50 text-pink-700',
  finance: 'bg-emerald-50 text-emerald-700',
  scheduling: 'bg-orange-50 text-orange-700',
  marketing: 'bg-cyan-50 text-cyan-700',
  recipes: 'bg-amber-50 text-amber-700',
  team: 'bg-violet-50 text-violet-700',
  integrations: 'bg-teal-50 text-teal-700',
  other: 'bg-gray-50 text-gray-600',
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {label}
    </span>
  )
}

function CategoryBadge({ category }: { category: string }) {
  const label = CATEGORY_OPTIONS.find((c) => c.value === category)?.label ?? category
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[category] ?? 'bg-gray-50 text-gray-600'}`}
    >
      {label}
    </span>
  )
}

function VoteButton({
  feature,
  onVote,
}: {
  feature: FeatureRequest
  onVote: (id: string) => void
}) {
  return (
    <button
      onClick={() => onVote(feature.id)}
      className={`flex flex-col items-center rounded-lg border px-3 py-2 transition-colors ${
        feature.has_voted
          ? 'border-blue-300 bg-blue-50 text-blue-700'
          : 'border-gray-200 bg-white text-gray-500 hover:border-blue-200 hover:bg-blue-50'
      }`}
      title={feature.has_voted ? 'Remove your vote' : 'Vote for this feature'}
    >
      <svg
        className="h-4 w-4"
        fill={feature.has_voted ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
      <span className="text-sm font-semibold">{feature.vote_count}</span>
    </button>
  )
}

export function FeatureBoard({
  initialFeatures,
}: {
  initialFeatures: FeatureRequest[]
}) {
  const [features, setFeatures] = useState<FeatureRequest[]>(initialFeatures)
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('other')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  function handleVote(featureId: string) {
    const previous = [...features]

    // Optimistic update
    setFeatures((prev) =>
      prev.map((f) => {
        if (f.id !== featureId) return f
        const wasVoted = f.has_voted
        return {
          ...f,
          has_voted: !wasVoted,
          vote_count: wasVoted ? Math.max(0, f.vote_count - 1) : f.vote_count + 1,
        }
      })
    )

    startTransition(async () => {
      try {
        const result = await voteForFeature(featureId)
        if (!result.success) {
          setFeatures(previous)
          setError(result.error ?? 'Failed to vote')
        } else {
          // Update with server-confirmed count
          setFeatures((prev) =>
            prev.map((f) =>
              f.id === featureId
                ? { ...f, vote_count: result.newCount, has_voted: result.voted }
                : f
            )
          )
        }
      } catch {
        setFeatures(previous)
        setError('Failed to vote. Please try again.')
      }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    startTransition(async () => {
      try {
        const result = await submitFeatureRequest(title, description, category)
        if (!result.success) {
          setError(result.error ?? 'Failed to submit')
          return
        }
        setTitle('')
        setDescription('')
        setCategory('other')
        setShowForm(false)
        setSuccessMessage('Feature request submitted!')

        // Refresh the list
        const updated = await getFeatureRequests(
          statusFilter || undefined,
          categoryFilter || undefined
        )
        setFeatures(updated)
      } catch {
        setError('Failed to submit feature request. Please try again.')
      }
    })
  }

  function handleFilterChange(newStatus: string, newCategory: string) {
    setStatusFilter(newStatus)
    setCategoryFilter(newCategory)
    setError(null)

    startTransition(async () => {
      try {
        const updated = await getFeatureRequests(
          newStatus || undefined,
          newCategory || undefined
        )
        setFeatures(updated)
      } catch {
        setError('Failed to filter features. Please try again.')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Feature Requests</h2>
          <p className="mt-1 text-sm text-gray-500">
            Submit ideas and vote on features you want to see in ChefFlow.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Cancel' : 'Submit Request'}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {/* Submit form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-4"
        >
          <div>
            <label htmlFor="fr-title" className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              id="fr-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What feature would you like to see?"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="fr-description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="fr-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the feature and why it would be helpful..."
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="fr-category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="fr-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {CATEGORY_OPTIONS.filter((c) => c.value).map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => handleFilterChange(e.target.value, categoryFilter)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => handleFilterChange(statusFilter, e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Feature list */}
      {isPending && features.length === 0 && (
        <p className="text-sm text-gray-500">Loading...</p>
      )}

      {!isPending && features.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 py-12 text-center">
          <p className="text-sm text-gray-500">No feature requests found.</p>
          <p className="mt-1 text-xs text-gray-400">Be the first to submit one!</p>
        </div>
      )}

      <div className="space-y-3">
        {features.map((feature) => (
          <div
            key={feature.id}
            className="flex gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <VoteButton feature={feature} onVote={handleVote} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">{feature.title}</h3>
                <StatusBadge status={feature.status} />
                <CategoryBadge category={feature.category} />
              </div>
              {feature.description && (
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                  {feature.description}
                </p>
              )}
              {feature.admin_response && (
                <div className="mt-2 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  <span className="font-medium">Admin response:</span> {feature.admin_response}
                </div>
              )}
              <p className="mt-2 text-xs text-gray-400">
                {new Date(feature.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
