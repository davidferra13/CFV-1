import test from 'node:test'
import assert from 'node:assert/strict'
import type { PublicMediaAsset } from '@/lib/public-assets/types'
import {
  DEFAULT_PUBLIC_MEDIA_APPROVAL_STATUS,
  finalizePublicMediaSearchResult,
  resolvePublicMediaApprovalStatus,
} from '@/lib/public-assets/catalog'

function buildAsset(
  overrides: Partial<PublicMediaAsset> = {}
): PublicMediaAsset {
  return {
    id: null,
    lookupKey: 'media:unsplash:asset-1',
    searchQuery: 'tomato soup',
    title: 'Tomato soup',
    altText: 'Tomato soup in a bowl',
    source: 'unsplash',
    sourceLabel: 'Unsplash',
    sourceRecordId: 'asset-1',
    providerName: 'Unsplash',
    providerUrl: 'https://unsplash.com',
    assetUrl: 'https://images.example.com/tomato-soup.jpg',
    thumbnailUrl: 'https://images.example.com/tomato-soup-thumb.jpg',
    landingUrl: 'https://unsplash.com/photos/asset-1',
    creatorName: 'Photographer',
    creatorUrl: 'https://unsplash.com/@photographer',
    licenseName: 'Unsplash License',
    licenseUrl: 'https://unsplash.com/license',
    attributionText: 'Photo by Photographer on Unsplash',
    usageRestrictions: [],
    tags: ['tomato soup'],
    dominantColor: '#cc5533',
    approvalStatus: DEFAULT_PUBLIC_MEDIA_APPROVAL_STATUS,
    freshnessExpiresAt: '2026-04-10T12:00:00.000Z',
    metadata: {},
    ...overrides,
  }
}

test('public media candidates default to pending approval', () => {
  assert.equal(DEFAULT_PUBLIC_MEDIA_APPROVAL_STATUS, 'pending')
})

test('finalizePublicMediaSearchResult suppresses newly fetched pending assets by default', () => {
  const results = finalizePublicMediaSearchResult([], [buildAsset()], {
    limit: 1,
  })

  assert.deepEqual(results, [])
})

test('finalizePublicMediaSearchResult can expose fetched assets only for explicit preview flows', () => {
  const asset = buildAsset()
  const results = finalizePublicMediaSearchResult([], [asset], {
    includePendingPreview: true,
    limit: 1,
  })

  assert.deepEqual(results, [asset])
})

test('finalizePublicMediaSearchResult prefers approved stored assets over fresh pending ones', () => {
  const stored = buildAsset({
    lookupKey: 'media:unsplash:approved',
    approvalStatus: 'approved',
  })
  const fresh = buildAsset()

  const results = finalizePublicMediaSearchResult([stored], [fresh], {
    includePendingPreview: true,
    limit: 1,
  })

  assert.deepEqual(results, [stored])
})

test('resolvePublicMediaApprovalStatus preserves prior review decisions on refresh', () => {
  assert.equal(resolvePublicMediaApprovalStatus('approved', 'pending'), 'approved')
  assert.equal(resolvePublicMediaApprovalStatus('rejected', 'pending'), 'rejected')
  assert.equal(resolvePublicMediaApprovalStatus(undefined, 'pending'), 'pending')
})
