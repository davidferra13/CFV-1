import type { Metadata } from 'next'
import { BreadcrumbJsonLd, JsonLd } from '@/components/seo/json-ld'
import { SUPPORT_EMAIL, absoluteUrl, buildMarketingMetadata } from '@/lib/site/public-site'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Contact ChefFlow | Private Chef Software Support',
  description:
    'Questions about ChefFlow? Contact support@cheflowhq.com or use the form. We respond within 1 business day.',
  path: '/contact',
  imagePath: '/social/chefflow-booking.png',
  imageAlt: 'ChefFlow contact and booking preview',
  openGraphTitle: 'Contact ChefFlow',
  twitterTitle: 'Contact ChefFlow',
  twitterCard: 'summary_large_image',
})

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ContactPage',
          name: 'Contact ChefFlow',
          url: absoluteUrl('/contact'),
          mainEntity: {
            '@type': 'Organization',
            name: 'ChefFlow',
            email: SUPPORT_EMAIL,
            url: absoluteUrl('/'),
            contactPoint: {
              '@type': 'ContactPoint',
              email: SUPPORT_EMAIL,
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
          { name: 'Home', url: absoluteUrl('/') },
          { name: 'Contact', url: absoluteUrl('/contact') },
        ]}
      />
      {children}
    </>
  )
}
