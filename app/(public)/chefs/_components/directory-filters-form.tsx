'use client'

import Link from 'next/link'
import type { FormEvent } from 'react'
import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'

type SortMode = 'featured' | 'alpha' | 'partners'

type FacetOption = {
  value: string
  label: string
  count: number
}

type DirectoryFiltersFormProps = {
  query: string
  stateFilter: string
  partnerTypeFilter: string
  sortMode: SortMode
  maxQueryLength: number
  stateOptions: FacetOption[]
  partnerTypeOptions: FacetOption[]
}

export function DirectoryFiltersForm({
  query,
  stateFilter,
  partnerTypeFilter,
  sortMode,
  maxQueryLength,
  stateOptions,
  partnerTypeOptions,
}: DirectoryFiltersFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget
    const formData = new FormData(form)
    const nextQuery = `${formData.get('q') || ''}`.trim()
    const nextState = `${formData.get('state') || ''}`.trim()
    const nextPartnerType = `${formData.get('partnerType') || ''}`.trim()
    const nextSort = `${formData.get('sort') || 'featured'}`.trim()

    trackEvent(ANALYTICS_EVENTS.SEARCH_PERFORMED, {
      search_area: 'chef_directory',
      query_length: nextQuery.length,
      has_state_filter: Boolean(nextState),
      has_partner_type_filter: Boolean(nextPartnerType),
      sort_mode: nextSort || 'featured',
    })

    trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
      feature: 'chef_directory_filters_applied',
      query_length: nextQuery.length,
      state_filter: nextState || 'none',
      partner_type_filter: nextPartnerType || 'none',
      sort_mode: nextSort || 'featured',
    })
  }

  const handleResetClick = () => {
    trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
      feature: 'chef_directory_filters_reset',
    })
  }

  return (
    <form
      action="/chefs"
      method="get"
      onSubmit={handleSubmit}
      className="grid gap-3 md:grid-cols-4"
    >
      <label className="md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Search chefs
        </span>
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Name, cuisine style, city, venue"
          maxLength={maxQueryLength}
          className="mt-1 block w-full rounded-xl border border-stone-600 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </label>

      <label>
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">State</span>
        <select
          name="state"
          defaultValue={stateFilter}
          className="mt-1 block w-full rounded-xl border border-stone-600 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All states</option>
          {stateOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} ({option.count})
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Partner type
        </span>
        <select
          name="partnerType"
          defaultValue={partnerTypeFilter}
          className="mt-1 block w-full rounded-xl border border-stone-600 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">Any partner type</option>
          {partnerTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} ({option.count})
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Sort</span>
        <select
          name="sort"
          defaultValue={sortMode}
          className="mt-1 block w-full rounded-xl border border-stone-600 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="featured">Featured first</option>
          <option value="partners">Most partner venues</option>
          <option value="alpha">Name A-Z</option>
        </select>
      </label>

      <div className="flex items-center gap-3 md:col-span-4">
        <button
          type="submit"
          className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Apply filters
        </button>
        <Link
          href="/chefs"
          onClick={handleResetClick}
          className="rounded-xl border border-stone-600 px-4 py-2.5 text-sm font-medium text-stone-300 transition-colors hover:border-stone-500 hover:text-stone-100"
        >
          Reset
        </Link>
      </div>
    </form>
  )
}
