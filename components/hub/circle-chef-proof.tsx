'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { subscribeToHubMessages } from '@/lib/hub/realtime'
import type { HubMessage } from '@/lib/hub/types'
import type { CircleChefProofData } from '@/lib/hub/circle-chef-proof'

const STOPWORDS = new Set([
  'about',
  'after',
  'before',
  'can',
  'chef',
  'course',
  'courses',
  'dinner',
  'event',
  'for',
  'from',
  'have',
  'here',
  'into',
  'just',
  'like',
  'looking',
  'menu',
  'menus',
  'more',
  'need',
  'really',
  'that',
  'them',
  'there',
  'these',
  'this',
  'with',
  'would',
  'your',
])

type IntentTerm = {
  term: string
  label: string
  weight: number
}

type RankedMenu = {
  score: number
  matches: string[]
  menu: CircleChefProofData['menus'][number]
}

type RankedPhoto = {
  score: number
  matches: string[]
  photo: CircleChefProofData['photos'][number]
}

function normalizeWord(word: string): string {
  if (word.length > 4 && word.endsWith('s') && !/(ss|us|is)$/.test(word)) {
    return word.slice(0, -1)
  }

  return word
}

function normalizeText(value: string | null | undefined): string {
  if (!value) return ''

  return value
    .toLowerCase()
    .replace(/[_/]+/g, ' ')
    .replace(/[^a-z0-9\s-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(normalizeWord)
    .join(' ')
    .trim()
}

function addCatalogTerm(
  map: Map<string, IntentTerm>,
  rawValue: string | null | undefined,
  weight: number
) {
  const normalized = normalizeText(rawValue)
  if (!normalized || normalized.length < 3) return

  const existing = map.get(normalized)
  if (!existing || existing.weight < weight) {
    map.set(normalized, {
      term: normalized,
      label: rawValue?.replace(/_/g, ' ').trim() || normalized,
      weight,
    })
  }

  for (const token of normalized.split(' ')) {
    if (token.length < 4 || STOPWORDS.has(token)) continue
    const tokenExisting = map.get(token)
    const tokenWeight = Math.max(1, weight - 3)
    if (!tokenExisting || tokenExisting.weight < tokenWeight) {
      map.set(token, {
        term: token,
        label: token,
        weight: tokenWeight,
      })
    }
  }
}

function buildCatalog(proof: CircleChefProofData): IntentTerm[] {
  const catalog = new Map<string, IntentTerm>()

  for (const menu of proof.menus) {
    addCatalogTerm(catalog, menu.cuisineType, 9)
    addCatalogTerm(catalog, menu.serviceStyle?.replace(/_/g, ' '), 7)
    addCatalogTerm(catalog, menu.name, 5)

    for (const dish of menu.dishes) {
      addCatalogTerm(catalog, dish.name, 4)
      addCatalogTerm(catalog, dish.courseName, 3)

      for (const tag of dish.dietaryTags) {
        addCatalogTerm(catalog, tag, 7)
      }
    }
  }

  for (const photo of proof.photos) {
    addCatalogTerm(catalog, photo.caption, 2)
    addCatalogTerm(catalog, photo.event_occasion, 2)
  }

  return Array.from(catalog.values()).sort((left, right) => right.weight - left.weight)
}

function collectMatchedTerms(input: {
  proof: CircleChefProofData
  groupName: string
  groupDescription: string | null
  recentBodies: string[]
}): IntentTerm[] {
  const contextText = normalizeText(
    [input.groupName, input.groupDescription, ...input.recentBodies].join(' ')
  )

  if (!contextText) return []

  return buildCatalog(input.proof)
    .filter((term) => contextText.includes(term.term))
    .slice(0, 6)
}

function dedupeMatches(matches: string[]): string[] {
  return [...new Set(matches.map((match) => match.trim()).filter(Boolean))]
}

function rankMenus(proof: CircleChefProofData, matchedTerms: IntentTerm[]): RankedMenu[] {
  return proof.menus
    .map((menu) => {
      const searchable = normalizeText(
        [
          menu.name,
          menu.description,
          menu.cuisineType,
          menu.serviceStyle,
          ...menu.dishes.flatMap((dish) => [
            dish.name,
            dish.courseName,
            dish.description,
            ...dish.dietaryTags,
            ...dish.allergenFlags,
          ]),
        ].join(' ')
      )

      const matches = matchedTerms.filter((term) => searchable.includes(term.term))
      const score =
        matches.reduce((sum, term) => sum + term.weight, 0) +
        Math.min(menu.timesUsed ?? 0, 12) * 0.05 +
        menu.dishes.length * 0.02

      return {
        score,
        matches: dedupeMatches(matches.map((match) => match.label)),
        menu,
      }
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      if ((right.menu.timesUsed ?? 0) !== (left.menu.timesUsed ?? 0)) {
        return (right.menu.timesUsed ?? 0) - (left.menu.timesUsed ?? 0)
      }
      return right.menu.dishes.length - left.menu.dishes.length
    })
}

function rankPhotos(proof: CircleChefProofData, matchedTerms: IntentTerm[]): RankedPhoto[] {
  return proof.photos
    .map((photo) => {
      const searchable = normalizeText(
        [photo.caption, photo.event_occasion, photo.photo_type].filter(Boolean).join(' ')
      )
      const matches = matchedTerms.filter((term) => searchable.includes(term.term))
      const photoTypeBoost = photo.photo_type === 'plating' ? 1.5 : photo.photo_type ? 0.5 : 0

      return {
        score: matches.reduce((sum, term) => sum + term.weight, 0) + photoTypeBoost,
        matches: dedupeMatches(matches.map((match) => match.label)),
        photo,
      }
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      return (left.photo.display_order ?? 0) - (right.photo.display_order ?? 0)
    })
}

interface CircleChefProofProps {
  groupId: string
  groupName: string
  groupDescription: string | null
  proof: CircleChefProofData
}

export function CircleChefProof({
  groupId,
  groupName,
  groupDescription,
  proof,
}: CircleChefProofProps) {
  const [mode, setMode] = useState<'focused' | 'all'>('focused')
  const [showAllPhotos, setShowAllPhotos] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({})
  const [recentMessages, setRecentMessages] = useState(proof.recentMessages)
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null)

  useEffect(() => {
    setRecentMessages(proof.recentMessages)
  }, [proof.recentMessages])

  useEffect(() => {
    return subscribeToHubMessages(groupId, (message: HubMessage) => {
      const body = typeof message.body === 'string' ? message.body.trim() : ''
      if (!body || message.message_type === 'system') return

      setRecentMessages((current) =>
        [
          {
            id: message.id,
            body,
            createdAt: message.created_at,
            messageType: message.message_type,
            notificationType: message.notification_type,
          },
          ...current.filter((item) => item.id !== message.id),
        ].slice(0, 24)
      )
    })
  }, [groupId])

  const recentBodies = recentMessages.map((message) => message.body)
  const matchedTerms = collectMatchedTerms({
    proof,
    groupName,
    groupDescription,
    recentBodies,
  })
  const rankedMenus = rankMenus(proof, matchedTerms)
  const rankedPhotos = rankPhotos(proof, matchedTerms)

  const focusedMenus = rankedMenus.filter((item) => item.score > 0)
  const focusedPhotos = rankedPhotos.filter((item) => item.score > 0)
  const visibleMenus =
    mode === 'all'
      ? rankedMenus
      : (focusedMenus.length > 0 ? focusedMenus : rankedMenus).slice(0, 3)
  const photoPool =
    mode === 'all' ? rankedPhotos : focusedPhotos.length > 0 ? focusedPhotos : rankedPhotos
  const visiblePhotos =
    mode === 'all' && !showAllPhotos
      ? photoPool.slice(0, 12)
      : photoPool.slice(0, mode === 'all' ? photoPool.length : 6)

  const hasPricing =
    Boolean(
      proof.pricing.startingPriceLabel ||
      proof.pricing.dinnerRangeLabel ||
      proof.pricing.minimumBookingLabel ||
      proof.pricing.depositLabel
    ) ||
    proof.pricing.includedItems.length > 0 ||
    proof.pricing.dietaryItems.length > 0

  if (!hasPricing && proof.menus.length === 0 && proof.photos.length === 0) {
    return null
  }

  const activePhoto = activePhotoIndex !== null ? visiblePhotos[activePhotoIndex] : null

  return (
    <section className="m-4 rounded-2xl border border-stone-800 bg-stone-900/70 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--hub-primary,#e88f47)]">
            Chef Proof
          </p>
          <h3 className="mt-1 text-base font-semibold text-stone-100">
            Menus, photos, and pricing context from {proof.chefName}
          </h3>
          <p className="mt-1 text-sm text-stone-400">
            Proof stays inside the circle and shifts toward what the conversation is asking for.
          </p>
        </div>

        <div className="inline-flex rounded-full border border-stone-700 bg-stone-950/80 p-1 text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('focused')
              setShowAllPhotos(false)
            }}
            className={`rounded-full px-3 py-1.5 transition-colors ${
              mode === 'focused'
                ? 'bg-[var(--hub-primary,#e88f47)] text-white'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Most relevant
          </button>
          <button
            type="button"
            onClick={() => setMode('all')}
            className={`rounded-full px-3 py-1.5 transition-colors ${
              mode === 'all'
                ? 'bg-[var(--hub-primary,#e88f47)] text-white'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Show everything
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {matchedTerms.length > 0 ? (
          <>
            <span className="rounded-full border border-stone-700 bg-stone-950/80 px-3 py-1 text-xs text-stone-400">
              Emphasizing now
            </span>
            {matchedTerms.slice(0, 4).map((term) => (
              <span
                key={term.term}
                className="rounded-full border border-[var(--hub-primary,#e88f47)]/30 bg-[var(--hub-primary,#e88f47)]/10 px-3 py-1 text-xs font-medium text-stone-100"
              >
                {term.label}
              </span>
            ))}
          </>
        ) : (
          <span className="rounded-full border border-stone-700 bg-stone-950/80 px-3 py-1 text-xs text-stone-400">
            No strong cuisine or menu signal yet, so the broader portfolio stays in view.
          </span>
        )}
      </div>

      {hasPricing && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {proof.pricing.startingPriceLabel && (
            <div className="rounded-2xl border border-stone-800 bg-stone-950/80 p-4">
              <p className="text-xs uppercase tracking-wide text-stone-500">Starting point</p>
              <p className="mt-1 text-sm font-medium text-stone-100">
                {proof.pricing.startingPriceLabel}
              </p>
            </div>
          )}
          {proof.pricing.dinnerRangeLabel && (
            <div className="rounded-2xl border border-stone-800 bg-stone-950/80 p-4">
              <p className="text-xs uppercase tracking-wide text-stone-500">Dinner pricing</p>
              <p className="mt-1 text-sm font-medium text-stone-100">
                {proof.pricing.dinnerRangeLabel}
              </p>
            </div>
          )}
          {proof.pricing.minimumBookingLabel && (
            <div className="rounded-2xl border border-stone-800 bg-stone-950/80 p-4">
              <p className="text-xs uppercase tracking-wide text-stone-500">Minimum booking</p>
              <p className="mt-1 text-sm font-medium text-stone-100">
                {proof.pricing.minimumBookingLabel}
              </p>
            </div>
          )}
          {proof.pricing.depositLabel && (
            <div className="rounded-2xl border border-stone-800 bg-stone-950/80 p-4">
              <p className="text-xs uppercase tracking-wide text-stone-500">Deposit</p>
              <p className="mt-1 text-sm font-medium text-stone-100">
                {proof.pricing.depositLabel}
              </p>
            </div>
          )}
        </div>
      )}

      {(proof.pricing.includedItems.length > 0 || proof.pricing.dietaryItems.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {proof.pricing.includedItems.map((item) => (
            <span
              key={item}
              className="rounded-full border border-stone-700 bg-stone-950/80 px-3 py-1 text-xs text-stone-300"
            >
              {item}
            </span>
          ))}
          {proof.pricing.dietaryItems.map((item) => (
            <span
              key={item}
              className="rounded-full border border-emerald-800/50 bg-emerald-950/30 px-3 py-1 text-xs text-emerald-200"
            >
              {item}
            </span>
          ))}
        </div>
      )}

      {proof.menus.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-stone-100">Sample menus</h4>
              <p className="text-xs text-stone-500">
                {proof.menus.length} published showcase menu{proof.menus.length === 1 ? '' : 's'}
              </p>
            </div>
            {mode === 'focused' && proof.menus.length > visibleMenus.length && (
              <button
                type="button"
                onClick={() => setMode('all')}
                className="text-xs font-medium text-[var(--hub-primary,#e88f47)] hover:text-[var(--hub-primary,#e88f47)]/80"
              >
                See all menus
              </button>
            )}
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {visibleMenus.map(({ menu, matches }) => {
              const isExpanded = Boolean(expandedMenus[menu.id])
              const visibleDishes = isExpanded ? menu.dishes : menu.dishes.slice(0, 3)

              return (
                <div
                  key={menu.id}
                  className="rounded-2xl border border-stone-800 bg-stone-950/80 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h5 className="text-sm font-semibold text-stone-100">{menu.name}</h5>
                      {menu.description && (
                        <p className="mt-1 text-xs leading-relaxed text-stone-400">
                          {menu.description}
                        </p>
                      )}
                    </div>
                    {(menu.timesUsed ?? 0) > 0 && (
                      <span className="rounded-full border border-stone-700 bg-stone-900 px-2.5 py-1 text-[11px] text-stone-300">
                        {menu.timesUsed} uses
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {menu.cuisineType && (
                      <span className="rounded-full border border-stone-700 bg-stone-900 px-2.5 py-1 text-[11px] text-stone-300">
                        {menu.cuisineType}
                      </span>
                    )}
                    {menu.serviceStyle && (
                      <span className="rounded-full border border-stone-700 bg-stone-900 px-2.5 py-1 text-[11px] text-stone-300">
                        {menu.serviceStyle.replace(/_/g, ' ')}
                      </span>
                    )}
                    {menu.guestCount && (
                      <span className="rounded-full border border-stone-700 bg-stone-900 px-2.5 py-1 text-[11px] text-stone-300">
                        {menu.guestCount} guests
                      </span>
                    )}
                  </div>

                  {matches.length > 0 && (
                    <p className="mt-3 text-xs text-[var(--hub-primary,#e88f47)]">
                      Matching now: {matches.slice(0, 3).join(', ')}
                    </p>
                  )}

                  <div className="mt-3 space-y-2">
                    {visibleDishes.map((dish) => (
                      <div
                        key={dish.id}
                        className="rounded-xl border border-stone-800 bg-stone-900/60 p-3"
                      >
                        <p className="text-[11px] uppercase tracking-wide text-stone-500">
                          Course {dish.courseNumber}
                        </p>
                        <p className="mt-1 text-sm font-medium text-stone-100">{dish.courseName}</p>
                        {dish.name !== dish.courseName && (
                          <p className="mt-1 text-xs text-stone-400">{dish.name}</p>
                        )}
                        {dish.description && (
                          <p className="mt-2 text-xs leading-relaxed text-stone-400">
                            {dish.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {menu.dishes.length > 3 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedMenus((current) => ({
                          ...current,
                          [menu.id]: !current[menu.id],
                        }))
                      }
                      className="mt-3 text-xs font-medium text-[var(--hub-primary,#e88f47)] hover:text-[var(--hub-primary,#e88f47)]/80"
                    >
                      {isExpanded ? 'Show fewer courses' : `Show all ${menu.dishes.length} courses`}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {proof.photos.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-stone-100">Gallery</h4>
              <p className="text-xs text-stone-500">
                {proof.photos.length} public portfolio photo{proof.photos.length === 1 ? '' : 's'}
              </p>
            </div>
            {mode === 'all' && proof.photos.length > visiblePhotos.length && (
              <button
                type="button"
                onClick={() => setShowAllPhotos(true)}
                className="text-xs font-medium text-[var(--hub-primary,#e88f47)] hover:text-[var(--hub-primary,#e88f47)]/80"
              >
                Show all photos
              </button>
            )}
            {mode === 'focused' && proof.photos.length > visiblePhotos.length && (
              <button
                type="button"
                onClick={() => setMode('all')}
                className="text-xs font-medium text-[var(--hub-primary,#e88f47)] hover:text-[var(--hub-primary,#e88f47)]/80"
              >
                Open full gallery
              </button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visiblePhotos.map(({ photo, matches }, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setActivePhotoIndex(index)}
                className="group relative overflow-hidden rounded-2xl border border-stone-800 bg-stone-950 text-left"
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={photo.signedUrl}
                    alt={photo.caption ?? 'Chef portfolio photo'}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-3">
                  {matches.length > 0 && (
                    <p className="text-[11px] font-medium text-[var(--hub-primary,#e88f47)]">
                      {matches[0]}
                    </p>
                  )}
                  <p className="mt-1 line-clamp-2 text-xs text-stone-100">
                    {photo.caption || photo.event_occasion || 'Published gallery image'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {activePhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setActivePhotoIndex(null)}
        >
          <button
            type="button"
            onClick={() => setActivePhotoIndex(null)}
            className="absolute right-4 top-4 rounded-full bg-black/40 p-2 text-stone-200"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {visiblePhotos.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setActivePhotoIndex((current) =>
                  current === null ? 0 : (current - 1 + visiblePhotos.length) % visiblePhotos.length
                )
              }}
              className="absolute left-4 rounded-full bg-black/40 p-3 text-stone-200"
            >
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <div
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-stone-800 bg-stone-950"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative aspect-[4/3] w-full bg-black">
              <Image
                src={activePhoto.photo.signedUrl}
                alt={activePhoto.photo.caption ?? 'Chef portfolio photo'}
                fill
                sizes="90vw"
                className="object-contain"
              />
            </div>
            <div className="space-y-2 p-4">
              <p className="text-sm font-medium text-stone-100">
                {activePhoto.photo.caption || 'Published gallery image'}
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-stone-400">
                {activePhoto.photo.event_occasion && (
                  <span className="rounded-full border border-stone-700 bg-stone-900 px-3 py-1">
                    {activePhoto.photo.event_occasion}
                  </span>
                )}
                {activePhoto.photo.photo_type && (
                  <span className="rounded-full border border-stone-700 bg-stone-900 px-3 py-1">
                    {activePhoto.photo.photo_type}
                  </span>
                )}
                {activePhoto.matches.map((match) => (
                  <span
                    key={`${activePhoto.photo.id}-${match}`}
                    className="rounded-full border border-[var(--hub-primary,#e88f47)]/30 bg-[var(--hub-primary,#e88f47)]/10 px-3 py-1 text-stone-100"
                  >
                    {match}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {visiblePhotos.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setActivePhotoIndex((current) =>
                  current === null ? 0 : (current + 1) % visiblePhotos.length
                )
              }}
              className="absolute right-4 rounded-full bg-black/40 p-3 text-stone-200"
            >
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </section>
  )
}
