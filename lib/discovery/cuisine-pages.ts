import {
  canonicalizeCuisineSlug,
  getCuisineAncestors,
  getCuisineDescendants,
  getCuisineDisplayName,
  getCuisineEntry,
  getCuisineOptions,
  type CuisineEntry,
  type CuisineOption,
} from '@/lib/constants/cuisines'

const MIN_PUBLIC_CUISINE_POPULARITY = 60
const MAX_RELATED_CUISINES = 8

export type PublicCuisinePage = {
  slug: string
  name: string
  title: string
  description: string
  intro: string
  region: CuisineEntry['region']
  subregion: string
  popularity: number
  chefHref: string
  nearbyHref: string
  ancestors: readonly CuisineEntry[]
  children: readonly CuisineEntry[]
  related: readonly CuisineEntry[]
}

function chefHref(slug: string) {
  return `/chefs?cuisine=${encodeURIComponent(slug)}`
}

function nearbyHref(slug: string) {
  return `/nearby?cuisine=${encodeURIComponent(slug)}`
}

function cuisinePageHref(slug: string) {
  return `/cuisines/${slug}`
}

function toEntry(option: CuisineOption): CuisineEntry | null {
  return getCuisineEntry(option.value)
}

export function listPublicCuisineOptions(): readonly CuisineOption[] {
  return getCuisineOptions({
    minPopularity: MIN_PUBLIC_CUISINE_POPULARITY,
    excludeOther: true,
  })
}

export function listPublicCuisinePages(): readonly PublicCuisinePage[] {
  return listPublicCuisineOptions()
    .map((option) => buildPublicCuisinePage(option.value))
    .filter((page): page is PublicCuisinePage => Boolean(page))
}

export function isPublicCuisinePageSlug(value: string | null | undefined): boolean {
  const slug = canonicalizeCuisineSlug(value)
  if (!slug || slug === 'other') return false

  const entry = getCuisineEntry(slug)
  return Boolean(entry && entry.popularity >= MIN_PUBLIC_CUISINE_POPULARITY)
}

export function getCanonicalCuisinePageSlug(value: string | null | undefined): string | null {
  const slug = canonicalizeCuisineSlug(value)
  return isPublicCuisinePageSlug(slug) ? slug : null
}

export function getCuisinePageHref(value: string | null | undefined): string | null {
  const slug = getCanonicalCuisinePageSlug(value)
  return slug ? cuisinePageHref(slug) : null
}

export function buildPublicCuisinePage(value: string): PublicCuisinePage | null {
  const slug = getCanonicalCuisinePageSlug(value)
  if (!slug) return null

  const entry = getCuisineEntry(slug)
  if (!entry) return null

  const name = getCuisineDisplayName(slug)
  const descendants = getCuisineDescendants(slug)
    .filter((cuisine) => cuisine.slug !== 'other')
    .sort((a, b) => b.popularity - a.popularity)

  const children = descendants
    .filter((cuisine) => cuisine.popularity >= MIN_PUBLIC_CUISINE_POPULARITY)
    .slice(0, MAX_RELATED_CUISINES)
  const ancestors = getCuisineAncestors(slug).filter(
    (cuisine) => cuisine.popularity >= MIN_PUBLIC_CUISINE_POPULARITY
  )
  const ancestorSlugs = new Set(ancestors.map((cuisine) => cuisine.slug))
  const related = listPublicCuisineOptions()
    .map(toEntry)
    .filter((cuisine): cuisine is CuisineEntry => Boolean(cuisine))
    .filter(
      (cuisine) =>
        cuisine.slug !== slug &&
        !ancestorSlugs.has(cuisine.slug) &&
        !descendants.some((descendant) => descendant.slug === cuisine.slug) &&
        (cuisine.subregion === entry.subregion || cuisine.region === entry.region)
    )
    .slice(0, MAX_RELATED_CUISINES)

  return {
    slug,
    name,
    title: `${name} private chefs and food experiences`,
    description: `Browse ${name} private chefs, nearby food operators, and related cuisine paths on ChefFlow.`,
    intro: `Start with ${name} chefs for private dinners, catering, meal prep, and hosted events, or switch to nearby food operators when a restaurant, pop-up, bakery, caterer, or food truck is the better fit.`,
    region: entry.region,
    subregion: entry.subregion,
    popularity: entry.popularity,
    chefHref: chefHref(slug),
    nearbyHref: nearbyHref(slug),
    ancestors,
    children,
    related,
  }
}
