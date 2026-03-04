import type { Metadata } from 'next'
import { BreadcrumbJsonLd } from '@/components/seo/json-ld'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: {
    default: 'Blog - ChefFlow',
    template: '%s | ChefFlow Blog',
  },
  description: 'Practical guides for private chef operations, pricing, and client management.',
  openGraph: {
    title: 'ChefFlow Blog - Tips for Private Chefs',
    description: 'Practical guides for private chef operations, pricing, and client management.',
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
