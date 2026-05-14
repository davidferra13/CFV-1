import {
  CUISINE_TYPES,
  getCuisineAncestors,
  getCuisineDescendants,
  getCuisineEntry,
  type CuisineEntry,
} from '@/lib/constants/cuisines'
import { getCuisinePageHref } from '@/lib/discovery/cuisine-pages'
import type { DiscoveryIconKey, DiscoveryRailItem } from '@/lib/discovery/homepage-discovery-rail'

export const HOMEPAGE_TASTE_RAIL_ITEM_LIMIT = 120

const ANCHOR_CUISINE_SLUG = 'italian'

const ICON_BY_SLUG: Record<string, DiscoveryIconKey> = {
  american: 'burger',
  bakery: 'cookie',
  barbecue: 'bbq',
  burger: 'burger',
  cafe: 'coffee',
  caribbean: 'fish',
  chinese: 'dumpling',
  dessert: 'cake',
  desserts: 'cake',
  farm_to_table: 'carrot',
  french: 'wine',
  greek: 'leaf',
  indian: 'pepper',
  italian: 'pasta',
  japanese: 'sushi',
  korean: 'bowl',
  latin_american: 'avocado',
  mediterranean: 'leaf',
  mexican: 'taco',
  middle_eastern: 'grains',
  pizza: 'pizza',
  ramen: 'ramen',
  seafood: 'seafood',
  southern: 'comfort',
  sushi: 'sushi',
  taco: 'taco',
  tacos: 'taco',
  thai: 'pepper',
  vegan: 'plant',
  vegetarian: 'avocado',
  vietnamese: 'noodles',
}

const ICON_BY_REGION: Record<CuisineEntry['region'], DiscoveryIconKey> = {
  Africa: 'grains',
  Americas: 'avocado',
  Asia: 'bowl',
  Europe: 'bread',
  'Middle East': 'grains',
  Oceania: 'seafood',
  'Religious / Dietary': 'leaf',
  'Fusion / Commercial': 'spark',
}

export type HomepageTasteRailOptions = {
  seed?: string
  boostedCuisineSlugs?: readonly string[]
  limit?: number
}

export function listHomepageTasteCandidates(): DiscoveryRailItem[] {
  return CUISINE_TYPES.filter((cuisine) => cuisine.slug !== 'other').map(cuisineToRailItem)
}

export function buildHomepageTasteRailItems(
  options: HomepageTasteRailOptions = {}
): DiscoveryRailItem[] {
  const seed = options.seed ?? 'default'
  const limit = options.limit ?? HOMEPAGE_TASTE_RAIL_ITEM_LIMIT
  const candidates = CUISINE_TYPES.filter((cuisine) => cuisine.slug !== 'other')
  const boosted = buildSimilarCuisineEntries(options.boostedCuisineSlugs ?? [], candidates)

  const popular = rotateCuisineEntries(
    candidates.filter((cuisine) => cuisine.popularity >= 75),
    `${seed}:popular`
  )
  const regional = rotateCuisineEntries(
    candidates.filter((cuisine) => cuisine.popularity >= 45 && cuisine.popularity < 75),
    `${seed}:regional`
  )
  const hidden = rotateCuisineEntries(
    candidates.filter((cuisine) => cuisine.popularity >= 15 && cuisine.popularity < 45),
    `${seed}:hidden`
  )
  const wildcard = rotateCuisineEntries(
    candidates.filter((cuisine) => cuisine.popularity < 30),
    `${seed}:wildcard`
  )

  const lead = [...regional, ...hidden, ...wildcard].find(
    (cuisine) => cuisine.slug !== ANCHOR_CUISINE_SLUG
  )
  const anchor = getCuisineEntry(ANCHOR_CUISINE_SLUG)
  const ordered = dedupeCuisineEntries([
    ...(lead ? [lead] : []),
    ...(anchor ? [anchor] : []),
    ...boosted,
    ...interleaveCuisineBuckets([
      popular,
      regional,
      hidden,
      wildcard,
      rotateCuisineEntries(candidates, `${seed}:all`),
    ]),
  ])

  return ordered.slice(0, limit).map(cuisineToRailItem)
}

function buildSimilarCuisineEntries(
  slugs: readonly string[],
  candidates: readonly CuisineEntry[]
): CuisineEntry[] {
  const candidateBySlug = new Map(candidates.map((cuisine) => [cuisine.slug, cuisine]))
  const similar: CuisineEntry[] = []

  for (const rawSlug of slugs) {
    const entry = getCuisineEntry(rawSlug)
    if (!entry) continue

    similar.push(entry)
    similar.push(...getCuisineDescendants(entry.slug))
    similar.push(...getCuisineAncestors(entry.slug))
    similar.push(
      ...candidates.filter(
        (candidate) =>
          candidate.slug !== entry.slug &&
          (candidate.subregion === entry.subregion || candidate.region === entry.region) &&
          Math.abs(candidate.popularity - entry.popularity) <= 30
      )
    )
  }

  return dedupeCuisineEntries(similar)
    .map((entry) => candidateBySlug.get(entry.slug))
    .filter((entry): entry is CuisineEntry => Boolean(entry))
}

function interleaveCuisineBuckets(buckets: readonly CuisineEntry[][]): CuisineEntry[] {
  const longest = Math.max(...buckets.map((bucket) => bucket.length))
  const result: CuisineEntry[] = []

  for (let index = 0; index < longest; index += 1) {
    for (const bucket of buckets) {
      const entry = bucket[index]
      if (entry) result.push(entry)
    }
  }

  return result
}

function rotateCuisineEntries(entries: readonly CuisineEntry[], seed: string): CuisineEntry[] {
  return [...entries]
    .map((entry, index) => ({
      entry,
      score: stableHash(`${seed}:${entry.slug}:${index}`),
    }))
    .sort((a, b) => a.score - b.score || b.entry.popularity - a.entry.popularity)
    .map(({ entry }) => entry)
}

function dedupeCuisineEntries(entries: readonly CuisineEntry[]): CuisineEntry[] {
  const seen = new Set<string>()
  const result: CuisineEntry[] = []

  for (const entry of entries) {
    if (seen.has(entry.slug)) continue
    seen.add(entry.slug)
    result.push(entry)
  }

  return result
}

function cuisineToRailItem(cuisine: CuisineEntry): DiscoveryRailItem {
  return {
    type: 'cuisine',
    label: cuisine.name,
    href: getCuisinePageHref(cuisine.slug) ?? `/chefs?cuisine=${encodeURIComponent(cuisine.slug)}`,
    icon: ICON_BY_SLUG[cuisine.slug] ?? ICON_BY_REGION[cuisine.region] ?? 'utensils',
    sublabel: cuisine.subregion,
  }
}

function stableHash(value: string): number {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}
