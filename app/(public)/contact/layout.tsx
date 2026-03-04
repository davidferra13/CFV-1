import type { Metadata } from 'next'
import { BreadcrumbJsonLd, JsonLd } from '@/components/seo/json-ld'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Contact ChefFlow | Private Chef Software Support',
  description:
    'Questions about ChefFlow? Contact support@cheflowhq.com or use the form. We respond within 1 business day.',
  openGraph: {
    title: 'Contact ChefFlow',
    description: 'Questions about ChefFlow? We respond within 1 business day.',
    url: `${BASE_URL}/contact`,
    siteName: 'ChefFlow',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Contact ChefFlow',
    description: 'Questions about ChefFlow? We respond within 1 business day.',
  },
  alternates: {
    canonical: `${BASE_URL}/contact`,
  },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ContactPage',
          name: 'Contact ChefFlow',
          url: `${BASE_URL}/contact`,
          mainEntity: {
            '@type': 'Organization',
            name: 'ChefFlow',
            email: 'support@cheflowhq.com',
            url: BASE_URL,
            contactPoint: {
              '@type': 'ContactPoint',
              email: 'support@cheflowhq.com',
              contactType: 'customer support',
              availableLanguage: 'English',
              hoursAvailable: {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                opens: '09:00',
                closes: '17:00',
              },
            },
          },
        }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: BASE_URL },
          { name: 'Contact', url: `${BASE_URL}/contact` },
        ]}
      />
      {children}
    </>
  )
}
