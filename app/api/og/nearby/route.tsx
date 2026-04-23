import { ImageResponse } from 'next/og'
import {
  buildNearbyBrowseSeoBase,
  type NearbyBrowseSearchParams,
} from '@/lib/discover/nearby-browse-seo'
import {
  getNearbyCollectionBySlug,
  listFeaturedNearbyCollections,
} from '@/lib/discover/nearby-collections'
import { NEUTRAL_NEARBY_OG_LOCATION_TOKENS } from '@/lib/site/national-brand-copy'

export const runtime = 'edge'

const DEFAULT_TYPES = ['Restaurants', 'Bakeries', 'Caterers', 'Food trucks']
const COLLECTION_INDEX_CHIPS = ['Curated pages', 'City + type', 'Cuisine paths', 'Shareable routes']

export type NearbyOgSnapshot = {
  chips: string[]
  detail: string
  entries: string[]
  eyebrow: string
  subtitle: string
  title: string
}

function subtitleForState(base: ReturnType<typeof buildNearbyBrowseSeoBase>) {
  if (base.isLanding) {
    return 'Browse food operators before you search.'
  }

  if (base.locationLabel) {
    return base.locationLabel
  }

  return 'Browse live directory listings on ChefFlow.'
}

function detailForState(base: ReturnType<typeof buildNearbyBrowseSeoBase>) {
  if (base.isLanding) {
    return 'Curated guides, browse hubs, and live listings in one public landing page.'
  }

  if (base.hasUnsupportedFilters) {
    return 'Canonical nearby browse states focus on clean city, state, cuisine, and category filters.'
  }

  return 'City, state, cuisine, and category entry points across the Nearby directory.'
}

export function buildNearbyOgSnapshot(
  searchParamsInput: URLSearchParams | NearbyBrowseSearchParams
): NearbyOgSnapshot {
  const searchParams =
    searchParamsInput instanceof URLSearchParams
      ? searchParamsInput
      : new URLSearchParams(
          Object.entries(searchParamsInput).flatMap(([key, value]) => {
            if (Array.isArray(value)) {
              return value.map((entry) => [key, entry])
            }
            return value ? [[key, value]] : []
          })
        )
  const collectionSlug = searchParams.get('collection')
  const view = searchParams.get('view')
  const collection = collectionSlug ? getNearbyCollectionBySlug(collectionSlug) : null
  const base = buildNearbyBrowseSeoBase(
    Object.fromEntries(searchParams.entries()) as NearbyBrowseSearchParams
  )
  const featuredCollections = listFeaturedNearbyCollections(3)
  const isCollectionsIndex = view === 'collections'
  const chips = collection
    ? collection.filterChips.length > 0
      ? collection.filterChips
      : DEFAULT_TYPES
    : isCollectionsIndex
      ? COLLECTION_INDEX_CHIPS
      : base.chips.length > 0
        ? base.chips
        : DEFAULT_TYPES
  const title = collection
    ? collection.title
    : isCollectionsIndex
      ? 'Nearby Collections'
      : base.isLanding
        ? 'Nearby'
        : base.businessTypeCollectionLabel && base.cuisineLabel
          ? `${base.cuisineLabel} ${base.businessTypeCollectionLabel}`
          : base.businessTypeCollectionLabel || base.cuisineLabel || 'Nearby'
  const subtitle = collection
    ? collection.locationLabel || collection.eyebrow
    : isCollectionsIndex
      ? 'Curated city and category browse paths.'
      : subtitleForState(base)
  const detail = collection
    ? collection.description
    : isCollectionsIndex
      ? 'Dedicated public collection pages on top of the live Nearby directory.'
      : detailForState(base)
  const eyebrow = collection
    ? 'Collection page'
    : isCollectionsIndex
      ? 'Collection index'
      : base.isLanding
        ? 'Browse live clusters'
        : 'Filtered browse state'
  const entries = collection
    ? chips.slice(0, 3)
    : isCollectionsIndex
      ? featuredCollections.map((item) => item.title).slice(0, 3)
      : base.isLanding
        ? NEUTRAL_NEARBY_OG_LOCATION_TOKENS
        : chips.slice(0, 3)

  return {
    chips,
    detail,
    entries,
    eyebrow,
    subtitle,
    title,
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const snapshot = buildNearbyOgSnapshot(searchParams)
  const titleSize = snapshot.title.length > 48 ? 48 : snapshot.title.length > 28 ? 58 : 72
  const subtitleSize = snapshot.subtitle.length > 36 ? 22 : snapshot.subtitle.length > 28 ? 24 : 28

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        background:
          'radial-gradient(circle at top left, rgba(232,143,71,0.28), transparent 38%), linear-gradient(135deg, #14110f 0%, #1f1916 52%, #120f0d 100%)',
        color: '#fafaf9',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 80% 20%, rgba(245, 158, 11, 0.16), transparent 22%), radial-gradient(circle at 88% 78%, rgba(217, 119, 6, 0.14), transparent 24%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '8px',
          background: 'linear-gradient(90deg, #f6b26b 0%, #e88f47 48%, #c96c2a 100%)',
        }}
      />

      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          padding: '54px 56px 46px',
          gap: '28px',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f6b26b 0%, #d47530 100%)',
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: 700,
                }}
              >
                CF
              </div>
              <div
                style={{
                  display: 'flex',
                  padding: '7px 12px',
                  borderRadius: '999px',
                  border: '1px solid rgba(245, 158, 11, 0.24)',
                  background: 'rgba(251, 191, 36, 0.08)',
                  color: '#fdba74',
                  fontSize: '14px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                ChefFlow Directory
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: titleSize,
                  lineHeight: 1,
                  fontWeight: 800,
                  letterSpacing: '-0.04em',
                  maxWidth: '580px',
                }}
              >
                {snapshot.title}
              </div>
              <div
                style={{
                  display: 'flex',
                  maxWidth: '560px',
                  fontSize: subtitleSize,
                  lineHeight: 1.25,
                  color: '#d6d3d1',
                  fontWeight: 500,
                }}
              >
                {snapshot.subtitle}
              </div>
              <div
                style={{
                  display: 'flex',
                  maxWidth: '560px',
                  fontSize: '20px',
                  lineHeight: 1.5,
                  color: '#a8a29e',
                }}
              >
                {snapshot.detail}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', maxWidth: '580px' }}>
            {snapshot.chips.map((chip) => (
              <div
                key={chip}
                style={{
                  display: 'flex',
                  padding: '10px 16px',
                  borderRadius: '999px',
                  background: 'rgba(28, 25, 23, 0.78)',
                  border: '1px solid rgba(120, 113, 108, 0.45)',
                  color: '#f5f5f4',
                  fontSize: '16px',
                  fontWeight: 600,
                }}
              >
                {chip}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            width: '386px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '22px',
              borderRadius: '30px',
              background: 'rgba(28, 25, 23, 0.78)',
              border: '1px solid rgba(120, 113, 108, 0.3)',
              boxShadow: '0 18px 40px rgba(0, 0, 0, 0.24)',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#f6b26b',
              }}
            >
              {snapshot.eyebrow}
            </div>

            {snapshot.entries.map((entry, index) => (
              <div
                key={entry}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  padding: '16px',
                  borderRadius: '22px',
                  background:
                    index === 0
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1))'
                      : 'rgba(41, 37, 36, 0.92)',
                  border: '1px solid rgba(120, 113, 108, 0.32)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: '22px',
                      fontWeight: 700,
                      color: '#fafaf9',
                    }}
                  >
                    {entry}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: '14px',
                      color: '#a8a29e',
                    }}
                  >
                    {snapshot.eyebrow === 'Collection page'
                      ? index === 0
                        ? 'Collection filters and browse scope'
                        : 'Shared in metadata, OG, and Twitter output'
                      : snapshot.eyebrow === 'Collection index'
                        ? index === 0
                          ? 'Dedicated routes for curated browse paths'
                          : 'Public, shareable, and crawlable collection pages'
                        : snapshot.eyebrow === 'Browse live clusters'
                          ? 'Category, city, and cuisine entry points'
                          : index === 0
                            ? 'Canonical city, state, type, or cuisine state'
                            : 'Shared in metadata, OG, and Twitter output'}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '58px',
                    height: '58px',
                    borderRadius: '18px',
                    background:
                      index === 0
                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.88), rgba(217, 119, 6, 0.72))'
                        : 'linear-gradient(135deg, rgba(68, 64, 60, 0.96), rgba(41, 37, 36, 0.96))',
                    color: '#fff',
                    fontSize: '24px',
                    fontWeight: 700,
                  }}
                >
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    }
  )
}
