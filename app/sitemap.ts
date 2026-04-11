import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/db/admin'
import {
  getEnrichedIngredientSlugs,
  getIngredientCategories,
} from '@/lib/openclaw/ingredient-knowledge-queries'
import { COMPARE_PAGES } from '@/lib/marketing/compare-pages'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
const SITEMAP_QUERY_TIMEOUT_MS = Number(process.env.SITEMAP_QUERY_TIMEOUT_MS ?? 5000)

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
    url: `${BASE_URL}/partner-signup`,
    lastModified: new Date(),
    changeFrequency: 'yearly',
    priority: 0.5,
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

    // Fetch all chefs who have public profiles enabled and a slug
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('sitemap chef query timeout')), SITEMAP_QUERY_TIMEOUT_MS)
    })

    const { data: chefs } = (await Promise.race([
      db
        .from('chefs')
        .select('slug, updated_at')
        .not('slug', 'is', null)
        .eq('profile_public', true),
      timeoutPromise,
    ])) as { data: Array<{ slug: string; updated_at: string | null }> | null }

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

    // Inquiry pages for each public chef
    const inquiryRoutes: MetadataRoute.Sitemap = (chefs ?? []).map((chef: any) => ({
      url: `${BASE_URL}/chef/${chef.slug}/inquire`,
      lastModified: chef.updated_at ? new Date(chef.updated_at) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

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
    const ingredientRoutes: MetadataRoute.Sitemap = ingredientSlugs.map(({ slug, enrichedAt }) => ({
      url: `${BASE_URL}/ingredient/${slug}`,
      lastModified: new Date(enrichedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.65,
    }))
    const categoryRoutes: MetadataRoute.Sitemap = ingredientCats.map(({ category }) => ({
      url: `${BASE_URL}/ingredients/${category}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.72,
    }))

    return [
      ...STATIC_ROUTES,
      ...compareRoutes,
      ...chefRoutes,
      ...giftCardRoutes,
      ...inquiryRoutes,
      ...categoryRoutes,
      ...ingredientRoutes,
    ]
  } catch {
    // If DB is unavailable, return static routes only - don't break the build
    return STATIC_ROUTES
  }
}
