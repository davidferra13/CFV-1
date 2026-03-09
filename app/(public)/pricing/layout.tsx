import type { Metadata } from 'next'
import { BreadcrumbJsonLd, FAQPageJsonLd, JsonLd } from '@/components/seo/json-ld'
import { PRO_PRICE_MONTHLY, PRO_TRIAL_DAYS } from '@/lib/billing/constants'
import { PRICING_FAQS } from '@/lib/billing/pricing-catalog'
import { LAUNCH_MODE } from '@/lib/marketing/launch-mode'
import { PLATFORM_AUDIENCE_LABEL, PLATFORM_NAME } from '@/lib/marketing/platform-positioning'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
const IS_PUBLIC_LAUNCH = LAUNCH_MODE === 'public'

export const metadata: Metadata = {
  title: `Pricing - ${PLATFORM_NAME} | Free, Pro, and Scale`,
  description: `Start free, upgrade to Pro at $${PRO_PRICE_MONTHLY}/month, or request Scale rollout support for chef-led businesses growing beyond marketplace-only operations.`,
  openGraph: {
    title: `${PLATFORM_NAME} Pricing | Free, Pro, and Scale`,
    description: `Free core workflow + Pro automation for $${PRO_PRICE_MONTHLY}/month. Built for private chefs keeping booking demand while owning client ops and margins.`,
    url: `${BASE_URL}/pricing`,
    siteName: PLATFORM_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${PLATFORM_NAME} Pricing | Free + Pro`,
    description: IS_PUBLIC_LAUNCH
      ? `Start free. Pro is $${PRO_PRICE_MONTHLY}/month with a ${PRO_TRIAL_DAYS}-day free trial.`
      : 'Pricing preview for closed beta food businesses. Join the waitlist for early access.',
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
      name: `${PLATFORM_NAME} Free`,
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      description: 'Core workflow for independent food businesses.',
    },
    {
      '@type': 'Offer',
      name: `${PLATFORM_NAME} Pro`,
      price: String(PRO_PRICE_MONTHLY),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      description: IS_PUBLIC_LAUNCH
        ? `Automation, drafting, and growth workflows with a ${PRO_TRIAL_DAYS}-day free trial.`
        : 'Automation, drafting, and growth workflows available during beta onboarding.',
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
