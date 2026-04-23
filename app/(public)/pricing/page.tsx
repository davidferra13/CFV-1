import type { Metadata } from 'next'
import Link from 'next/link'
import {
  getFreeFeatures,
  getPaidFeatures,
  type FeatureCategory,
  type FeatureDefinition,
} from '@/lib/billing/feature-classification'
import { PRO_PRICE_MONTHLY } from '@/lib/billing/constants'
import { FAQPageJsonLd } from '@/components/seo/json-ld'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
const PRICING_UPDATED_AT = 'April 21, 2026'

const CATEGORY_LABELS: Record<FeatureCategory, string> = {
  core: 'Core workflow',
  intelligence: 'Intelligence',
  automation: 'Automation',
  ops: 'Operations',
  crm: 'Client system',
  compliance: 'Compliance',
}

const CLIENT_FREE_ITEMS = [
  'Browsing public chef profiles and directory listings',
  'Submitting an event request through ChefFlow',
  'Receiving outreach from matched chefs when supply exists in your area',
  'Comparing services, photos, menus, reviews, and availability on public profiles',
]

const CLIENT_QUOTE_ITEMS = [
  'Chef service pricing. Every chef sets their own rates.',
  'Deposits, final payments, travel fees, staffing, groceries, and add-ons in a chef proposal.',
  'Refund, cancellation, and dispute terms unless they are written into the chef agreement.',
]

const STATUS_ROWS = [
  {
    status: 'Free today',
    audience: 'Clients',
    detail:
      'Clients can browse chefs and submit event requests at no charge. There is no client membership or platform booking fee today.',
  },
  {
    status: 'Free today',
    audience: 'Operators',
    detail:
      'Core operator workflows are free today: inquiries, events, menus, recipes, manual costing, invoicing, ledger, calendar, and public chef pages.',
  },
  {
    status: 'Paid today',
    audience: 'Operators',
    detail: `The current public paid item is a voluntary monthly supporter contribution at $${PRO_PRICE_MONTHLY}/month. Public terms say it does not unlock additional feature entitlements today.`,
  },
  {
    status: 'Planned paid',
    audience: 'Operators',
    detail:
      'Automation, intelligence, and scale features are still classified as paid in product definitions and upgrade surfaces, but they should be treated as future paid rather than the current public pricing promise.',
  },
  {
    status: 'Not available today',
    audience: 'Everyone',
    detail:
      'There is no buyer membership, no client-side platform fee, no public add-on checkout menu for advanced features, and no public multi-plan pricing matrix beyond free plus voluntary support today.',
  },
] as const

const NOT_AVAILABLE_TODAY = [
  'No client subscription or buyer membership.',
  'No ChefFlow marketplace booking fee on the client side.',
  'No separate public checkout for individual advanced features such as live price sync, payroll, or inventory.',
  'No public enterprise, team, or add-on packaging page today.',
]

const PRICING_FAQS = [
  {
    question: 'Do clients pay ChefFlow to browse or submit an event request?',
    answer:
      'No. Browsing chefs and submitting an event request are free for clients today. Final pricing, deposits, and cancellation terms come from the chef quote or booking terms.',
  },
  {
    question: `Is the $${PRO_PRICE_MONTHLY}/month charge required for chefs today?`,
    answer:
      'No. The current public terms describe it as a voluntary monthly supporter contribution for chefs who want to support ongoing development.',
  },
  {
    question: 'Does the voluntary contribution unlock extra features today?',
    answer:
      'The public pricing and terms pages say no. It is a supporter contribution today, not a public feature-access promise.',
  },
  {
    question: 'Why does ChefFlow still mention paid or upgrade surfaces in parts of the app?',
    answer:
      'The codebase still contains paid feature classifications, upgrade prompts, billing states, and legacy subscription plumbing. Public pricing should treat those surfaces as classified future paid until ChefFlow republishes them as a live paid entitlement.',
  },
  {
    question: 'What is not available to buy today?',
    answer:
      'There is no buyer membership, no client-side platform fee, no separate public add-on menu for advanced features, and no public enterprise pricing package today.',
  },
]

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'ChefFlow pricing, stated plainly: what is free today, what is paid today, what is only classified or planned paid, and what is not publicly available yet.',
  openGraph: {
    title: 'ChefFlow Pricing',
    description:
      'What is free today, what is paid today, what is only classified or planned paid, and what is not publicly available yet.',
    url: `${BASE_URL}/pricing`,
    siteName: 'ChefFlow',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'ChefFlow Pricing',
    description:
      'What is free today, what is paid today, what is only classified or planned paid, and what is not publicly available yet.',
  },
  alternates: {
    canonical: `${BASE_URL}/pricing`,
  },
}

function groupFeaturesByCategory(features: FeatureDefinition[]) {
  return features.reduce(
    (acc, feature) => {
      const key = CATEGORY_LABELS[feature.category]
      acc[key] ??= []
      acc[key].push(feature)
      return acc
    },
    {} as Record<string, FeatureDefinition[]>
  )
}

function FeatureList({ features }: { features: FeatureDefinition[] }) {
  return (
    <ul className="space-y-3">
      {features.map((feature) => (
        <li
          key={feature.slug}
          className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-4"
        >
          <p className="text-sm font-semibold text-stone-100">{feature.label}</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-400">{feature.description}</p>
        </li>
      ))}
    </ul>
  )
}

function getStatusClass(status: (typeof STATUS_ROWS)[number]['status']) {
  if (status === 'Paid today') return 'border-amber-700/40 bg-amber-950/20 text-amber-200'
  if (status === 'Planned paid') return 'border-brand-700/40 bg-brand-950/20 text-brand-200'
  if (status === 'Not available today') return 'border-stone-700 bg-stone-900 text-stone-200'
  return 'border-emerald-700/40 bg-emerald-950/20 text-emerald-200'
}

export default function PricingPage() {
  const freeFeatures = getFreeFeatures()
  const paidFeatures = getPaidFeatures()
  const freeCount = freeFeatures.length
  const paidCount = paidFeatures.length
  const paidGroups = groupFeaturesByCategory(paidFeatures)

  return (
    <main>
      <FAQPageJsonLd faqs={PRICING_FAQS} />

      <section className="border-b border-stone-800/50">
        <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-20 sm:px-6 md:pb-14 md:pt-28 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
            Pricing
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-display tracking-tight text-white md:text-5xl">
            What is free, what is paid, what is only planned, and what is not for sale yet.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-stone-300 md:text-lg">
            Older ChefFlow copy mixed together free workflows, legacy Pro language, and future paid
            ideas. This page is the tighter version: public client usage is free today, core
            operator workflows are free today, the current $29/month charge is a voluntary supporter
            contribution, and a larger paid surface is still only classified or planned.
          </p>
          <p className="mt-4 text-sm text-stone-500">Last updated {PRICING_UPDATED_AT}.</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[1.75rem] border border-stone-800/60 bg-stone-900/40">
          <div className="border-b border-stone-800/60 px-6 py-5">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-300">
              Status At A Glance
            </p>
            <h2 className="mt-2 text-2xl font-display text-stone-100">Plan logic today</h2>
          </div>
          <div className="divide-y divide-stone-800/60">
            {STATUS_ROWS.map((row) => (
              <div
                key={`${row.status}-${row.audience}`}
                className="grid gap-4 px-6 py-5 md:grid-cols-[160px_120px_minmax(0,1fr)]"
              >
                <div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(row.status)}`}
                  >
                    {row.status}
                  </span>
                </div>
                <p className="text-sm font-medium text-stone-200">{row.audience}</p>
                <p className="text-sm leading-relaxed text-stone-400">{row.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-6 px-4 pb-12 sm:px-6 md:grid-cols-2 lg:px-8">
        <div className="rounded-3xl border border-stone-800/60 bg-stone-900/40 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-300">
            For Clients
          </p>
          <h2 className="mt-3 text-2xl font-display text-stone-100">Free today</h2>
          <ul className="mt-5 space-y-3 text-sm text-stone-300">
            {CLIENT_FREE_ITEMS.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-brand-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-2xl border border-stone-800 bg-stone-950/70 p-4">
            <p className="text-sm font-semibold text-stone-200">
              Final money terms still come from the chef
            </p>
            <ul className="mt-3 space-y-2 text-sm text-stone-400">
              {CLIENT_QUOTE_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-stone-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-3xl border border-brand-700/30 bg-gradient-to-b from-brand-950/20 to-stone-900 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-300">
            For Operators
          </p>
          <h2 className="mt-3 text-2xl font-display text-stone-100">
            Core workflows are free today
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-stone-300">
            Public pricing for operators currently has two layers. The product itself still has a
            free core workflow today. Separately, ChefFlow still keeps a $29/month supporter
            contribution and a broader future paid surface in code.
          </p>
          <div className="mt-6 rounded-2xl border border-stone-800/70 bg-stone-950/70 p-4">
            <p className="text-sm font-semibold text-stone-200">
              Paid today: voluntary supporter contribution
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone-400">
              ${PRO_PRICE_MONTHLY}/month, billed through Stripe if a chef chooses to support ongoing
              development. Public terms say this does not unlock additional features today.
            </p>
          </div>
          <div className="mt-4 rounded-2xl border border-stone-800/70 bg-stone-950/70 p-4">
            <p className="text-sm font-semibold text-stone-200">Classified or future paid</p>
            <p className="mt-2 text-sm leading-relaxed text-stone-400">
              Automation, intelligence, and scale features are still tagged as paid in feature
              definitions and some upgrade flows, but they are not the public entitlement story
              today.
            </p>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-stone-500">
            Public billing terms live on the{' '}
            <Link href="/terms" className="font-medium text-stone-300 underline underline-offset-4">
              terms page
            </Link>
            . Operator workflow context lives on{' '}
            <Link
              href="/for-operators"
              className="font-medium text-stone-300 underline underline-offset-4"
            >
              For Operators
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="border-t border-stone-800/50">
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-300">
              Free Today
            </p>
            <h2 className="mt-3 text-3xl font-display tracking-tight text-stone-100">
              Current free operator surface
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-stone-400">
              This list comes directly from the current feature classification map. Count:{' '}
              {freeCount}.
            </p>
          </div>
          <div className="mt-8">
            <FeatureList features={freeFeatures} />
          </div>
        </div>
      </section>

      <section className="border-t border-stone-800/50 bg-stone-950/40">
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-300">
              Classified Paid Or Future Paid
            </p>
            <h2 className="mt-3 text-3xl font-display tracking-tight text-stone-100">
              The larger paid surface already tagged in code
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-stone-400">
              This list comes from the current paid-feature classification map. Count: {paidCount}.
              It is broader than what is publicly sold as a live plan today, so read it as
              classified future paid unless ChefFlow republishes a narrower live entitlement
              promise.
            </p>
          </div>

          <div className="mt-10 space-y-10">
            {Object.entries(paidGroups).map(([groupLabel, features]) => (
              <div key={groupLabel}>
                <h3 className="text-lg font-semibold text-stone-100">{groupLabel}</h3>
                <div className="mt-4">
                  <FeatureList features={features} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-stone-800/50">
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-300">
              Not Available Today
            </p>
            <h2 className="mt-3 text-3xl font-display tracking-tight text-stone-100">
              Public plans ChefFlow does not sell yet
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-stone-400">
              These absences matter because older marketing language implied a broader commercial
              packaging story than the public product actually supports today.
            </p>
          </div>
          <div className="mt-8 rounded-[1.75rem] border border-stone-800/60 bg-stone-900/40 p-6">
            <ul className="space-y-3 text-sm text-stone-300">
              {NOT_AVAILABLE_TODAY.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-stone-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-stone-800/50 bg-stone-950/40">
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-300">
              Pricing FAQ
            </p>
            <h2 className="mt-3 text-3xl font-display tracking-tight text-stone-100">
              Plain answers to the messy parts
            </h2>
          </div>
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

      <section className="border-t border-stone-800/50">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-display tracking-tight text-stone-100">
              Need the shortest version?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-400">
              Clients use ChefFlow for free today. Operators use the core workflow for free today.
              The public $29/month charge is currently a voluntary supporter contribution, and the
              larger paid surface is still best treated as classified future paid rather than a live
              public entitlement promise.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/for-operators"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-700 bg-stone-900/60 px-5 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800"
            >
              For Operators
            </Link>
            <Link
              href="/trust"
              className="inline-flex h-11 items-center justify-center rounded-xl gradient-accent px-5 text-sm font-semibold text-white"
            >
              Trust Center
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
