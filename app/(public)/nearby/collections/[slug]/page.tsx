import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/get-user'
import { BreadcrumbJsonLd, JsonLd } from '@/components/seo/json-ld'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'
import { PUBLIC_PRIMARY_CONSUMER_CTA } from '@/lib/public/public-surface-config'
import { getDirectoryListings, getDirectoryStats } from '@/lib/discover/actions'
import {
  buildNearbyCollectionBreadcrumbItems,
  buildNearbyCollectionJsonLd,
  buildNearbyCollectionMetadata,
} from '@/lib/discover/nearby-collection-seo'
import {
  getNearbyCollectionBySlug,
  listNearbyCollections,
  listRelatedNearbyCollections,
  toNearbyCollectionDiscoverFilters,
} from '@/lib/discover/nearby-collections'
import {
  buildNearbyBrowseFallbackActions,
  dedupeNearbyFallbackActions,
  type NearbyFallbackAction,
} from '@/lib/discover/nearby-fallbacks'
import { NearbyFallbackActions } from '../../_components/nearby-fallback-actions'
import { ListingCard } from '../../_components/listing-card'
import { NearbyCollectionCard } from '../../_components/nearby-collection-card'
import type { DirectoryFavoriteMode } from '../../_components/directory-favorite-button'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

type PageProps = {
  params: { slug: string }
  searchParams?: {
    page?: string | string[]
  }
}

type NearbyCollection = NonNullable<ReturnType<typeof getNearbyCollectionBySlug>>

function firstParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function buildCollectionPageHref(collection: NearbyCollection, page: number) {
  return page > 1 ? `${collection.href}?page=${page}` : collection.href
}

function CollectionReadinessNote({
  readiness,
}: {
  readiness: Awaited<ReturnType<typeof getDirectoryListings>>['collectionReadiness']
}) {
  if (!readiness || (readiness.fallbackCount === 0 && readiness.suppressedCount === 0)) {
    return null
  }

  if (readiness.fallbackCount > 0) {
    return (
      <div className="mt-5 rounded-2xl border border-amber-800/40 bg-amber-950/15 p-4">
        <p className="text-sm font-semibold text-stone-100">Sparse-market fallback is active.</p>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-400">
          {readiness.readyCount.toLocaleString()} listing
          {readiness.readyCount === 1 ? '' : 's'} cleared the collection readiness gate, so this
          page backfilled {readiness.fallbackCount.toLocaleString()} next-best card
          {readiness.fallbackCount === 1 ? '' : 's'} to keep the collection useful without opening
          the full raw slice.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-5 rounded-2xl border border-emerald-800/30 bg-emerald-950/15 p-4">
      <p className="text-sm font-semibold text-stone-100">
        This collection is gated to stronger cards.
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-400">
        {readiness.suppressedCount.toLocaleString()} lower-signal match
        {readiness.suppressedCount === 1 ? '' : 'es'} stay out of this curated page. Use raw Nearby
        browse if you want the full market slice.
      </p>
    </div>
  )
}

function Pagination({
  collection,
  page,
  totalPages,
}: {
  collection: NearbyCollection
  page: number
  totalPages: number
}) {
  if (totalPages <= 1) return null

  return (
    <div className="mt-8 flex items-center justify-between">
      <p className="text-xs text-stone-500">
        Page {page.toLocaleString()} of {totalPages.toLocaleString()}
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={buildCollectionPageHref(collection, page - 1)}
            className="rounded-lg border border-stone-700 px-4 py-2 text-xs font-medium text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-800"
          >
            Previous
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={buildCollectionPageHref(collection, page + 1)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  )
}

export function generateStaticParams() {
  return listNearbyCollections().map((collection) => ({
    slug: collection.slug,
  }))
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const collection = getNearbyCollectionBySlug(params.slug)
  if (!collection) {
    return { title: 'Collection Not Found | Nearby' }
  }

  const page = Math.max(1, parseInt(firstParam(searchParams?.page), 10) || 1)
  const result = await getDirectoryListings(toNearbyCollectionDiscoverFilters(collection, 1))

  return buildNearbyCollectionMetadata({
    appUrl: APP_URL,
    collection,
    page,
    resultTotal: result.total,
  })
}

function CollectionCoveragePanel({
  resultTotal,
  fallbackActions,
  showChefMatchCta,
}: {
  resultTotal: number
  fallbackActions: NearbyFallbackAction[]
  showChefMatchCta: boolean
}) {
  const isEmpty = resultTotal === 0
  const isSparse = resultTotal > 0 && resultTotal < 6

  if (!isEmpty && !isSparse) return null

  return (
    <NearbyFallbackActions
      eyebrow={isEmpty ? 'Coverage Growing' : 'Selective Coverage'}
      title={
        isEmpty
          ? 'This collection page is live before the market is dense.'
          : `${resultTotal.toLocaleString()} live match${resultTotal === 1 ? '' : 'es'}, still a focused slice.`
      }
      description={
        isEmpty
          ? showChefMatchCta
            ? 'This collection does not have current browseable private-chef cards yet. Widen geography or category, add the missing chef, or use the chef-booking path for a direct match.'
            : 'The route stays public, shareable, and grounded in a real browse angle even before the underlying directory slice fills in. Widen the browse, add the missing business, or jump into a stronger collection path.'
          : showChefMatchCta
            ? 'This page stays intentional instead of padding the collection with weak filler. Keep the current cards if they help, or widen the browse and switch into booking when you need a direct chef match.'
            : 'This page stays intentional instead of padding the collection with weak filler. Keep the current cards if they help, or widen into the broader browse paths below when you need more options.'
      }
      actions={fallbackActions}
      className="mb-8"
    />
  )
}

export default async function NearbyCollectionDetailPage({ params, searchParams }: PageProps) {
  const collection = getNearbyCollectionBySlug(params.slug)
  if (!collection) {
    notFound()
  }

  const user = await getCurrentUser()
  const favoriteMode: DirectoryFavoriteMode =
    user?.role === 'client' ? 'active' : user ? 'hidden' : 'signin'
  const page = Math.max(1, parseInt(firstParam(searchParams?.page), 10) || 1)
  const [result, stats] = await Promise.all([
    getDirectoryListings(toNearbyCollectionDiscoverFilters(collection, page), {
      includeViewerState: favoriteMode === 'active',
    }),
    getDirectoryStats(),
  ])
  const relatedCollections = listRelatedNearbyCollections(collection.slug, 3)
  const breadcrumbItems = buildNearbyCollectionBreadcrumbItems({ appUrl: APP_URL, collection })
  const showChefMatchCta = collection.filters.businessType === 'private_chef'
  const broadeningActions = buildNearbyBrowseFallbackActions({
    filters: {
      query: collection.filters.query,
      businessType: collection.filters.businessType,
      cuisine: collection.filters.cuisine,
      state: collection.filters.state,
      city: collection.filters.city,
      priceRange: collection.filters.priceRange,
    },
    stats,
  })
  const fallbackActions = dedupeNearbyFallbackActions(
    [
      {
        href: collection.browseHref,
        label: 'Open raw Nearby browse',
        description:
          'See the full market slice for this city/category path without the curated collection gate.',
        variant: 'primary',
      },
      ...broadeningActions,
      {
        href: '/nearby/submit',
        label: 'Add a business',
        description: 'Know the missing operator? Submit it so this collection can get stronger.',
        variant: 'secondary',
      },
      ...(showChefMatchCta
        ? [
            {
              href: PUBLIC_PRIMARY_CONSUMER_CTA.href,
              label: PUBLIC_PRIMARY_CONSUMER_CTA.label,
              description:
                'Use the chef-booking path for a direct private-chef request instead of waiting on thin collection coverage.',
              variant: 'primary' as const,
            },
          ]
        : []),
    ],
    4
  )
  const shouldRenderCollectionJsonLd = page === 1

  return (
    <div className="min-h-screen">
      <BreadcrumbJsonLd items={breadcrumbItems} />
      {shouldRenderCollectionJsonLd && (
        <JsonLd
          data={buildNearbyCollectionJsonLd({
            appUrl: APP_URL,
            collection,
            previewListings: result.listings.slice(0, 12),
            total: result.total,
          })}
        />
      )}

      <section className="border-b border-stone-800/50">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-6 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="mb-4 flex items-center gap-2 text-xs text-stone-500"
          >
            <Link href="/" className="transition-colors hover:text-stone-300">
              Home
            </Link>
            <span>/</span>
            <Link href="/nearby" className="transition-colors hover:text-stone-300">
              Nearby
            </Link>
            <span>/</span>
            <Link href="/nearby/collections" className="transition-colors hover:text-stone-300">
              Collections
            </Link>
            <span>/</span>
            <span className="text-stone-400">{collection.title}</span>
          </nav>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
            {collection.eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-100 md:text-5xl">
            {collection.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-stone-400">
            {collection.description}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-500">
            {collection.intro}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {collection.filterChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-stone-700/70 bg-stone-950/70 px-3 py-1 text-xs font-medium text-stone-300"
              >
                {chip}
              </span>
            ))}
            <span className="rounded-full border border-brand-700/40 bg-brand-950/35 px-3 py-1 text-xs font-semibold text-brand-200">
              {result.total.toLocaleString()} featured card{result.total !== 1 ? 's' : ''}
            </span>
            {result.collectionReadiness &&
              result.collectionReadiness.candidateCount > result.total && (
                <span className="rounded-full border border-stone-700/70 bg-stone-950/70 px-3 py-1 text-xs font-medium text-stone-300">
                  {result.collectionReadiness.candidateCount.toLocaleString()} raw match
                  {result.collectionReadiness.candidateCount === 1 ? '' : 'es'}
                </span>
              )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={collection.browseHref}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Open raw Nearby browse
            </Link>
            <Link
              href="/nearby/collections"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-700 px-4 text-sm font-medium text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100"
            >
              All collections
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-stone-100">Current live matches</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-400">
              This collection sits on top of the existing Nearby directory, but the card list is
              curated through a simple readiness gate before anything is featured here.
            </p>
            <CollectionReadinessNote readiness={result.collectionReadiness} />
          </div>
          <Link
            href="/nearby/submit"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-700 px-4 text-sm font-medium text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100"
          >
            Add a missing business
          </Link>
        </div>

        <CollectionCoveragePanel
          resultTotal={result.total}
          fallbackActions={fallbackActions}
          showChefMatchCta={showChefMatchCta}
        />

        {result.listings.length > 0 && (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {result.listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} favoriteMode={favoriteMode} />
              ))}
            </div>

            <Pagination collection={collection} page={result.page} totalPages={result.totalPages} />
          </>
        )}

        {relatedCollections.length > 0 && (
          <div className="mt-14">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  More Collections
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-stone-100">
                  Keep browsing nearby.
                </h2>
              </div>
              <Link
                href="/nearby/collections"
                className="text-sm font-medium text-stone-400 transition-colors hover:text-stone-200"
              >
                View all
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {relatedCollections.map((relatedCollection, index) => (
                <NearbyCollectionCard
                  key={relatedCollection.slug}
                  collection={relatedCollection}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}

        <PublicSecondaryEntryCluster links={PUBLIC_SECONDARY_ENTRY_CONFIG.nearby} theme="dark" />
      </section>
    </div>
  )
}
