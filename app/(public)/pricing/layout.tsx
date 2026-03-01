import type { Metadata } from 'next'
import {
  SoftwareApplicationJsonLd,
  FAQPageJsonLd,
  BreadcrumbJsonLd,
} from '@/components/seo/json-ld'
import { PRO_PRICE_MONTHLY } from '@/lib/billing/tier'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Pricing — ChefFlow | Private Chef Business Software',
  description: `One plan, $${PRO_PRICE_MONTHLY}/month — everything you need to run your private chef business. Events, clients, menus, payments, and kitchen ops. 14-day free trial, no credit card required.`,
  openGraph: {
    title: 'Pricing — ChefFlow | Private Chef Business Software',
    description: `One plan, $${PRO_PRICE_MONTHLY}/month — everything you need to run your private chef business. 14-day free trial, no credit card required.`,
    url: `${BASE_URL}/pricing`,
    siteName: 'ChefFlow',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `ChefFlow Pricing — $${PRO_PRICE_MONTHLY}/month, Everything Included`,
    description:
      'One plan, everything included. Events, clients, menus, payments, and kitchen ops. 14-day free trial.',
  },
  alternates: {
    canonical: `${BASE_URL}/pricing`,
  },
}

const PRICING_FAQS = [
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards. Payment is processed securely and you can cancel your subscription at any time.',
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes, you can cancel anytime with no penalties. Your subscription will remain active until the end of your current billing period.',
  },
  {
    question: 'Do you charge transaction fees?',
    answer:
      'No additional fees from us. Standard payment processing fees apply (2.9% + 30¢ per transaction).',
  },
  {
    question: 'Is there a setup fee?',
    answer:
      'No setup fees. Start free for 14 days, and only pay if you decide to continue after your trial ends.',
  },
  {
    question: 'What happens after my free trial?',
    answer: `After your 14-day free trial, you'll be charged $${PRO_PRICE_MONTHLY}/month. You can cancel anytime before the trial ends with no charge.`,
  },
  {
    question: 'Can I switch plans later?',
    answer:
      "Currently we offer one comprehensive plan that includes everything you need. As we add more features, we'll introduce additional plans with clear upgrade paths.",
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
