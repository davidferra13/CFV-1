'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  ChefHat,
  GitCompare,
  Gift,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { buildActiveFilterSummaryTokens } from '@/lib/discovery/action-contracts'
import type { PlanningBrief } from '@/lib/hub/types'
import type {
  ConsumerDiscoveryFeed,
  ConsumerDiscoveryFilters,
} from '@/lib/public-consumer/discovery-actions'
import {
  buildDiscoveryRecoveryActions,
  buildLocalFoodIntelligence,
  buildPublicDiscoveryCollections,
  buildPublicProofSignals,
  discoveryBriefFromFilters,
  inferConsumerPlanningState,
  normalizeCompareCandidates,
  OCCASION_PLANNING_TEMPLATES,
} from '@/lib/discovery/consumer-discovery-model'
import type { DiscoveryRuntimePlan } from '@/lib/discovery/discovery-runtime-module'
import type { ActiveFilterSummaryToken } from '@/lib/discovery/action-contracts'
import {
  buildDiscoveryResetPlan,
  buildSmartEmptyResultsRepairActions,
  type EmptyResultsRepairAction,
} from '@/lib/discovery/recovery-contracts'
import { ConsumerIntentFilters } from './consumer-intent-filters'
import { ConsumerResultCard } from './consumer-result-card'

function describeActiveFilters(filters: ConsumerDiscoveryFilters) {
  const parts = [
    filters.intent ? filters.intent.replace(/_/g, ' ') : null,
    filters.location,
    filters.dietary,
    filters.budget,
    filters.partySize ? `${filters.partySize} guests` : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' / ') : 'Browse chefs, menus, and food options'
}

function serviceTypeFromIntent(intent: ConsumerDiscoveryFilters['intent']) {
  if (intent === 'meal_prep') return 'meal_prep'
  if (intent === 'team_dinner' || intent === 'work_lunch') return 'catering'
  if (intent === 'dinner_party' || intent === 'private_chef' || intent === 'weekend')
    return 'dinner_party'
  return ''
}

function buildBookingHref(filters: ConsumerDiscoveryFilters) {
  const params = new URLSearchParams()
  const serviceType = serviceTypeFromIntent(filters.intent)
  const notes = [
    filters.craving ? `Craving: ${filters.craving}` : null,
    filters.location ? `Location: ${filters.location}` : null,
    filters.budget ? `Budget: ${filters.budget}` : null,
    filters.dietary ? `Dietary: ${filters.dietary}` : null,
    filters.eventStyle ? `Style: ${filters.eventStyle}` : null,
    filters.partySize ? `Party size: ${filters.partySize}` : null,
  ].filter(Boolean)

  if (filters.intent) params.set('occasion', filters.intent.replace(/_/g, ' '))
  if (serviceType) params.set('service_type', serviceType)
  if (notes.length > 0) params.set('additional_notes', notes.join('\n'))

  const query = params.toString()
  return query ? `/book?${query}` : '/book'
}

function hrefFromFilters(filters: ConsumerDiscoveryFilters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== false) params.set(key, String(value))
  }
  const query = params.toString()
  return query ? `/eat?${query}` : '/eat'
}

function clearTokenHref(searchParams: ConsumerDiscoveryFilters, token: ActiveFilterSummaryToken) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null && value !== false) params.set(key, String(value))
  }
  for (const key of token.key === 'selected' ? [] : [token.key]) params.delete(key)
  const aliases: Record<string, string[]> = {
    craving: ['craving', 'q'],
    intent: ['intent'],
    fulfillment: ['fulfillment'],
    location: ['location'],
    budget: ['budget', 'priceRange', 'maxBudget'],
    dietary: ['dietary', 'diet'],
    dateWindow: ['dateWindow'],
    partySize: ['partySize'],
    eventStyle: ['eventStyle', 'mood'],
  }
  for (const key of aliases[token.key] ?? []) params.delete(key)
  const query = params.toString()
  return query ? `/eat?${query}` : '/eat'
}

function repairActionHref(action: EmptyResultsRepairAction) {
  return action.nextFilters ? hrefFromFilters(action.nextFilters) : '/eat'
}

export function ConsumerIntentShell({
  feed,
  filters,
  planningBrief,
  runtimePlan,
}: {
  feed: ConsumerDiscoveryFeed
  filters: ConsumerDiscoveryFilters
  planningBrief: PlanningBrief
  runtimePlan?: DiscoveryRuntimePlan
}) {
  const visualMode = Boolean(filters.visualMode)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const discoveryBrief = useMemo(
    () => discoveryBriefFromFilters(filters, planningBrief),
    [filters, planningBrief]
  )
  const planningState = inferConsumerPlanningState({
    filters,
    brief: discoveryBrief,
    compareCount: compareIds.length,
  })
  const collections = useMemo(
    () => buildPublicDiscoveryCollections(filters.location).slice(0, 3),
    [filters.location]
  )
  const localSignals = useMemo(
    () => buildLocalFoodIntelligence(filters.location),
    [filters.location]
  )
  const recoveryActions = useMemo(
    () => buildDiscoveryRecoveryActions(filters, feed.total),
    [feed.total, filters]
  )
  const compareCandidates = useMemo(
    () => normalizeCompareCandidates(feed.results, compareIds, filters, discoveryBrief),
    [compareIds, discoveryBrief, feed.results, filters]
  )
  const activeTokens = useMemo(
    () =>
      buildActiveFilterSummaryTokens({
        filters,
      }),
    [filters]
  )
  const resetPlan = useMemo(
    () =>
      buildDiscoveryResetPlan(
        { scope: 'current_search', source: 'manual_reset' },
        { filters, compareCandidateIds: compareIds }
      ),
    [compareIds, filters]
  )
  const emptyRepairActions = useMemo(
    () =>
      buildSmartEmptyResultsRepairActions({
        filters,
        radiusMiles: null,
        remyAvailable: false,
      }),
    [filters]
  )
  const bookingHref = buildBookingHref(filters)
  const gridClass = visualMode
    ? 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3'
    : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

  function toggleCompare(id: string) {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((candidateId) => candidateId !== id)
      return [...current, id].slice(-4)
    })
  }

  return (
    <div
      className="pb-16"
      data-discovery-privacy={runtimePlan?.privacyMode ?? 'public'}
      data-discovery-handoffs={runtimePlan?.handoffs.join(',') ?? 'rail,shortlist'}
    >
      <section className="relative overflow-hidden border-b border-stone-800/70">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-gradient-to-b from-brand-600/12 via-brand-600/5 to-transparent" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full border border-brand-700/70 bg-stone-900/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
              Food discovery
            </p>
            <h1 className="mt-5 text-4xl font-display tracking-tight text-stone-100 md:text-6xl">
              What should we eat?
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-stone-300 md:text-lg">
              Start with the occasion, craving, or group size. ChefFlow will surface private chefs,
              sample menus, meal prep options, and local food listings without forcing you into the
              booking form first.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-stone-800 bg-stone-950/70 p-4 shadow-[var(--shadow-card)] sm:p-5">
            <ConsumerIntentFilters activeIntent={filters.intent ?? null} visualMode={visualMode} />
          </div>

          {(activeTokens.length > 0 || resetPlan.eligible) && (
            <div className="mt-4 rounded-2xl border border-stone-800 bg-stone-950/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {activeTokens.length > 0 ? (
                    activeTokens.map((token) => (
                      <Link
                        key={`${token.key}-${token.value}`}
                        href={clearTokenHref(filters, token)}
                        className="inline-flex min-h-8 items-center gap-2 rounded-full border border-stone-700 px-3 text-xs text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100"
                      >
                        <span className="text-stone-500">{token.label}</span>
                        {token.value}
                        {token.removable && <X className="h-3 w-3" />}
                      </Link>
                    ))
                  ) : (
                    <span className="text-sm text-stone-500">{resetPlan.reason}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/eat"
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-stone-700 px-3 text-xs font-medium text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
              <Sparkles className="h-4 w-4" />
              Discovery brief
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['State', planningState.replace(/_/g, ' ')],
                ['Occasion', discoveryBrief.occasion ?? 'Open discovery'],
                ['Timing', discoveryBrief.dateWindow ?? discoveryBrief.urgency.replace(/_/g, ' ')],
                [
                  'Party',
                  discoveryBrief.partySize ? `${discoveryBrief.partySize} guests` : 'Flexible',
                ],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-stone-800 bg-stone-950 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-medium capitalize text-stone-200">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
              <MapPin className="h-4 w-4" />
              Local context
            </div>
            <div className="mt-4 space-y-3">
              {localSignals.map((signal) => (
                <div key={signal.label} className="text-sm leading-relaxed">
                  <span className="font-medium text-stone-200">{signal.label}: </span>
                  <span className="text-stone-400">{signal.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              {describeActiveFilters(filters)}
            </p>
            <h2 className="mt-2 text-2xl font-display tracking-tight text-stone-100 md:text-3xl">
              Best matches
            </h2>
          </div>
          <Link
            href={bookingHref}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-700 bg-stone-900 px-4 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800"
          >
            Describe a request
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {feed.results.length > 0 ? (
          <div className={gridClass}>
            {feed.results.map((card) => {
              const selected = compareIds.includes(card.id)
              const proofSignals = buildPublicProofSignals(card).slice(0, 3)
              return (
                <div key={card.id} className="space-y-2">
                  <ConsumerResultCard
                    card={card}
                    visualMode={visualMode}
                    planningBrief={planningBrief}
                  />
                  <div className="rounded-xl border border-stone-800 bg-stone-950 p-3">
                    {proofSignals.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {proofSignals.map((signal) => (
                          <span
                            key={`${card.id}-${signal.label}`}
                            className="inline-flex items-center gap-1 rounded-full border border-stone-700 px-2 py-1 text-[10px] text-stone-400"
                          >
                            <ShieldCheck className="h-3 w-3 text-brand-300" />
                            {signal.value}
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleCompare(card.id)}
                      className={[
                        'inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors',
                        selected
                          ? 'border-brand-500 bg-brand-600/15 text-brand-200'
                          : 'border-stone-700 text-stone-300 hover:border-stone-600 hover:bg-stone-900',
                      ].join(' ')}
                    >
                      <GitCompare className="h-4 w-4" />
                      {selected ? 'In compare' : 'Compare'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-8 text-center">
            <Search className="mx-auto h-8 w-8 text-stone-500" />
            <h3 className="mt-4 text-xl font-semibold text-stone-100">No exact matches yet</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-stone-400">
              Try a broader location or remove one filter. You can still send an open request and
              let matched chefs decide whether they can help.
            </p>
            {emptyRepairActions.length > 0 && (
              <div className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
                {emptyRepairActions.map((action) => (
                  <Link
                    key={action.id}
                    href={repairActionHref(action)}
                    className="rounded-full border border-stone-700 px-3 py-1.5 text-xs text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100"
                    title={action.reason}
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={bookingHref}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
              >
                Send open request
              </Link>
              <Link
                href="/chefs"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-stone-700 px-4 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600"
              >
                Browse chefs
              </Link>
            </div>
          </div>
        )}
      </section>

      {(compareCandidates.length > 0 || collections.length > 0 || recoveryActions.length > 0) && (
        <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-8 sm:px-6 lg:grid-cols-3 lg:px-8">
          {compareCandidates.length > 0 && (
            <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-5 lg:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-stone-100">Compare</h3>
                <button
                  type="button"
                  onClick={() => setCompareIds([])}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-700 text-stone-400 hover:border-stone-600 hover:text-stone-200"
                  aria-label="Clear compare"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {compareCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="rounded-xl border border-stone-800 bg-stone-950 p-4"
                  >
                    <p className="text-sm font-semibold text-stone-100">{candidate.title}</p>
                    <p className="mt-1 text-xs capitalize text-stone-500">
                      {candidate.type.replace(/_/g, ' ')}
                    </p>
                    <div className="mt-3 space-y-1 text-xs text-stone-400">
                      <p>{candidate.locationLabel ?? 'Location not listed'}</p>
                      <p>{candidate.priceLabel ?? 'Price not listed'}</p>
                      <p>{candidate.ratingLabel ?? candidate.availability.label}</p>
                    </div>
                    {candidate.matchReasons.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {candidate.matchReasons.map((reason) => (
                          <span
                            key={`${candidate.id}-${reason.label}`}
                            className="rounded-full bg-stone-900 px-2 py-1 text-[10px] text-stone-300"
                          >
                            {reason.label}
                          </span>
                        ))}
                      </div>
                    )}
                    <Link
                      href={candidate.ctaHref}
                      className="mt-4 inline-flex min-h-9 w-full items-center justify-center rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-500"
                    >
                      {candidate.ctaLabel}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-5">
              <h3 className="text-base font-semibold text-stone-100">Collections</h3>
              <div className="mt-4 space-y-2">
                {collections.map((collection) => (
                  <Link
                    key={collection.slug}
                    href={collection.href}
                    className="block rounded-xl border border-stone-800 bg-stone-950 p-3 text-sm text-stone-300 transition-colors hover:border-stone-700 hover:text-stone-100"
                  >
                    {collection.title}
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-5">
              <h3 className="text-base font-semibold text-stone-100">Templates</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {OCCASION_PLANNING_TEMPLATES.slice(0, 4).map((template) => (
                  <Link
                    key={template.slug}
                    href={template.href}
                    className="rounded-full border border-stone-700 px-3 py-1.5 text-xs text-stone-300 hover:border-stone-600 hover:text-stone-100"
                  >
                    {template.label}
                  </Link>
                ))}
              </div>
            </div>

            {recoveryActions.length > 0 && (
              <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-5">
                <h3 className="text-base font-semibold text-stone-100">Try next</h3>
                <div className="mt-4 space-y-2">
                  {recoveryActions.map((action) => (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="block rounded-xl border border-stone-800 bg-stone-950 p-3 text-sm text-stone-300 transition-colors hover:border-stone-700 hover:text-stone-100"
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/how-it-works"
            className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5 transition-colors hover:border-stone-700 hover:bg-stone-900"
          >
            <CalendarDays className="h-5 w-5 text-brand-300" />
            <h3 className="mt-4 text-base font-semibold text-stone-100">
              How private chef booking works
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-400">
              Practical steps, pricing expectations, and what to prepare before you inquire.
            </p>
          </Link>
          <Link
            href="/chefs"
            className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5 transition-colors hover:border-stone-700 hover:bg-stone-900"
          >
            <ChefHat className="h-5 w-5 text-brand-300" />
            <h3 className="mt-4 text-base font-semibold text-stone-100">Chef directory</h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-400">
              Filter by service type, cuisine, location, price range, and availability.
            </p>
          </Link>
          <Link
            href="/gift-cards"
            className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5 transition-colors hover:border-stone-700 hover:bg-stone-900"
          >
            <Gift className="h-5 w-5 text-brand-300" />
            <h3 className="mt-4 text-base font-semibold text-stone-100">Gift cards</h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-400">
              Browse chef-specific gift card pages and send prepaid chef credit by email.
            </p>
          </Link>
        </div>
      </section>
    </div>
  )
}
