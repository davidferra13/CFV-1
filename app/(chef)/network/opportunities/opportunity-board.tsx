'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Briefcase, MapPin, Clock, DollarSign, User } from '@/components/ui/icons'
import { expressInterest, type OpportunityDetail } from '@/lib/network/opportunity-actions'

type FeedItem = {
  postId: string
  chefName: string
  opportunity: OpportunityDetail
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'filled', label: 'Filled' },
] as const

const DURATION_LABELS: Record<string, string> = {
  permanent: 'Permanent',
  seasonal: 'Seasonal',
  per_event: 'Per Event',
  contract: 'Contract',
}

const COMPENSATION_LABELS: Record<string, string> = {
  hourly: 'Hourly',
  salary: 'Salary',
  day_rate: 'Day Rate',
  negotiable: 'Negotiable',
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatCompensation(opp: OpportunityDetail): string {
  if (opp.compensation_type === 'negotiable') return 'Negotiable'
  const low = opp.compensation_low_cents
  const high = opp.compensation_high_cents
  const typeLabel = COMPENSATION_LABELS[opp.compensation_type] ?? opp.compensation_type
  if (low && high) return `${formatCents(low)} - ${formatCents(high)} (${typeLabel})`
  if (low) return `From ${formatCents(low)} (${typeLabel})`
  if (high) return `Up to ${formatCents(high)} (${typeLabel})`
  return typeLabel
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function statusBadgeVariant(status: string): 'success' | 'warning' | 'default' {
  if (status === 'open') return 'success'
  if (status === 'filled') return 'warning'
  return 'default'
}

export function OpportunityBoard({
  initialFeed,
  initialStatus,
}: {
  initialFeed: FeedItem[]
  initialStatus: string
}) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [interestingIds, setInterestingIds] = useState<Set<string>>(new Set())
  const [interestErrors, setInterestErrors] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  function handleStatusChange(status: string) {
    setStatusFilter(status)
    router.push(`/network/opportunities${status !== 'open' ? `?status=${status}` : ''}`)
  }

  async function handleExpressInterest(opportunityId: string) {
    setInterestErrors((prev) => {
      const next = { ...prev }
      delete next[opportunityId]
      return next
    })

    const prevInteresting = new Set(interestingIds)
    setInterestingIds((prev) => new Set(prev).add(opportunityId))

    startTransition(async () => {
      try {
        const result = await expressInterest({ opportunityId })
        if (!result.success) {
          setInterestingIds(prevInteresting)
          setInterestErrors((prev) => ({ ...prev, [opportunityId]: result.error ?? 'Failed' }))
        }
      } catch {
        setInterestingIds(prevInteresting)
        setInterestErrors((prev) => ({
          ...prev,
          [opportunityId]: 'Something went wrong. Please try again.',
        }))
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-stone-400">Status:</span>
        <div className="flex gap-1.5">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button
              type="button"
              key={value}
              onClick={() => handleStatusChange(value)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                statusFilter === value
                  ? 'bg-amber-700 text-stone-100'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Opportunity list */}
      {initialFeed.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="h-10 w-10 text-stone-600 mx-auto mb-3" />
            <p className="text-stone-400 text-sm">
              No opportunities posted yet. Check back later or post your own.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {initialFeed.map(({ postId, chefName, opportunity: opp }) => {
            const alreadyInterested =
              opp.my_interest_id !== null || interestingIds.has(opp.id)
            const isOwn = false // Server already excludes self in expressInterest
            const isClosed = opp.status !== 'open'

            return (
              <Card key={opp.id} className="hover:border-stone-600 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: details */}
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-stone-100">
                          {opp.role_title}
                        </h3>
                        <Badge variant={statusBadgeVariant(opp.status)}>
                          {opp.status.charAt(0).toUpperCase() + opp.status.slice(1)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 flex-wrap text-sm text-stone-400">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {chefName}
                        </span>

                        {(opp.location_city || opp.location_state) && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {[opp.location_city, opp.location_state]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          {formatCompensation(opp)}
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {DURATION_LABELS[opp.duration_type] ?? opp.duration_type}
                        </span>
                      </div>

                      <div className="text-xs text-stone-500">
                        Posted {formatDate(opp.created_at)}
                      </div>

                      {interestErrors[opp.id] && (
                        <p className="text-xs text-red-400 mt-1">
                          {interestErrors[opp.id]}
                        </p>
                      )}
                    </div>

                    {/* Right: action */}
                    <div className="flex-shrink-0">
                      {alreadyInterested ? (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-amber-400 bg-amber-950 border border-amber-800 rounded-xl">
                          Interest Expressed
                        </span>
                      ) : isClosed ? (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-stone-500 bg-stone-800 border border-stone-700 rounded-xl">
                          Closed
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleExpressInterest(opp.id)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-stone-100 bg-amber-700 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Express Interest
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
