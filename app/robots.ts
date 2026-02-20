import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://chefflow.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/chef/',
          '/pricing',
          '/contact',
          '/privacy',
          '/terms',
        ],
        disallow: [
          '/api/',
          '/auth/',
          '/dashboard',
          '/events',
          '/clients',
          '/quotes',
          '/inquiries',
          '/inbox',
          '/financials',
          '/settings',
          '/my-events',
          '/my-quotes',
          '/my-chat',
          '/my-profile',
          '/my-rewards',
          '/my-inquiries',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
