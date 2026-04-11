import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/chef/',
          '/chefs',
          '/compare',
          '/compare/',
          '/faq',
          '/how-it-works',
          '/marketplace-chefs',
          '/services',
          '/trust',
          '/trust/',
          '/contact',
          '/privacy',
          '/terms',
          '/partner-signup',
          '/for-operators',
          '/about',
          '/nearby',
          '/nearby/',
          '/book',
        ],
        disallow: [
          '/api/',
          '/auth/',
          '/beta-survey/',
          '/event/',
          '/share/',
          '/g/',
          '/book/',
          '/embed/',
          '/customers',
          '/customers/',
          '/dashboard',
          '/events',
          '/clients',
          '/quotes',
          '/inquiries',
          '/inbox',
          '/financials',
          '/settings',
          '/recipes',
          '/menus',
          '/calendar',
          '/documents',
          '/staff',
          '/my-events',
          '/my-quotes',
          '/my-chat',
          '/my-profile',
          '/my-rewards',
          '/my-inquiries',
        ],
      },
      // Block aggressive crawlers that waste bandwidth
      {
        userAgent: 'AhrefsBot',
        crawlDelay: 10,
      },
      {
        userAgent: 'SemrushBot',
        crawlDelay: 10,
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
