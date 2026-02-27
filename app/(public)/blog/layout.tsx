import type { Metadata } from 'next'
import { BreadcrumbJsonLd } from '@/components/seo/json-ld'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: {
    default: 'Blog — ChefFlow',
    template: '%s | ChefFlow Blog',
  },
  description:
    'Tips, guides, and insights for private chefs — pricing strategies, client management, menu planning, and growing your business.',
  openGraph: {
    title: 'ChefFlow Blog — Tips for Private Chefs',
    description:
      'Tips, guides, and insights for private chefs — pricing, client management, menu planning, and business growth.',
    url: `${BASE_URL}/blog`,
    siteName: 'ChefFlow',
    type: 'website',
  },
  alternates: {
    canonical: `${BASE_URL}/blog`,
  },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: BASE_URL },
          { name: 'Blog', url: `${BASE_URL}/blog` },
        ]}
      />
      {children}
    </>
  )
}
