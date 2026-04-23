import type { Metadata } from 'next'
import type { DirectoryListingSummary } from './actions'
import { getBusinessTypeCollectionLabel, getCuisineLabel, getStateName } from './constants'
import type { NearbyCollectionViewModel } from './nearby-collections'

const COLLECTIONS_INDEX_TITLE = 'Nearby Collections | Curated City and Category Browse Paths'
const COLLECTIONS_INDEX_DESCRIPTION =
  'Browse curated Nearby collections that combine city and category filters into destination-style food discovery pages.'

function buildNearbyCollectionOgImageUrl(appUrl: string, params?: URLSearchParams) {
  const queryString = params?.toString()
  return queryString ? `${appUrl}/api/og/nearby?${queryString}` : `${appUrl}/api/og/nearby`
}

function buildCollectionSubjectPhrase(collection: NearbyCollectionViewModel) {
  const businessTypeLabel = collection.filters.businessType
    ? getBusinessTypeCollectionLabel(collection.filters.businessType).toLowerCase()
    : null
  const cuisineLabel = collection.filters.cuisine
    ? getCuisineLabel(collection.filters.cuisine).toLowerCase()
    : null
  const stateName = collection.filters.state ? getStateName(collection.filters.state) : null
  const locationLabel =
    collection.locationLabel ??
    (([collection.filters.city, stateName].filter(Boolean).join(', ') || null) as string | null)

  if (businessTypeLabel && cuisineLabel) {
    return locationLabel
      ? `${cuisineLabel} ${businessTypeLabel} in ${locationLabel}`
      : `${cuisineLabel} ${businessTypeLabel}`
  }

  if (businessTypeLabel) {
    return locationLabel ? `${businessTypeLabel} in ${locationLabel}` : businessTypeLabel
  }

  if (cuisineLabel) {
    return locationLabel ? `${cuisineLabel} in ${locationLabel}` : cuisineLabel
  }

  if (locationLabel) {
    return `food businesses in ${locationLabel}`
  }

  return collection.title.toLowerCase()
}

function buildCollectionDescription(
  collection: NearbyCollectionViewModel,
  resultTotal?: number | null
) {
  if (typeof resultTotal !== 'number') {
    return collection.description
  }

  const subjectPhrase = buildCollectionSubjectPhrase(collection)

  if (resultTotal === 0) {
    return `Explore ${subjectPhrase} on ChefFlow's Nearby directory. This collection stays live and shareable even while coverage is still growing, with direct paths into broader browse routes.`
  }

  if (resultTotal < 6) {
    return `Browse ${resultTotal.toLocaleString()} live ${subjectPhrase} on ChefFlow's Nearby directory, then widen into broader Nearby browse paths if you need more options.`
  }

  return `Browse ${resultTotal.toLocaleString()} live ${subjectPhrase} on ChefFlow's Nearby directory. Review current listings, menus, websites, and contact details from one curated collection page.`
}

export function buildNearbyCollectionsIndexMetadata({ appUrl }: { appUrl: string }): Metadata {
  const socialImageUrl = buildNearbyCollectionOgImageUrl(
    appUrl,
    new URLSearchParams({ view: 'collections' })
  )

  return {
    title: COLLECTIONS_INDEX_TITLE,
    description: COLLECTIONS_INDEX_DESCRIPTION,
    alternates: {
      canonical: `${appUrl}/nearby/collections`,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: COLLECTIONS_INDEX_TITLE,
      description: 'Destination-style collection pages on top of the Nearby food directory.',
      url: `${appUrl}/nearby/collections`,
      siteName: 'ChefFlow',
      type: 'website',
      images: [
        {
          url: socialImageUrl,
          width: 1200,
          height: 630,
          alt: 'Nearby curated collections',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: COLLECTIONS_INDEX_TITLE,
      description: 'Browse curated category-plus-city collection pages built on top of Nearby.',
      images: [socialImageUrl],
    },
  }
}

export function buildNearbyCollectionMetadata({
  appUrl,
  collection,
  page = 1,
  resultTotal,
}: {
  appUrl: string
  collection: NearbyCollectionViewModel
  page?: number
  resultTotal?: number | null
}): Metadata {
  const canonicalUrl = `${appUrl}${collection.href}`
  const description = buildCollectionDescription(collection, resultTotal)
  const socialImageUrl = buildNearbyCollectionOgImageUrl(
    appUrl,
    new URLSearchParams({ collection: collection.slug })
  )
  const shouldIndex = page === 1
  const pageTitle =
    page > 1
      ? `${collection.title} | Nearby Collections | Page ${page}`
      : `${collection.title} | Nearby Collections`

  return {
    title: pageTitle,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: shouldIndex,
      follow: true,
    },
    openGraph: {
      title: `${collection.title} | Nearby Collections`,
      description,
      url: canonicalUrl,
      siteName: 'ChefFlow',
      type: 'website',
      images: [
        {
          url: socialImageUrl,
          width: 1200,
          height: 630,
          alt: collection.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${collection.title} | Nearby Collections`,
      description,
      images: [socialImageUrl],
    },
  }
}

export function buildNearbyCollectionBreadcrumbItems({
  appUrl,
  collection,
}: {
  appUrl: string
  collection: NearbyCollectionViewModel
}) {
  return [
    { name: 'Home', url: appUrl },
    { name: 'Nearby', url: `${appUrl}/nearby` },
    { name: 'Collections', url: `${appUrl}/nearby/collections` },
    { name: collection.title, url: `${appUrl}${collection.href}` },
  ]
}

export function buildNearbyCollectionJsonLd({
  appUrl,
  collection,
  previewListings,
  total,
}: {
  appUrl: string
  collection: NearbyCollectionViewModel
  previewListings: DirectoryListingSummary[]
  total: number
}) {
  const stateName = collection.filters.state ? getStateName(collection.filters.state) : null
  const businessTypeLabel = collection.filters.businessType
    ? getBusinessTypeCollectionLabel(collection.filters.businessType)
    : null
  const cuisineLabel = collection.filters.cuisine
    ? getCuisineLabel(collection.filters.cuisine)
    : null
  const about = [
    collection.locationLabel
      ? {
          '@type': 'Place',
          name: collection.locationLabel,
        }
      : null,
    stateName && stateName !== collection.locationLabel
      ? {
          '@type': 'Place',
          name: stateName,
        }
      : null,
    businessTypeLabel
      ? {
          '@type': 'Thing',
          name: businessTypeLabel,
        }
      : null,
    cuisineLabel
      ? {
          '@type': 'Thing',
          name: cuisineLabel,
        }
      : null,
  ].filter(Boolean)

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: collection.title,
    description: buildCollectionDescription(collection, total),
    url: `${appUrl}${collection.href}`,
    isPartOf: {
      '@type': 'CollectionPage',
      name: 'Nearby Collections',
      url: `${appUrl}/nearby/collections`,
    },
  }

  if (about.length > 0) {
    data.about = about
  }

  if (previewListings.length > 0) {
    data.mainEntity = {
      '@type': 'ItemList',
      itemListOrder: 'https://schema.org/ItemListUnordered',
      numberOfItems: total,
      itemListElement: previewListings.map((listing, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${appUrl}/nearby/${listing.slug}`,
        name: listing.name,
      })),
    }
  }

  return data
}
