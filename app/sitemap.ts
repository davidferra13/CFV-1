import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://chefflow.app'

// Static public routes that are always indexable
const STATIC_ROUTES: MetadataRoute.Sitemap = [
  {
    url: BASE_URL,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 1.0,
  },
  {
    url: `${BASE_URL}/pricing`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    url: `${BASE_URL}/contact`,
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
    // Fetch all chefs who have public profiles enabled and a slug
    const supabase = createAdminClient()
    const { data: chefs } = await supabase
      .from('chefs')
      .select('slug, updated_at')
      .not('slug', 'is', null)
      .eq('profile_public', true)

    const chefRoutes: MetadataRoute.Sitemap = (chefs ?? []).map((chef) => ({
      url: `${BASE_URL}/chef/${chef.slug}`,
      lastModified: chef.updated_at ? new Date(chef.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }))

    return [...STATIC_ROUTES, ...chefRoutes]
  } catch {
    // If DB is unavailable, return static routes only — don't break the build
    return STATIC_ROUTES
  }
}
