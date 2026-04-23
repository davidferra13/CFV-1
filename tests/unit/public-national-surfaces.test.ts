import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { metadata as bookMetadata } from '../../app/(public)/book/page'
import { BookDinnerForm } from '../../app/(public)/book/_components/book-dinner-form'
import { buildNearbyStaticOgSnapshot } from '../../app/(public)/nearby/opengraph-image'
import { buildNearbyOgSnapshot } from '../../app/api/og/nearby/route'
import {
  NEUTRAL_LOCATION_PLACEHOLDER,
  NEUTRAL_NEARBY_OG_LOCATION_TOKENS,
} from '../../lib/site/national-brand-copy'

const CITY_EXAMPLE_PATTERN =
  /\b(?:atlanta|austin|boston|brooklyn|chicago|dallas|denver|houston|los angeles|miami|napa(?: valley)?|new york(?: city)?|palm beach|phoenix|portland|san diego|san francisco|santa barbara|scottsdale|seattle)\b/i

function flattenMetadataText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(flattenMetadataText).join(' ')
  if (!value || typeof value !== 'object') return ''
  return Object.values(value as Record<string, unknown>)
    .map(flattenMetadataText)
    .join(' ')
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

test('book-route metadata stays neutral and ships social images', () => {
  const snapshots = [['book', bookMetadata]] as const

  for (const [label, metadata] of snapshots) {
    const flattened = flattenMetadataText(metadata)
    assert.doesNotMatch(
      flattened,
      CITY_EXAMPLE_PATTERN,
      `${label} metadata drifted into city-example copy`
    )
    assert.ok(metadata.alternates?.canonical, `${label} is missing a canonical URL`)
    assert.ok(metadata.openGraph?.images?.length, `${label} is missing og:image output`)
    assert.ok(metadata.twitter?.images?.length, `${label} is missing twitter:image output`)
  }
})

test('book form renders shared neutral location guidance', () => {
  const bookHtml = renderToStaticMarkup(React.createElement(BookDinnerForm))

  assert.match(bookHtml, new RegExp(escapeRegExp('City, state birthday dinner for 8')))
  assert.match(bookHtml, new RegExp(escapeRegExp(NEUTRAL_LOCATION_PLACEHOLDER)))
  assert.doesNotMatch(bookHtml, CITY_EXAMPLE_PATTERN)
})

test('nearby OG snapshots stay neutral on landing surfaces', () => {
  const staticSnapshot = buildNearbyStaticOgSnapshot()
  const dynamicSnapshot = buildNearbyOgSnapshot(new URLSearchParams())

  assert.deepEqual(staticSnapshot.entries, NEUTRAL_NEARBY_OG_LOCATION_TOKENS)
  assert.deepEqual(dynamicSnapshot.entries, NEUTRAL_NEARBY_OG_LOCATION_TOKENS)
  assert.equal(dynamicSnapshot.title, 'Nearby')
  assert.equal(dynamicSnapshot.eyebrow, 'Browse live clusters')
  assert.doesNotMatch(
    [
      staticSnapshot.title,
      staticSnapshot.subtitle,
      staticSnapshot.detail,
      ...staticSnapshot.entries,
    ].join(' '),
    CITY_EXAMPLE_PATTERN
  )
  assert.doesNotMatch(
    [
      dynamicSnapshot.title,
      dynamicSnapshot.subtitle,
      dynamicSnapshot.detail,
      ...dynamicSnapshot.entries,
    ].join(' '),
    CITY_EXAMPLE_PATTERN
  )
})
