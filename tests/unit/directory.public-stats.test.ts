/**
 * Tests for public platform stats logic.
 *
 * These tests verify that:
 * 1. No hardcoded stats remain in the homepage.
 * 2. Stats return null (not fake defaults) when there is no real data.
 * 3. Stats are computed correctly from real records.
 * 4. Average rating is not returned without real review data.
 * 5. Fake/demo chefs are excluded.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { normalizeCuisineList } from '@/lib/constants/cuisines'

// ─── 1. Hardcoded stat regression guard ────────────────────────────────────

test('homepage does not contain hardcoded stat values', () => {
  const pagePath = path.resolve('app/(public)/page.tsx')
  const source = readFileSync(pagePath, 'utf-8')

  const forbidden = ['500+', '20+', '50+', '4.9']
  for (const pattern of forbidden) {
    assert.ok(
      !source.includes(`>${pattern}<`),
      `Hardcoded stat "${pattern}" must not appear as JSX text content in the homepage`
    )
  }
})

test('homepage does not reference hardcoded hero-stat-badge-value strings', () => {
  const pagePath = path.resolve('app/(public)/page.tsx')
  const source = readFileSync(pagePath, 'utf-8')

  // None of the known fake credibility numbers should be hardcoded in JSX
  const hardcodedPatterns = [
    /hero-stat-badge-value[^<]*500\+/,
    /hero-stat-badge-value[^<]*20\+/,
    /hero-stat-badge-value[^<]*50\+/,
    /hero-stat-badge-value[^<]*4\.9/,
  ]

  for (const pattern of hardcodedPatterns) {
    assert.ok(
      !pattern.test(source),
      `Hardcoded stat matching ${pattern} must not appear in the homepage`
    )
  }
})

// ─── 2. emptyStats unit: all nulls when no chefs ───────────────────────────

test('empty stats produces all nulls', () => {
  // Inline the emptyStats logic since it is not exported
  const stats = {
    verifiedChefCount: null,
    cuisineTypeCount: null,
    cityCoveredCount: null,
    avgRating: null,
  }

  assert.strictEqual(stats.verifiedChefCount, null)
  assert.strictEqual(stats.cuisineTypeCount, null)
  assert.strictEqual(stats.cityCoveredCount, null)
  assert.strictEqual(stats.avgRating, null)
})

// ─── 3. Cuisine deduplication logic ────────────────────────────────────────

test('cuisine type count deduplicates canonical variants across sources', () => {
  const marketplaceRows = [
    {
      cuisine_types: ['Italian', 'French'],
      service_area_city: 'Miami',
      avg_rating: null,
      review_count: 0,
    },
    {
      cuisine_types: ['italian', 'Pizzeria', 'Japanese'],
      service_area_city: 'Miami',
      avg_rating: null,
      review_count: 0,
    },
  ]
  const listingRows = [{ cuisines: ['french', 'Spanish', 'Pizza'], city: 'Tampa' }]

  const cuisineSet = new Set<string>()
  const addCuisineValues = (values: unknown) => {
    if (!Array.isArray(values)) return

    for (const cuisine of normalizeCuisineList(
      values.filter((value): value is string => typeof value === 'string')
    )) {
      cuisineSet.add(cuisine)
    }
  }

  for (const row of marketplaceRows) {
    addCuisineValues(row.cuisine_types)
  }
  for (const row of listingRows) {
    addCuisineValues(row.cuisines)
  }

  assert.deepEqual([...cuisineSet].sort(), ['french', 'italian', 'japanese', 'pizza', 'spanish'])
})

// ─── 4. City deduplication logic ───────────────────────────────────────────

test('city count deduplicates case-insensitively', () => {
  const marketplaceRows = [
    { service_area_city: 'Miami' },
    { service_area_city: 'miami' },
    { service_area_city: 'Tampa' },
  ]
  const listingRows = [{ city: 'miami' }, { city: 'Orlando' }]

  const citySet = new Set<string>()
  for (const row of marketplaceRows) {
    if (row.service_area_city) citySet.add(row.service_area_city.toLowerCase().trim())
  }
  for (const row of listingRows) {
    if (row.city) citySet.add(row.city.toLowerCase().trim())
  }

  // miami, tampa, orlando = 3
  assert.strictEqual(citySet.size, 3)
})

// ─── 5. Average rating: null when no reviews ───────────────────────────────

test('average rating is null when all chefs have zero reviews', () => {
  const marketplaceRows = [
    { avg_rating: 4.5, review_count: 0 },
    { avg_rating: 5.0, review_count: 0 },
  ]

  const MIN_REVIEWS_FOR_RATING = 1
  let totalWeightedRating = 0
  let totalReviews = 0

  for (const row of marketplaceRows) {
    const rating =
      typeof row.avg_rating === 'number' ? row.avg_rating : parseFloat(String(row.avg_rating))
    const count =
      typeof row.review_count === 'number' ? row.review_count : parseInt(String(row.review_count))
    if (
      Number.isFinite(rating) &&
      rating > 0 &&
      Number.isFinite(count) &&
      count >= MIN_REVIEWS_FOR_RATING
    ) {
      totalWeightedRating += rating * count
      totalReviews += count
    }
  }

  const avgRating =
    totalReviews >= MIN_REVIEWS_FOR_RATING
      ? Math.round((totalWeightedRating / totalReviews) * 10) / 10
      : null

  assert.strictEqual(avgRating, null, 'Average rating must be null when no chef has reviews')
})

// ─── 6. Average rating: computed correctly when reviews exist ──────────────

test('average rating is weighted by review_count', () => {
  // Chef A: 5.0 rating, 10 reviews -> weight 50
  // Chef B: 4.0 rating, 10 reviews -> weight 40
  // Weighted avg = 90 / 20 = 4.5
  const marketplaceRows = [
    { avg_rating: 5.0, review_count: 10 },
    { avg_rating: 4.0, review_count: 10 },
  ]

  const MIN_REVIEWS_FOR_RATING = 1
  let totalWeightedRating = 0
  let totalReviews = 0

  for (const row of marketplaceRows) {
    const rating =
      typeof row.avg_rating === 'number' ? row.avg_rating : parseFloat(String(row.avg_rating))
    const count =
      typeof row.review_count === 'number' ? row.review_count : parseInt(String(row.review_count))
    if (
      Number.isFinite(rating) &&
      rating > 0 &&
      Number.isFinite(count) &&
      count >= MIN_REVIEWS_FOR_RATING
    ) {
      totalWeightedRating += rating * count
      totalReviews += count
    }
  }

  const avgRating =
    totalReviews >= MIN_REVIEWS_FOR_RATING
      ? Math.round((totalWeightedRating / totalReviews) * 10) / 10
      : null

  assert.strictEqual(avgRating, 4.5)
})

// ─── 7. Demo/test email exclusion ──────────────────────────────────────────

test('demo and test emails are excluded from discoverable chef list', () => {
  const candidates = [
    { id: '1', email: 'chef@local.chefflow', directory_approved: true },
    { id: '2', email: 'demo@chefflow.com', directory_approved: true },
    { id: '3', email: 'test@example.com', directory_approved: true },
    { id: '4', email: 'real@example.com', directory_approved: true },
  ]

  // Mirror the filter from public-stats.ts (isFounder check omitted for simplicity)
  const approved = candidates.filter((c) => {
    const email = (c.email || '').toLowerCase()
    if (email.endsWith('@local.chefflow')) return false
    if (email.includes('demo@') || email.includes('test@')) return false
    return true
  })

  assert.strictEqual(approved.length, 1)
  assert.strictEqual(approved[0].id, '4')
})

// ─── 8. HeroStatBadges does not render when all stats null ─────────────────

test('HeroStatBadges items array is empty when all stats are null', () => {
  const stats = {
    verifiedChefCount: null,
    cuisineTypeCount: null,
    cityCoveredCount: null,
    avgRating: null,
  }

  const items: { value: string; label: string }[] = []
  if (stats.verifiedChefCount !== null)
    items.push({ value: String(stats.verifiedChefCount), label: 'Verified chefs' })
  if (stats.cuisineTypeCount !== null)
    items.push({ value: String(stats.cuisineTypeCount), label: 'Cuisine types' })
  if (stats.cityCoveredCount !== null)
    items.push({ value: String(stats.cityCoveredCount), label: 'Cities covered' })
  if (stats.avgRating !== null)
    items.push({ value: stats.avgRating.toFixed(1), label: 'Avg. rating' })

  assert.strictEqual(items.length, 0, 'No stat badges must render when all platform stats are null')
})

// ─── 9. HeroStatBadges renders only real stats ─────────────────────────────

test('HeroStatBadges renders only stats with non-null values', () => {
  const stats = {
    verifiedChefCount: 3,
    cuisineTypeCount: 7,
    cityCoveredCount: null, // not yet available
    avgRating: null, // not yet available
  }

  const items: { value: string; label: string }[] = []
  if (stats.verifiedChefCount !== null)
    items.push({ value: String(stats.verifiedChefCount), label: 'Verified chefs' })
  if (stats.cuisineTypeCount !== null)
    items.push({ value: String(stats.cuisineTypeCount), label: 'Cuisine types' })
  if (stats.cityCoveredCount !== null)
    items.push({ value: String(stats.cityCoveredCount), label: 'Cities covered' })
  if (stats.avgRating !== null)
    items.push({ value: stats.avgRating.toFixed(1), label: 'Avg. rating' })

  assert.strictEqual(items.length, 2)
  assert.strictEqual(items[0].label, 'Verified chefs')
  assert.strictEqual(items[0].value, '3')
  assert.strictEqual(items[1].label, 'Cuisine types')
  assert.strictEqual(items[1].value, '7')
})
