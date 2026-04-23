import type { Metadata } from 'next'
import Link from 'next/link'
import { BreadcrumbJsonLd, JsonLd } from '@/components/seo/json-ld'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'
import { buildNearbyCollectionsIndexMetadata } from '@/lib/discover/nearby-collection-seo'
import { listNearbyCollections } from '@/lib/discover/nearby-collections'
import { NearbyCollectionCard } from '../_components/nearby-collection-card'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
export const metadata: Metadata = buildNearbyCollectionsIndexMetadata({ appUrl: APP_URL })

function buildCollectionsJsonLd() {
  const collections = listNearbyCollections()

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Nearby Collections',
    description:
      'Curated city and category browse paths built on top of the Nearby directory.',
    url: `${APP_URL}/nearby/collections`,
    mainEntity: {
      '@type': 'ItemList',
      itemListOrder: 'https://schema.org/ItemListUnordered',
      numberOfItems: collections.length,
      itemListElement: collections.map((collection, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${APP_URL}${collection.href}`,
        name: collection.title,
      })),
    },
  }
}

export default function NearbyCollectionsPage() {
  const collections = listNearbyCollections()

  return (
    <div className="min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: APP_URL },
          { name: 'Nearby', url: `${APP_URL}/nearby` },
          { name: 'Collections', url: `${APP_URL}/nearby/collections` },
        ]}
      />
      <JsonLd data={buildCollectionsJsonLd()} />

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
            <span className="text-stone-400">Collections</span>
          </nav>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
            Curated Collections
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-100 md:text-5xl">
            Browse Nearby through tighter destination-style paths.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-stone-400">
            Each collection combines a city and category angle so visitors can jump into a more
            intentional browse without losing the live Nearby inventory underneath. Thin markets
            still hand off to broader browse paths instead of dead-end empty states.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/nearby"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Back to Nearby
            </Link>
            <Link
              href="/nearby/submit"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-700 px-4 text-sm font-medium text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100"
            >
              Add a business
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection, index) => (
            <NearbyCollectionCard key={collection.slug} collection={collection} index={index} />
          ))}
        </div>

        <PublicSecondaryEntryCluster links={PUBLIC_SECONDARY_ENTRY_CONFIG.nearby} theme="dark" />
      </section>
    </div>
  )
}
