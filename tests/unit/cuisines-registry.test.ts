import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  CUISINE_BY_SLUG,
  CUISINE_COUNT,
  CUISINE_DISPLAY_MAP,
  CUISINE_POPULARITY_TIERS,
  CUISINE_TYPES,
  canonicalizeCuisineSlug,
  getCuisineAncestors,
  getCuisineDescendants,
  getCuisineDisplayName,
  getCuisineOptions,
  getCuisineOptionsByRegion,
  getCuisinePopularityTier,
  normalizeCuisineList,
} from '@/lib/constants/cuisines'

describe('cuisine registry', () => {
  it('keeps the derived lookup exports aligned with the master list', () => {
    assert.equal(CUISINE_COUNT, CUISINE_TYPES.length)
    assert.ok(CUISINE_COUNT >= 600, 'Cuisine registry should keep broad global coverage')
    assert.equal(CUISINE_BY_SLUG.size, CUISINE_TYPES.length)
    assert.equal(Object.keys(CUISINE_DISPLAY_MAP).length, CUISINE_TYPES.length)
  })

  it('uses unique slugs and valid parent references', () => {
    const slugs = new Set(CUISINE_TYPES.map((cuisine) => cuisine.slug))

    assert.equal(slugs.size, CUISINE_TYPES.length)

    for (const cuisine of CUISINE_TYPES) {
      assert.match(cuisine.slug, /^[a-z0-9]+(?:_[a-z0-9]+)*$/)
      assert.ok(cuisine.popularity >= 1 && cuisine.popularity <= 100)

      if (cuisine.parent) {
        assert.ok(
          slugs.has(cuisine.parent),
          `${cuisine.slug} references missing parent cuisine ${cuisine.parent}`
        )
      }
    }
  })

  it('remains sorted by descending popularity', () => {
    for (let index = 1; index < CUISINE_TYPES.length; index += 1) {
      assert.ok(
        CUISINE_TYPES[index - 1].popularity >= CUISINE_TYPES[index].popularity,
        `${CUISINE_TYPES[index].slug} is out of popularity order`
      )
    }
  })

  it('defines complete non-overlapping popularity tiers', () => {
    const coveredScores = new Set<number>()

    for (const tier of CUISINE_POPULARITY_TIERS) {
      assert.ok(tier.min <= tier.max)

      for (let score = tier.min; score <= tier.max; score += 1) {
        assert.ok(!coveredScores.has(score), `Popularity score ${score} is covered twice`)
        coveredScores.add(score)
      }
    }

    assert.deepEqual(
      [...coveredScores].sort((a, b) => a - b),
      Array.from({ length: 100 }, (_, i) => i + 1)
    )
  })

  it('buckets known boundary examples into the correct tier', () => {
    const expectedTiers = new Map([
      ['chinese', 1],
      ['brazilian', 2],
      ['german', 3],
      ['georgian', 4],
      ['pakistani', 5],
      ['uzbek', 6],
      ['amazigh', 7],
      ['other', 7],
    ])

    for (const [slug, expectedTier] of expectedTiers) {
      const cuisine = CUISINE_BY_SLUG.get(slug)

      assert.ok(cuisine, `${slug} should exist in the cuisine registry`)
      assert.equal(getCuisinePopularityTier(cuisine.popularity), expectedTier)
    }
  })

  it('returns cuisine options in popularity order after filters and limits', () => {
    const options = getCuisineOptions({ minPopularity: 75, limit: 5 })

    assert.deepEqual(
      options.map((option) => option.value),
      ['chinese', 'italian', 'japanese', 'mexican', 'french']
    )
  })

  it('canonicalizes cuisine labels and slugs to stable storage values', () => {
    assert.equal(canonicalizeCuisineSlug('Middle Eastern'), 'middle_eastern')
    assert.equal(canonicalizeCuisineSlug('Persian / Iranian'), 'persian')
    assert.equal(canonicalizeCuisineSlug('tex mex'), 'tex_mex')
    assert.equal(canonicalizeCuisineSlug('BBQ'), 'barbecue')
    assert.equal(canonicalizeCuisineSlug('Latin'), 'latin_american')
    assert.equal(canonicalizeCuisineSlug('Pastry & Baking'), 'bakery')
    assert.equal(canonicalizeCuisineSlug('not a cuisine'), null)

    assert.equal(getCuisineDisplayName('middle_eastern'), 'Middle Eastern')
    assert.equal(getCuisineDisplayName('Middle Eastern'), 'Middle Eastern')
  })

  it('expands cuisine hierarchy for matching use cases', () => {
    assert.deepEqual(
      getCuisineAncestors('sichuan').map((cuisine) => cuisine.slug),
      ['chinese']
    )

    const mediterraneanDescendants = getCuisineDescendants('mediterranean').map(
      (cuisine) => cuisine.slug
    )

    assert.ok(mediterraneanDescendants.includes('greek'))
  })

  it('normalizes cuisine lists with optional ancestors and custom values', () => {
    assert.deepEqual(normalizeCuisineList(['Italian', 'italian', 'Sichuan']), [
      'italian',
      'sichuan',
    ])

    assert.deepEqual(normalizeCuisineList(['Sichuan'], { includeAncestors: true }), [
      'sichuan',
      'chinese',
    ])

    assert.deepEqual(normalizeCuisineList(['House Style'], { allowCustom: true }), ['house_style'])
  })

  it('can group option lists by region for richer pickers', () => {
    const grouped = getCuisineOptionsByRegion({
      minPopularity: 75,
      limitPerRegion: 2,
      excludeOther: true,
    })

    assert.deepEqual(
      grouped.Asia.map((option) => option.value),
      ['chinese', 'japanese']
    )
    assert.deepEqual(
      grouped.Europe.map((option) => option.value),
      ['italian', 'french']
    )
  })
})
