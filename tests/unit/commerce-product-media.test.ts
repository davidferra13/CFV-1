import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveProductPublicMenuMedia, type ProductPublicMediaLink } from '@/lib/commerce/product-media'

function buildLink(
  overrides: Partial<ProductPublicMediaLink> = {}
): ProductPublicMediaLink {
  return {
    id: 'link-1',
    productId: 'prod-1',
    publicMediaAssetId: 'asset-1',
    imageUrl: 'https://images.example.com/lemon-tart.jpg',
    thumbnailUrl: 'https://images.example.com/lemon-tart-thumb.jpg',
    altText: 'Lemon tart on a plate',
    sourceName: 'wikimedia',
    sourceLabel: 'Wikimedia Commons',
    providerName: 'Wikimedia Commons',
    providerUrl: 'https://commons.wikimedia.org',
    creatorName: 'Example Creator',
    creatorUrl: 'https://commons.wikimedia.org/wiki/User:Example',
    licenseName: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attributionText: 'Example Creator / Wikimedia Commons',
    landingUrl: 'https://commons.wikimedia.org/wiki/File:Example.jpg',
    usageRestrictions: [],
    updatedAt: '2026-03-10T12:00:00.000Z',
    assetApprovalStatus: 'approved',
    ...overrides,
  }
}

test('resolveProductPublicMenuMedia prefers approved linked media with attribution', () => {
  const result = resolveProductPublicMenuMedia(
    {
      name: 'Lemon Tart',
      image_url: 'https://images.example.com/manual.jpg',
    },
    buildLink()
  )

  assert.equal(result.imageUrl, 'https://images.example.com/lemon-tart.jpg')
  assert.equal(result.imageAltText, 'Lemon tart on a plate')
  assert.deepEqual(result.imageAttribution, {
    sourceLabel: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org',
    creatorName: 'Example Creator',
    creatorUrl: 'https://commons.wikimedia.org/wiki/User:Example',
    attributionText: 'Example Creator / Wikimedia Commons',
    licenseName: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  })
})

test('resolveProductPublicMenuMedia suppresses unapproved linked media and falls back to product image', () => {
  const result = resolveProductPublicMenuMedia(
    {
      name: 'Lemon Tart',
      image_url: 'https://images.example.com/manual.jpg',
    },
    buildLink({
      assetApprovalStatus: 'rejected',
    })
  )

  assert.equal(result.imageUrl, 'https://images.example.com/manual.jpg')
  assert.equal(result.imageAltText, 'Lemon Tart')
  assert.equal(result.imageAttribution, null)
})

test('resolveProductPublicMenuMedia falls back cleanly when no link exists', () => {
  const result = resolveProductPublicMenuMedia(
    {
      name: 'Lemon Tart',
      image_url: null,
    },
    null
  )

  assert.equal(result.imageUrl, null)
  assert.equal(result.imageAltText, 'Lemon Tart')
  assert.equal(result.imageAttribution, null)
})
