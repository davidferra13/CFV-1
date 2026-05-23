'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import {
  Copy,
  ExternalLink,
  Filter,
  Inbox,
  Link2,
  MessageSquare,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  WarningCircle,
} from '@/components/ui/icons'
import type { UnifiedChefReviewItem } from '@/lib/reviews/actions'
import {
  draftRemyReviewResponse,
  saveChefReviewResponse,
  setReviewFeatured,
  setReviewPublicDisplay,
} from '@/lib/reviews/actions'
import { buildReviewAnalytics } from '@/lib/reviews/command-center'

type Filters = {
  source: string
  rating: string
  visibility: string
  response: string
  linked: string
  type: string
  from: string
  to: string
}

const emptyFilters: Filters = {
  source: 'all',
  rating: 'all',
  visibility: 'all',
  response: 'all',
  linked: 'all',
  type: 'all',
  from: '',
  to: '',
}

const trustLabels: Record<UnifiedChefReviewItem['trustTier'], string> = {
  verified_chef_flow_event: 'Verified ChefFlow event',
  verified_external_platform: 'Verified external platform',
  chef_entered: 'Chef-entered',
  unverified_import: 'Unverified import',
}

const responseLabels: Record<UnifiedChefReviewItem['responseState'], string> = {
  needs_response: 'Needs response',
  response_drafted: 'Draft ready',
  responded: 'Responded',
  posted_externally: 'Posted externally',
}

const linkHealthLabels: Record<UnifiedChefReviewItem['linkHealth'], string> = {
  valid: 'Link valid',
  missing: 'Missing source link',
  malformed: 'Malformed source link',
  private_suspicious: 'Private or suspicious link',
}

function StarDisplay({ rating }: { rating: number }) {
  const rounded = Math.round(rating)

  return (
    <div className="flex gap-0.5" aria-label={`${rating} star rating`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-4 w-4 ${
            star <= rounded ? 'fill-amber-400 text-amber-400' : 'fill-stone-300 text-stone-300'
          }`}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

function safeFormatDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return format(parsed, 'PPP')
}

function badgeVariantForLink(health: UnifiedChefReviewItem['linkHealth']) {
  if (health === 'valid') return 'success'
  if (health === 'missing') return 'warning'
  return 'error'
}

function reviewMatchesFilters(review: UnifiedChefReviewItem, filters: Filters) {
  if (filters.source !== 'all' && review.sourceKey !== filters.source) return false
  if (filters.rating !== 'all' && Number(review.rating ?? 0) < Number(filters.rating)) return false
  if (filters.visibility !== 'all' && review.publicDisplay !== filters.visibility) return false
  if (filters.response !== 'all' && review.responseState !== filters.response) return false
  if (filters.linked === 'linked' && !review.sourceUrl) return false
  if (filters.linked === 'unlinked' && review.sourceUrl) return false
  if (filters.type !== 'all' && review.kind !== filters.type) return false

  const reviewDate = Date.parse(review.reviewDate)
  if (filters.from && (!Number.isFinite(reviewDate) || reviewDate < Date.parse(filters.from))) {
    return false
  }
  if (filters.to && (!Number.isFinite(reviewDate) || reviewDate > Date.parse(filters.to))) {
    return false
  }

  return true
}

function commandCenterInbox(reviews: UnifiedChefReviewItem[]) {
  return reviews.filter(
    (review) =>
      review.importState === 'needs_review' ||
      review.linkHealth !== 'valid' ||
      review.publicDisplay === 'pending' ||
      review.duplicateCount > 0
  )
}

function ReviewActions({ review }: { review: UnifiedChefReviewItem }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const canTogglePublic =
    review.kind === 'client_review' ||
    review.kind === 'logged_feedback' ||
    review.id.startsWith('guest_') ||
    review.id.startsWith('testimonial_')
  const canFeature = review.id.startsWith('guest_') || review.id.startsWith('testimonial_')
  const canRespond = review.kind === 'client_review'

  function runAction(action: () => Promise<unknown>, success?: () => void) {
    setError(null)
    startTransition(async () => {
      try {
        await action()
        success?.()
        router.refresh()
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Review action failed')
      }
    })
  }

  async function copyPack(kind: keyof UnifiedChefReviewItem['exportPack']) {
    await navigator.clipboard.writeText(review.exportPack[kind])
  }

  return (
    <div className="mt-4 space-y-3">
      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => copyPack('website')}
          tooltip="Copy website proof"
        >
          <Copy className="h-4 w-4" />
          Website
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => copyPack('proposalProof')}
          tooltip="Copy proposal proof"
        >
          <Share2 className="h-4 w-4" />
          Proposal
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => copyPack('socialCaption')}
          tooltip="Copy social caption"
        >
          <Share2 className="h-4 w-4" />
          Social
        </Button>

        {canTogglePublic && (
          <Button
            type="button"
            size="sm"
            variant={review.publicDisplay === 'public' ? 'ghost' : 'secondary'}
            loading={isPending}
            onClick={() =>
              runAction(() => setReviewPublicDisplay(review.id, review.publicDisplay !== 'public'))
            }
          >
            {review.publicDisplay === 'public' ? 'Make Private' : 'Approve Public'}
          </Button>
        )}

        {canFeature && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            loading={isPending}
            onClick={() => runAction(() => setReviewFeatured(review.id, !review.isFeatured))}
          >
            <Star className="h-4 w-4" />
            {review.isFeatured ? 'Unfeature' : 'Feature'}
          </Button>
        )}
      </div>

      {canRespond && (
        <div className="rounded-lg border border-stone-700 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-stone-100">Chef response workflow</p>
              <p className="text-xs text-stone-500">
                Remy can draft. The response is saved only after chef approval.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              loading={isPending}
              onClick={() =>
                runAction(
                  async () => {
                    const result = await draftRemyReviewResponse(review.id)
                    setDraft(result.draft)
                  },
                  () => undefined
                )
              }
            >
              <Sparkles className="h-4 w-4" />
              Draft
            </Button>
          </div>

          {draft && (
            <form
              className="mt-3 space-y-2"
              onSubmit={(event) => {
                event.preventDefault()
                runAction(
                  () => saveChefReviewResponse(review.id, draft),
                  () => setDraft('')
                )
              }}
            >
              <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} />
              <div className="flex justify-end">
                <Button type="submit" size="sm" loading={isPending}>
                  Approve Response
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

function ReviewCard({ review }: { review: UnifiedChefReviewItem }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-stone-100">{review.reviewerName}</p>
            {review.contextLine && (
              <p className="mt-0.5 text-sm text-stone-500">{review.contextLine}</p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Badge variant="default">{review.sourceLabel}</Badge>
            <Badge variant={badgeVariantForLink(review.linkHealth)}>
              {linkHealthLabels[review.linkHealth]}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {typeof review.rating === 'number' && <StarDisplay rating={review.rating} />}
          <Badge variant="info">{trustLabels[review.trustTier]}</Badge>
          <Badge variant={review.publicDisplay === 'public' ? 'success' : 'default'}>
            {review.publicDisplay === 'public'
              ? 'Public'
              : review.publicDisplay === 'pending'
                ? 'Pending public approval'
                : 'Private'}
          </Badge>
          <Badge variant={review.responseState === 'responded' ? 'success' : 'warning'}>
            {responseLabels[review.responseState]}
          </Badge>
          {review.duplicateCount > 0 && (
            <Badge variant="warning">Possible duplicate x{review.duplicateCount}</Badge>
          )}
          {review.isFeatured && <Badge variant="success">Featured</Badge>}
        </div>

        <p className="mt-3 whitespace-pre-wrap text-sm text-stone-300">{review.reviewText}</p>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-stone-400">
          <span>{safeFormatDate(review.reviewDate)}</span>
          <span>Provider: {review.evidence.provider}</span>
          {review.evidence.importedAt && (
            <span>Imported: {safeFormatDate(review.evidence.importedAt)}</span>
          )}
          {review.evidence.hasRawPayload && <span>Payload retained</span>}
        </div>

        {review.sourceUrl && review.directSourceLinkLabel && (
          <a
            href={review.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-[44px] items-center gap-1 text-sm text-brand-500 hover:text-brand-400"
          >
            <ExternalLink className="h-4 w-4" />
            {review.directSourceLinkLabel}
          </a>
        )}

        <ReviewActions review={review} />
      </CardContent>
    </Card>
  )
}

export function ChefReviewsList({ reviews }: { reviews: UnifiedChefReviewItem[] }) {
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const analytics = useMemo(() => buildReviewAnalytics(reviews), [reviews])
  const inbox = useMemo(() => commandCenterInbox(reviews), [reviews])
  const filteredReviews = useMemo(
    () => reviews.filter((review) => reviewMatchesFilters(review, filters)),
    [filters, reviews]
  )
  const sources = useMemo(
    () => Array.from(new Map(reviews.map((review) => [review.sourceKey, review.sourceLabel]))),
    [reviews]
  )

  const externalCount = reviews.filter((review) => review.kind === 'external_review').length
  const linkedCount = reviews.filter((review) => !!review.sourceUrl).length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Entries" value={reviews.length.toString()} icon={MessageSquare} />
        <StatCard
          label="Avg Rating"
          value={analytics.averageRating > 0 ? analytics.averageRating.toFixed(1) : '--'}
          icon={Star}
        />
        <StatCard label="External Sync" value={externalCount.toString()} icon={Link2} />
        <StatCard label="Source Links" value={linkedCount.toString()} icon={ExternalLink} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardContent className="pt-5">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <p className="font-medium text-stone-100">Reputation analytics</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-stone-500">Response rate</p>
                <p className="text-lg font-semibold text-stone-100">{analytics.responseRate}%</p>
              </div>
              <div>
                <p className="text-stone-500">Public approval</p>
                <p className="text-lg font-semibold text-stone-100">
                  {analytics.publicApprovalRate}%
                </p>
              </div>
              <div>
                <p className="text-stone-500">External imported</p>
                <p className="text-lg font-semibold text-stone-100">
                  {analytics.conversion.externalImported}
                </p>
              </div>
              <div>
                <p className="text-stone-500">Source clicks/found</p>
                <p className="text-lg font-semibold text-stone-100">
                  {analytics.conversion.externalClicked}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {analytics.sourceMix.slice(0, 8).map((source) => (
                <Badge key={source.source} variant="default">
                  {source.source}: {source.count}
                  {source.averageRating > 0 ? ` / ${source.averageRating.toFixed(1)}` : ''}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="mb-3 flex items-center gap-2">
              <Inbox className="h-5 w-5 text-amber-400" />
              <p className="font-medium text-stone-100">Import inbox</p>
            </div>
            {inbox.length === 0 ? (
              <p className="text-sm text-stone-500">
                No unresolved imports, missing links, or duplicate warnings.
              </p>
            ) : (
              <div className="space-y-2">
                {inbox.slice(0, 5).map((review) => (
                  <div
                    key={`inbox_${review.id}`}
                    className="rounded-lg border border-stone-700 p-3 text-sm"
                  >
                    <div className="flex items-start gap-2">
                      <WarningCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      <div>
                        <p className="font-medium text-stone-100">{review.reviewerName}</p>
                        <p className="text-stone-500">
                          {review.sourceLabel} - {linkHealthLabels[review.linkHealth]}
                          {review.duplicateCount > 0
                            ? ` - duplicate group ${review.duplicateCount}`
                            : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-brand-400" />
            <p className="font-medium text-stone-100">Filters</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Source"
              value={filters.source}
              onChange={(event) => setFilters({ ...filters, source: event.target.value })}
              options={[
                { value: 'all', label: 'All sources' },
                ...sources.map(([value, label]) => ({ value, label })),
              ]}
            />
            <Select
              label="Rating"
              value={filters.rating}
              onChange={(event) => setFilters({ ...filters, rating: event.target.value })}
              options={[
                { value: 'all', label: 'Any rating' },
                { value: '5', label: '5 stars' },
                { value: '4', label: '4+ stars' },
                { value: '3', label: '3+ stars' },
              ]}
            />
            <Select
              label="Public"
              value={filters.visibility}
              onChange={(event) => setFilters({ ...filters, visibility: event.target.value })}
              options={[
                { value: 'all', label: 'Any visibility' },
                { value: 'public', label: 'Public' },
                { value: 'private', label: 'Private' },
                { value: 'pending', label: 'Pending' },
              ]}
            />
            <Select
              label="Response"
              value={filters.response}
              onChange={(event) => setFilters({ ...filters, response: event.target.value })}
              options={[
                { value: 'all', label: 'Any response state' },
                { value: 'needs_response', label: 'Needs response' },
                { value: 'response_drafted', label: 'Draft ready' },
                { value: 'responded', label: 'Responded' },
                { value: 'posted_externally', label: 'Posted externally' },
              ]}
            />
            <Select
              label="Linked"
              value={filters.linked}
              onChange={(event) => setFilters({ ...filters, linked: event.target.value })}
              options={[
                { value: 'all', label: 'Linked or unlinked' },
                { value: 'linked', label: 'Has source link' },
                { value: 'unlinked', label: 'Missing source link' },
              ]}
            />
            <Select
              label="Type"
              value={filters.type}
              onChange={(event) => setFilters({ ...filters, type: event.target.value })}
              options={[
                { value: 'all', label: 'All review types' },
                { value: 'client_review', label: 'ChefFlow client' },
                { value: 'logged_feedback', label: 'Manual feedback' },
                { value: 'external_review', label: 'External sync' },
                { value: 'guest_testimonial', label: 'Guest testimonial' },
              ]}
            />
            <Input
              label="From"
              type="date"
              value={filters.from}
              onChange={(event) => setFilters({ ...filters, from: event.target.value })}
            />
            <Input
              label="To"
              type="date"
              value={filters.to}
              onChange={(event) => setFilters({ ...filters, to: event.target.value })}
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setFilters(emptyFilters)}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-stone-500">
              No reviews yet. Internal feedback, testimonials, manual imports, and synced external
              reviews will appear here.
            </p>
          </CardContent>
        </Card>
      ) : filteredReviews.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-stone-500">
              No reviews match these filters. Adjust source, date, rating, response, or link state.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  )
}
