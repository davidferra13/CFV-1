import type { Metadata } from 'next'
import { BreadcrumbJsonLd, FAQPageJsonLd, JsonLd } from '@/components/seo/json-ld'
import { PRO_PRICE_MONTHLY, PRO_TRIAL_DAYS } from '@/lib/billing/constants'
import { PRICING_FAQS } from '@/lib/billing/pricing-catalog'
import { LAUNCH_MODE } from '@/lib/marketing/launch-mode'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
const IS_PUBLIC_LAUNCH = LAUNCH_MODE === 'public'

export const metadata: Metadata = {
  title: 'Pricing - ChefFlow | Free, Pro, and Scale',
  description: `Start free, upgrade to Pro at $${PRO_PRICE_MONTHLY}/month, or request Scale rollout support for larger teams.`,
  openGraph: {
    title: 'ChefFlow Pricing | Free, Pro, and Scale',
    description: `Free core workflow + Pro automation for $${PRO_PRICE_MONTHLY}/month. Scale pilot available for team rollouts.`,
    url: `${BASE_URL}/pricing`,
    siteName: 'ChefFlow',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChefFlow Pricing | Free + Pro',
    description: IS_PUBLIC_LAUNCH
      ? `Start free. Pro is $${PRO_PRICE_MONTHLY}/month with a ${PRO_TRIAL_DAYS}-day free trial.`
      : 'Pricing preview for closed beta chefs. Join the waitlist for early access.',
  },
  alternates: {
    canonical: `${BASE_URL}/pricing`,
  },
}

const PRICING_APPLICATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ChefFlow',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: `${BASE_URL}/pricing`,
  description:
    'Private chef business software for inquiries, events, clients, culinary operations, and finance workflows.',
  offers: [
    {
      '@type': 'Offer',
      name: 'ChefFlow Free',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      description: 'Core workflow for solo chef operations.',
    },
    {
      '@type': 'Offer',
      name: 'ChefFlow Pro',
      price: String(PRO_PRICE_MONTHLY),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      description: IS_PUBLIC_LAUNCH
        ? `Automation, AI, and growth workflows with a ${PRO_TRIAL_DAYS}-day free trial.`
        : 'Automation, AI, and growth workflows available during beta onboarding.',
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
