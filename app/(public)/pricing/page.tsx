import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMarketingMetadata, absoluteUrl } from '@/lib/site/public-site'
import { BreadcrumbJsonLd, SoftwareApplicationJsonLd } from '@/components/seo/json-ld'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Pricing',
  description:
    'Simple, transparent pricing for private chefs. Start free, upgrade when you need more.',
  path: '/pricing',
})

const TIERS = [
  {
    name: 'Free',
    price: 0,
    description: 'Everything you need to run your chef business.',
    highlighted: false,
    features: [
      'Unlimited events and clients',
      'Unlimited menus and recipes',
      'Calendar and scheduling',
      'Basic invoicing',
      'Prep lists and checklists',
      '1 team seat',
      '100 emails per month',
      'Payments via Stripe Connect (1% platform fee)',
    ],
  },
  {
    name: 'Pro',
    price: 10,
    description: 'AI tools, storage, and deeper client insights.',
    highlighted: true,
    features: [
      'Everything in Free',
      'Remy AI assistant (50 queries/day)',
      'Photo and document storage (5 GB)',
      '3 team seats',
      'Document generation',
      'Client preferences and history',
      'Analytics dashboard',
    ],
  },
  {
    name: 'Business',
    price: 25,
    description: 'Full power for high-volume operations.',
    highlighted: false,
    features: [
      'Everything in Pro',
      'Unlimited Remy AI queries',
      '25 GB storage',
      'Unlimited team seats',
      'Vendor management',
      'Inventory tracking',
      'Priority email support',
      'Custom branding',
    ],
  },
] as const

const PRICING_FAQS = [
  {
    question: 'Can I use ChefFlow without paying?',
    answer:
      'Yes. The Free plan includes unlimited events, clients, menus, recipes, calendar, basic invoicing, and prep lists. No credit card required to start.',
  },
  {
    question: 'What does the 1% platform fee cover?',
    answer:
      'When you collect payments through Stripe Connect, ChefFlow takes a 1% platform fee on each transaction. This is on top of standard Stripe processing fees. There is no platform fee if you invoice outside of ChefFlow.',
  },
  {
    question: 'Can I switch plans at any time?',
    answer:
      'Yes. Upgrades take effect immediately. Downgrades take effect at the end of your current billing period. You keep access to paid features until then.',
  },
  {
    question: 'What happens to my data if I downgrade?',
    answer:
      'Your data is never deleted. If you downgrade from Pro or Business, features like Remy AI and extra storage become read-only. You can still view everything, but new usage is limited to your current plan.',
  },
  {
    question: 'Do my clients pay anything to use ChefFlow?',
    answer:
      'No. Clients receive emails, invoices, and documents from you at no charge. There is no client-side subscription or platform fee.',
  },
]

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-brand-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export default function PricingPage() {
  return (
    <main>
      <SoftwareApplicationJsonLd />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: absoluteUrl('/') },
          { name: 'Pricing', url: absoluteUrl('/pricing') },
        ]}
      />

      {/* Hero */}
      <section className="border-b border-stone-800/50">
        <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-20 sm:px-6 md:pb-14 md:pt-28 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
            Pricing
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-display tracking-tight text-white md:text-5xl">
            Start free. Upgrade when you need more.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-stone-300 md:text-lg">
            Every plan includes unlimited events, clients, menus, and recipes. Pay only when you
            need AI, storage, or team seats.
          </p>
        </div>
      </section>

      {/* Tier Cards */}
      <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                tier.highlighted
                  ? 'border-orange-500/60 bg-gradient-to-b from-orange-950/20 to-stone-900'
                  : 'border-stone-800/60 bg-stone-900/40'
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-600 px-3 py-0.5 text-xs font-semibold text-white">
                  Most Popular
                </span>
              )}
              <div>
                <h2 className="text-lg font-semibold text-stone-100">{tier.name}</h2>
                <p className="mt-1 text-sm text-stone-400">{tier.description}</p>
              </div>
              <div className="mt-5">
                <span className="text-4xl font-bold tracking-tight text-white">
                  ${tier.price}
                </span>
                <span className="text-sm text-stone-400">/month</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-stone-300">
                    <CheckIcon />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup"
                className={`mt-8 inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                  tier.highlighted
                    ? 'bg-orange-600 text-white hover:bg-orange-500'
                    : 'border border-stone-700 bg-stone-900/60 text-stone-200 hover:border-stone-600 hover:bg-stone-800'
                }`}
              >
                Start Free
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-stone-800/50 bg-stone-950/40">
        <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-display tracking-tight text-stone-100">
            Frequently asked questions
          </h2>
          <div className="mt-8 space-y-3">
            {PRICING_FAQS.map((faq) => (
              <details
                key={faq.question}
                className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5"
              >
                <summary className="cursor-pointer list-none text-sm font-semibold text-stone-100">
                  {faq.question}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-stone-400">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-stone-800/50">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-display tracking-tight text-stone-100">
            Ready to run your business, not chase it?
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-stone-400">
            Sign up in under a minute. No credit card required. Start managing events, menus, and
            clients today.
          </p>
          <Link
            href="/auth/signup"
            className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-orange-600 px-6 text-sm font-semibold text-white hover:bg-orange-500"
          >
            Start Free
          </Link>
        </div>
      </section>
    </main>
  )
}
