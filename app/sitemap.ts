import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/db/admin'
import { listNearbyCollections } from '@/lib/discover/nearby-collections'
import { isDirectoryListingIndexable } from '@/lib/discover/trust'
import {
  getEnrichedIngredientSlugs,
  getIngredientCategories,
} from '@/lib/openclaw/ingredient-knowledge-queries'
import { isKnowledgeIngredientPubliclyIndexable } from '@/lib/openclaw/public-ingredient-publish'
import { COMPARE_PAGES } from '@/lib/marketing/compare-pages'

const BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://app.cheflowhq.com'
).replace(/\/+$/, '')
const SITEMAP_QUERY_TIMEOUT_MS = Number(process.env.SITEMAP_QUERY_TIMEOUT_MS ?? 5000)

function withSitemapTimeout<T>(promise: PromiseLike<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`sitemap ${label} query timeout`)),
        SITEMAP_QUERY_TIMEOUT_MS
      )
    }),
  ])
}

// Static public routes that are always indexable
const STATIC_ROUTES: MetadataRoute.Sitemap = [
  {
    url: BASE_URL,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1.0,
  },
  {
    url: `${BASE_URL}/book`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.9,
  },
  {
    url: `${BASE_URL}/ingredients`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    url: `${BASE_URL}/chefs`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.85,
  },
  {
    url: `${BASE_URL}/services`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.75,
  },
  {
    url: `${BASE_URL}/gift-cards`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  },
  {
    url: `${BASE_URL}/hub`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.65,
  },
  {
    url: `${BASE_URL}/nearby`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.55,
  },
  {
    url: `${BASE_URL}/nearby/collections`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  },
  {
    url: `${BASE_URL}/how-it-works`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    url: `${BASE_URL}/for-operators`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.65,
  },
  {
    url: `${BASE_URL}/for-operators/walkthrough`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  },
  {
    url: `${BASE_URL}/marketplace-chefs`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    url: `${BASE_URL}/about`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  },
  {
    url: `${BASE_URL}/compare`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.55,
  },
  {
    url: `${BASE_URL}/faq`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    url: `${BASE_URL}/trust`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.55,
  },
  {
    url: `${BASE_URL}/contact`,
    lastModified: new Date(),
    changeFrequency: 'yearly',
    priority: 0.4,
  },
  {
    url: `${BASE_URL}/privacy`,
    lastModified: new Date(),
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    url: `${BASE_URL}/terms`,
    lastModified: new Date(),
    changeFrequency: 'yearly',
    priority: 0.3,
  },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const db: any = createAdminClient()

    const { data: chefs } = (await withSitemapTimeout(
      db
        .from('chefs')
        .select('slug, updated_at')
        .not('slug', 'is', null)
        .eq('profile_public', true),
      'chef'
    )) as { data: Array<{ slug: string; updated_at: string | null }> | null }

    const { data: nearbyListings } = (await withSitemapTimeout(
      db
        .from('directory_listings')
        .select(
          'slug, status, claimed_at, updated_at, city, state, address, phone, email, website_url, description, hours, photo_urls, menu_url, price_range'
        )
        .in('status', ['claimed', 'verified']),
      'nearby'
    )) as {
      data: Array<{
        slug: string
        status: string
        claimed_at: string | null
        updated_at: string | null
        city: string | null
        state: string | null
        address: string | null
        phone: string | null
        email: string | null
        website_url: string | null
        description: string | null
        hours: Record<string, string> | string | null
        photo_urls: string[] | null
        menu_url: string | null
        price_range: string | null
      }> | null
    }

    const chefRoutes: MetadataRoute.Sitemap = (chefs ?? []).map((chef: any) => ({
      url: `${BASE_URL}/chef/${chef.slug}`,
      lastModified: chef.updated_at ? new Date(chef.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }))

    // Gift card pages for each public chef
    const giftCardRoutes: MetadataRoute.Sitemap = (chefs ?? []).map((chef: any) => ({
      url: `${BASE_URL}/chef/${chef.slug}/gift-cards`,
      lastModified: chef.updated_at ? new Date(chef.updated_at) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))

    const storeRoutes: MetadataRoute.Sitemap = (chefs ?? []).map((chef: any) => ({
      url: `${BASE_URL}/chef/${chef.slug}/store`,
      lastModified: chef.updated_at ? new Date(chef.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    // Inquiry pages for each public chef
    const inquiryRoutes: MetadataRoute.Sitemap = (chefs ?? []).map((chef: any) => ({
      url: `${BASE_URL}/chef/${chef.slug}/inquire`,
      lastModified: chef.updated_at ? new Date(chef.updated_at) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

    const nearbyRoutes: MetadataRoute.Sitemap = (nearbyListings ?? [])
      .filter((listing) => isDirectoryListingIndexable(listing))
      .map((listing) => ({
        url: `${BASE_URL}/nearby/${listing.slug}`,
        lastModified: listing.updated_at ? new Date(listing.updated_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: listing.status === 'verified' ? 0.7 : 0.6,
      }))

    const nearbyCollectionRoutes: MetadataRoute.Sitemap = listNearbyCollections().map(
      (collection) => ({
        url: `${BASE_URL}${collection.href}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })
    )

    // Comparison guides
    const compareRoutes: MetadataRoute.Sitemap = COMPARE_PAGES.map((page) => ({
      url: `${BASE_URL}/compare/${page.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

    // Enriched ingredient knowledge pages
    const [ingredientSlugs, ingredientCats] = await Promise.all([
      getEnrichedIngredientSlugs().catch(() => []),
      getIngredientCategories().catch(() => []),
    ])
    const ingredientRoutes: MetadataRoute.Sitemap = ingredientSlugs
      .filter(({ slug }) => isKnowledgeIngredientPubliclyIndexable({ slug }))
      .map(({ slug, enrichedAt }) => ({
        url: `${BASE_URL}/ingredient/${slug}`,
        lastModified: new Date(enrichedAt),
        changeFrequency: 'monthly' as const,
        priority: 0.65,
      }))
    const PAGE_SIZE = 96
    const categoryRoutes: MetadataRoute.Sitemap = ingredientCats.flatMap(({ category, count }) => {
      const totalPages = Math.ceil(count / PAGE_SIZE)
      const routes: MetadataRoute.Sitemap = [
        {
          url: `${BASE_URL}/ingredients/${category}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.72,
        },
      ]
      for (let p = 2; p <= totalPages; p++) {
        routes.push({
          url: `${BASE_URL}/ingredients/${category}?page=${p}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.65,
        })
      }
      return routes
    })

    return [
      ...STATIC_ROUTES,
      ...compareRoutes,
      ...chefRoutes,
      ...storeRoutes,
      ...giftCardRoutes,
      ...inquiryRoutes,
      ...nearbyRoutes,
      ...nearbyCollectionRoutes,
      ...categoryRoutes,
      ...ingredientRoutes,
    ]
  } catch {
    // If DB is unavailable, return static routes only - don't break the build
    return STATIC_ROUTES
  }
}
