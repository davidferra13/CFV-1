import { PRO_PRICE_MONTHLY, PRO_TRIAL_DAYS } from '@/lib/billing/constants'
import { MODULES } from '@/lib/billing/modules'
import { PRO_FEATURES, type ProFeature } from '@/lib/billing/pro-features'

export type PricingPlanId = 'free' | 'pro' | 'scale'

export type PricingPlan = {
  id: PricingPlanId
  name: string
  tag: string
  price: string
  cadence: string
  badge?: string
  summary: string
  ctaLabel: string
  ctaHref: string
  highlighted?: boolean
  points: string[]
  finePrint?: string
}

export type ComparisonCellState = 'included' | 'not_included' | 'limited' | 'pilot'

export type ComparisonCell = {
  state: ComparisonCellState
  note: string
}

export type PricingComparisonRow = {
  capability: string
  detail: string
  values: Record<PricingPlanId, ComparisonCell>
}

export type PricingComparisonSection = {
  label: string
  rows: PricingComparisonRow[]
}

export type FunctionBucket = {
  id: string
  label: string
  rule: string
  items: string[]
}

const FREE_MODULE_LABELS = MODULES.filter((module) => module.tier === 'free').map(
  (module) => module.label
)

const PRO_MODULE_LABELS = MODULES.filter((module) => module.tier === 'pro').map(
  (module) => module.label
)

/**
 * Slugs currently enforced with requirePro() checks in app/lib server actions.
 * This list keeps public pricing copy aligned with actual gating behavior.
 */
export const ENFORCED_PRO_FEATURE_SLUGS = [
  'commerce',
  'custom-reports',
  'integrations',
  'marketing',
  'professional',
  'protection',
  'remy',
] as const

const enforcedSlugSet = new Set<string>(ENFORCED_PRO_FEATURE_SLUGS)

export const ENFORCED_PRO_FEATURES = PRO_FEATURES.filter((feature) =>
  enforcedSlugSet.has(feature.slug)
)

const PRO_CATEGORY_ORDER: ProFeature['category'][] = [
  'ai',
  'analytics',
  'finance',
  'marketing',
  'clients',
  'loyalty',
  'staff',
  'operations',
  'protection',
  'community',
  'integrations',
  'professional',
  'calendar',
  'commerce',
]

const PRO_CATEGORY_LABELS: Record<ProFeature['category'], string> = {
  ai: 'Drafting and workflow tools',
  analytics: 'Analytics and reporting',
  finance: 'Advanced finance workflows',
  marketing: 'Marketing and outreach',
  clients: 'Client intelligence',
  loyalty: 'Retention and loyalty',
  staff: 'Staff operations',
  operations: 'Operational controls',
  protection: 'Compliance and protection',
  community: 'Community and collaboration',
  integrations: 'Integrations and automations',
  professional: 'Professional development',
  calendar: 'Advanced calendar tooling',
  commerce: 'Commerce and POS operations',
}

export const PRO_FEATURE_AREAS = PRO_CATEGORY_ORDER.map((category) => {
  const features = PRO_FEATURES.filter((feature) => feature.category === category)
  return {
    label: PRO_CATEGORY_LABELS[category],
    features: features.map((feature) => feature.label),
  }
}).filter((area) => area.features.length > 0)

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    tag: 'Start here',
    price: '$0',
    cadence: 'forever',
    summary: 'Everything you need to track clients, events, and money. Free forever.',
    ctaLabel: 'Start Free',
    ctaHref: '/auth/signup',
    points: [
      'Track inquiries, events, clients, recipes, and payments',
      'Unlimited records, no usage caps',
      'Client portal, booking pages, invoices, and payment collection',
      'No credit card required',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tag: 'Most popular',
    price: `$${PRO_PRICE_MONTHLY}`,
    cadence: 'per month',
    badge: `${PRO_TRIAL_DAYS}-day free trial`,
    summary: 'Save hours on admin. Email drafts, reports, and marketing tools.',
    ctaLabel: 'Start Pro Trial',
    ctaHref: '/auth/signup',
    highlighted: true,
    points: [
      'Everything in Free, plus Remy (your AI admin assistant)',
      'Marketing campaigns, custom reports, and client insights',
      'Connect to tools you already use (Zapier, external systems)',
      'Best for chefs running frequent events or growing their client base',
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    tag: 'Pilot',
    price: 'Custom',
    cadence: "let's talk",
    summary: 'For teams or multi-chef operations that need hands-on setup help.',
    ctaLabel: 'Talk to David',
    ctaHref: '/contact',
    points: [
      'Everything in Pro',
      'Help migrating from spreadsheets, other tools, or paper',
      'Hands-on setup and workflow planning',
      'Reserved for pilot customers right now',
    ],
    finePrint: 'Scale is a guided onboarding package with direct support, not a self-serve tier.',
  },
]

export const FUNCTION_BUCKETS: FunctionBucket[] = [
  {
    id: 'foundation',
    label: 'Free: the essentials',
    rule: 'If you need it to run your business week to week, it is free.',
    items: [
      ...FREE_MODULE_LABELS,
      'Full event workflow from inquiry to payment',
      'Client records, recipes, menus, invoices, and expense tracking',
    ],
  },
  {
    id: 'acceleration',
    label: 'Pro: save time and grow',
    rule: 'If it saves you hours of admin or helps you get more clients, it is Pro.',
    items: [...PRO_MODULE_LABELS, ...ENFORCED_PRO_FEATURES.map((feature) => feature.label)],
  },
  {
    id: 'scale',
    label: 'Scale: hands-on help',
    rule: 'If you need someone to help you set up and migrate, that is Scale.',
    items: [
      'Help moving from spreadsheets or other tools',
      'Setup and training for teams',
      'Ongoing support during the transition',
    ],
  },
]

export const PRICING_COMPARISON_SECTIONS: PricingComparisonSection[] = [
  {
    label: 'What every plan includes',
    rows: [
      {
        capability: 'Inquiries, quotes, events, clients, recipes, invoices, payments',
        detail: 'The full workflow from first contact to getting paid. No usage caps.',
        values: {
          free: { state: 'included', note: 'Included' },
          pro: { state: 'included', note: 'Included' },
          scale: { state: 'included', note: 'Included' },
        },
      },
      {
        capability: 'Client portal and booking pages',
        detail: 'Your clients can view proposals, approve quotes, and pay online.',
        values: {
          free: { state: 'included', note: 'Included' },
          pro: { state: 'included', note: 'Included' },
          scale: { state: 'included', note: 'Included' },
        },
      },
    ],
  },
  {
    label: 'What Pro adds',
    rows: [
      {
        capability: 'Remy (AI admin assistant)',
        detail:
          'Email drafts, profit breakdowns, client lookups. You review everything before it sends.',
        values: {
          free: { state: 'not_included', note: 'Pro only' },
          pro: { state: 'included', note: 'Included' },
          scale: { state: 'included', note: 'Included' },
        },
      },
      {
        capability: 'Marketing and outreach',
        detail: 'Campaigns, follow-up sequences, and referral tools.',
        values: {
          free: { state: 'not_included', note: 'Pro only' },
          pro: { state: 'included', note: 'Included' },
          scale: { state: 'included', note: 'Included' },
        },
      },
      {
        capability: 'Custom reports',
        detail: 'See trends, top clients, revenue by month, and margins over time.',
        values: {
          free: { state: 'not_included', note: 'Pro only' },
          pro: { state: 'included', note: 'Included' },
          scale: { state: 'included', note: 'Included' },
        },
      },
      {
        capability: 'Integrations (Zapier, external tools)',
        detail: 'Connect ChefFlow to the other tools you already use.',
        values: {
          free: { state: 'not_included', note: 'Pro only' },
          pro: { state: 'included', note: 'Included' },
          scale: { state: 'included', note: 'Included' },
        },
      },
    ],
  },
  {
    label: 'What Scale adds',
    rows: [
      {
        capability: 'Hands-on setup and migration help',
        detail: 'We help you move from spreadsheets, other tools, or paper to ChefFlow.',
        values: {
          free: { state: 'not_included', note: 'Not included' },
          pro: { state: 'not_included', note: 'Not included' },
          scale: { state: 'pilot', note: 'Pilot support' },
        },
      },
      {
        capability: 'Multi-chef team onboarding',
        detail: 'Setup and training for teams adopting ChefFlow together.',
        values: {
          free: { state: 'not_included', note: 'Not included' },
          pro: { state: 'not_included', note: 'Not included' },
          scale: { state: 'pilot', note: 'Pilot support' },
        },
      },
    ],
  },
]

export const PRICING_FAQS = [
  {
    question: 'Do I need a credit card to start?',
    answer: 'No. Free is free. No card, no catch.',
  },
  {
    question: 'What happens after the Pro trial ends?',
    answer: `After ${PRO_TRIAL_DAYS} days, Pro continues at $${PRO_PRICE_MONTHLY}/month. You can cancel anytime before that and keep using the free tier.`,
  },
  {
    question: 'Can I switch between Free and Pro?',
    answer:
      'Yes. Upgrade when you need the extra tools, downgrade whenever you want. Your data stays either way.',
  },
  {
    question: 'Does ChefFlow charge transaction fees?',
    answer:
      'No. ChefFlow does not take a cut of your payments. Stripe charges its standard processing fee, which goes to Stripe, not us.',
  },
  {
    question: 'What is Scale?',
    answer:
      'Scale is for chefs or teams who want hands-on help setting up. We help you migrate from whatever you use now and get everything configured. Right now it is a pilot program.',
  },
  {
    question: 'Who built this?',
    answer:
      'ChefFlow is built by a working private chef. Not a software company that researched chefs. Someone who lives this.',
  },
]
