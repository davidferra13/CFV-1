'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import {
  NEARBY_LOW_DENSITY_WAITLIST_SOURCE,
  NEARBY_NO_RESULTS_WAITLIST_SOURCE,
} from '@/lib/directory/waitlist-shared'
import {
  saveNearbySavedSearchAlert,
} from '@/lib/directory/waitlist-actions'
import { buildNearbySavedSearchSummary } from '@/lib/discover/nearby-saved-search'

type Props = {
  source: typeof NEARBY_LOW_DENSITY_WAITLIST_SOURCE | typeof NEARBY_NO_RESULTS_WAITLIST_SOURCE
  defaultCity?: string
  defaultState?: string
  defaultBusinessType?: string
  defaultCuisine?: string
  searchQuery?: string
  locationQuery?: string
  locationLabel?: string
  radiusMiles?: number | null
  userLat?: number | null
  userLon?: number | null
  currentMatchCount?: number
  className?: string
}

export function UnmetDemandCapture({
  source,
  defaultCity = '',
  defaultState = '',
  defaultBusinessType = '',
  defaultCuisine = '',
  searchQuery = '',
  locationQuery = '',
  locationLabel = '',
  radiusMiles = null,
  userLat = null,
  userLon = null,
  currentMatchCount = 0,
  className = '',
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const filterSummary = buildNearbySavedSearchSummary({
    query: searchQuery,
    businessType: defaultBusinessType,
    cuisine: defaultCuisine,
    state: defaultState,
    city: defaultCity,
    locationQuery,
    locationLabel,
    radiusMiles,
    userLat,
    userLon,
    currentMatchCount,
  })

  useEffect(() => {
    setWebsite('')
    setError(null)
    setSuccess(null)
  }, [
    currentMatchCount,
    defaultBusinessType,
    defaultCity,
    defaultCuisine,
    defaultState,
    locationLabel,
    locationQuery,
    radiusMiles,
    userLat,
    userLon,
    searchQuery,
    source,
  ])

  const isNoResultsState = source === NEARBY_NO_RESULTS_WAITLIST_SOURCE
  const heading = isNoResultsState
    ? 'No exact match yet? Save this search.'
    : 'Want an email when this search gets stronger?'
  const description = isNoResultsState
    ? 'We will watch this exact Nearby filter set and email you if more relevant coverage appears.'
    : 'This keeps low-density markets useful without adding a large form or changing how category and location filters work.'

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      try {
        const result = await saveNearbySavedSearchAlert({
          email,
          city: defaultCity,
          state: defaultState,
          businessType: defaultBusinessType,
          cuisine: defaultCuisine,
          searchQuery,
          locationQuery,
          locationLabel,
          radiusMiles,
          userLat,
          userLon,
          currentMatchCount,
          website,
          source,
        })

        if (!result.success) {
          setError(result.error || 'Something went wrong. Please try again.')
          return
        }

        setSuccess(
          `Alert saved for ${email.trim()}. We will email you when more listings match ${result.summaryLabel || filterSummary.summaryLabel}.`
        )
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <div className={`rounded-2xl border border-stone-800/80 bg-stone-950/70 p-5 ${className}`.trim()}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Notify Me
          </p>
          <h3 className="mt-1 text-lg font-semibold text-stone-100">{heading}</h3>
          <p className="mt-2 text-sm leading-relaxed text-stone-400">
            {description} Right now, {currentMatchCount.toLocaleString()} listing
            {currentMatchCount === 1 ? '' : 's'} match this search.
          </p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 px-3 py-2 text-xs text-stone-500">
          {isNoResultsState ? 'Zero-match state' : 'Low-density state'}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(filterSummary.chips.length > 0 ? filterSummary.chips : ['All live Nearby listings']).map(
          (chip) => (
            <span
              key={chip}
              className="rounded-full border border-stone-700/70 bg-stone-900/80 px-3 py-1 text-xs font-medium text-stone-300"
            >
              {chip}
            </span>
          )
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="absolute -z-10 opacity-0 pointer-events-none" aria-hidden="true">
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>

        <Input
          label="Email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          helperText="Used only for Nearby saved-search alerts tied to this filter state."
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-stone-500">
            This saves the current Nearby filters as-is.{' '}
            <Link href="/nearby/unsubscribe" className="underline hover:text-stone-300">
              Unsubscribe anytime
            </Link>
            .
          </p>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Saving alert...' : 'Email me when this improves'}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-emerald-300" role="status" aria-live="polite">
            {success}
          </p>
        )}
      </form>
    </div>
  )
}
