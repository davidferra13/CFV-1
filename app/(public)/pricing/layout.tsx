import type { Metadata } from 'next'
import {
  SoftwareApplicationJsonLd,
  FAQPageJsonLd,
  BreadcrumbJsonLd,
} from '@/components/seo/json-ld'
import { PRO_PRICE_MONTHLY } from '@/lib/billing/tier'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Pricing - ChefFlow | Private Chef Business Software',
  description: `One plan at $${PRO_PRICE_MONTHLY}/month. Run events, clients, menus, and payments in one place.`,
  openGraph: {
    title: 'Pricing - ChefFlow | Private Chef Business Software',
    description: `One plan at $${PRO_PRICE_MONTHLY}/month with a 14-day free trial.`,
    url: `${BASE_URL}/pricing`,
    siteName: 'ChefFlow',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `ChefFlow Pricing - $${PRO_PRICE_MONTHLY}/month`,
    description: 'One plan. Full access. 14-day free trial.',
  },
  alternates: {
    canonical: `${BASE_URL}/pricing`,
  },
}

const PRICING_FAQS = [
  {
    question: 'What payment methods do you accept?',
    answer: 'All major credit cards.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes. Cancel anytime and keep access through your current billing cycle.',
  },
  {
    question: 'Do you charge transaction fees?',
    answer: 'We do not add platform transaction fees. Standard processor fees still apply.',
  },
  {
    question: 'Is there a setup fee?',
    answer: 'No setup fee.',
  },
  {
    question: 'What happens after my free trial?',
    answer: `After 14 days, your subscription is $${PRO_PRICE_MONTHLY}/month.`,
  },
  {
    question: 'Can I switch plans later?',
    answer: 'Right now there is one plan with full access.',
  },
]

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SoftwareApplicationJsonLd />
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
