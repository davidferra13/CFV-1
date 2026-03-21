import type { Metadata } from 'next'
import { BreadcrumbJsonLd, FAQPageJsonLd, JsonLd } from '@/components/seo/json-ld'
import { PRICING_FAQS } from '@/lib/billing/pricing-catalog'
import { PLATFORM_AUDIENCE_LABEL, PLATFORM_NAME } from '@/lib/marketing/platform-positioning'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: `Pricing - ${PLATFORM_NAME} | Free for Everyone`,
  description: `${PLATFORM_NAME} is completely free. Every feature, every tool, no limits. Built for private chefs who want to own their client ops and margins.`,
  openGraph: {
    title: `${PLATFORM_NAME} Pricing | Free for Everyone`,
    description: `Every feature included, no paywalls. The full operating platform for private chefs and food businesses, free forever.`,
    url: `${BASE_URL}/pricing`,
    siteName: PLATFORM_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${PLATFORM_NAME} | Free for Every Chef`,
    description: 'The full platform, free. No tiers, no limits, no locked features.',
  },
  alternates: {
    canonical: `${BASE_URL}/pricing`,
  },
}

const PRICING_APPLICATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: PLATFORM_NAME,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: `${BASE_URL}/pricing`,
  description: `Operating platform for ${PLATFORM_AUDIENCE_LABEL}.`,
  offers: [
    {
      '@type': 'Offer',
      name: `${PLATFORM_NAME}`,
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      description:
        'Full operating platform for independent food businesses. Every feature included.',
    },
  ],
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={PRICING_APPLICATION_JSON_LD} />
      <FAQPageJsonLd faqs={PRICING_FAQS} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: BASE_URL },
          { name: 'Pricing', url: `${BASE_URL}/pricing` },
        ]}
      />
      {children}
    </>
  )
}
