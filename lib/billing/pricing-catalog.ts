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
  ai: 'AI and assistant workflows',
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
    summary: 'Core operating system for solo chefs getting organized.',
    ctaLabel: 'Start Free',
    ctaHref: '/auth/signup',
    points: [
      'Core modules: Dashboard, Pipeline, Events, Culinary, Clients, Finance',
      'Unlimited inquiries, quotes, events, and client records',
      'Client portal, booking pages, invoices, and payment collection',
      'No credit card required to start',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tag: 'Most popular',
    price: `$${PRO_PRICE_MONTHLY}`,
    cadence: 'per month',
    badge: `${PRO_TRIAL_DAYS}-day free trial`,
    summary: 'Automation and growth functions for chefs who need leverage.',
    ctaLabel: 'Start Pro Trial',
    ctaHref: '/auth/signup',
    highlighted: true,
    points: [
      'Everything in Free plus AI assistant access and advanced automations',
      'Commerce engine, marketing tools, and custom reporting',
      'Integrations layer for workflows like Zapier and external systems',
      'Best fit for operators running frequent volume or complex service models',
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    tag: 'Pilot',
    price: 'Custom',
    cadence: 'contact sales',
    summary: 'For teams and multi-location operators that need implementation support.',
    ctaLabel: 'Talk to Sales',
    ctaHref: '/contact',
    points: [
      'Everything in Pro',
      'Migration and rollout planning across chefs or locations',
      'Hands-on implementation support for workflows and change management',
      'Reserved for pilot customers today',
    ],
    finePrint: 'Scale is a guided onboarding package, not a third self-serve checkout flow yet.',
  },
]

export const FUNCTION_BUCKETS: FunctionBucket[] = [
  {
    id: 'foundation',
    label: 'Foundation functions (Free)',
    rule: 'If a solo chef needs it weekly to run the business, it belongs in Free.',
    items: [
      ...FREE_MODULE_LABELS,
      'Core event lifecycle and quote workflow',
      'Client records, menu/recipe management, and baseline finance controls',
    ],
  },
  {
    id: 'acceleration',
    label: 'Acceleration functions (Pro)',
    rule: 'If the function saves major time or unlocks growth beyond baseline operations, it belongs in Pro.',
    items: [...PRO_MODULE_LABELS, ...ENFORCED_PRO_FEATURES.map((feature) => feature.label)],
  },
  {
    id: 'scale',
    label: 'Scale functions (Scale pilot)',
    rule: 'If success depends on multi-seat rollout, migration, or process coaching, bundle it in Scale.',
    items: [
      'Multi-chef onboarding and workflow migration',
      'Implementation planning for larger operating teams',
      'Governance and rollout support while new processes are adopted',
    ],
  },
]

export const PRICING_COMPARISON_SECTIONS: PricingComparisonSection[] = [
  {
    label: 'Core business operations',
    rows: [
      {
        capability: 'Inquiries, quotes, and event lifecycle',
        detail: 'Run the full lead-to-booking workflow with no hard usage caps.',
        values: {
          free: { state: 'included', note: 'Included' },
          pro: { state: 'included', note: 'Included' },
          scale: { state: 'included', note: 'Included' },
        },
      },
      {
        capability: 'Client portal and booking pages',
        detail: 'Share proposals, collect approvals, and centralize client communication.',
        values: {
          free: { state: 'included', note: 'Included' },
          pro: { state: 'included', note: 'Included' },
          scale: { state: 'included', note: 'Included' },
        },
      },
      {
        capability: 'Culinary and finance core',
        detail: 'Menus, recipes, food costing, invoices, payment tracking, and ledger tools.',
        values: {
          free: { state: 'included', note: 'Included' },
          pro: { state: 'included', note: 'Included' },
          scale: { state: 'included', note: 'Included' },
        },
      },
      {
        capability: 'Module personalization',
        detail: 'Turn product areas on/off in settings to match your workflow.',
        values: {
          free: { state: 'limited', note: 'Core module set' },
          pro: { state: 'included', note: 'All modules' },
          scale: { state: 'included', note: 'All modules + rollout help' },
        },
      },
    ],
  },
  {
    label: 'Automation and growth',
    rows: [
      {
        capability: 'Remy AI assistant',
        detail: 'AI drafting and assistant workflows for faster execution.',
        values: {
          free: { state: 'not_included', note: 'Pro only' },
          pro: { state: 'included', note: 'Included' },
          scale: { state: 'included', note: 'Included' },
        },
      },
      {
        capability: 'Marketing and custom reports',
        detail: 'Campaign tooling and custom reporting used for growth loops.',
        values: {
          free: { state: 'not_included', note: 'Pro only' },
          pro: { state: 'included', note: 'Included' },
          scale: { state: 'included', note: 'Included' },
        },
      },
      {
        capability: 'Integrations and automations',
        detail: 'Connect external systems and automate data movement.',
        values: {
          free: { state: 'not_included', note: 'Pro only' },
          pro: { state: 'included', note: 'Included' },
          scale: { state: 'included', note: 'Included' },
        },
      },
      {
        capability: 'Commerce engine',
        detail: 'Register, products, reconciliation, and commerce reporting.',
        values: {
          free: { state: 'not_included', note: 'Pro only' },
          pro: { state: 'included', note: 'Included' },
          scale: { state: 'included', note: 'Included' },
        },
      },
      {
        capability: 'Protection and professional workflows',
        detail: 'Compliance, continuity, and career development toolsets.',
        values: {
          free: { state: 'not_included', note: 'Pro only' },
          pro: { state: 'included', note: 'Included' },
          scale: { state: 'included', note: 'Included' },
        },
      },
    ],
  },
  {
    label: 'Scale services',
    rows: [
      {
        capability: 'Multi-chef rollout planning',
        detail: 'Implementation design for teams adopting ChefFlow together.',
        values: {
          free: { state: 'not_included', note: 'Not included' },
          pro: { state: 'not_included', note: 'Not included' },
          scale: { state: 'pilot', note: 'Pilot support' },
        },
      },
      {
        capability: 'Migration and process coaching',
        detail: 'High-touch onboarding for replacing fragmented tools and legacy workflows.',
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
    answer: 'No. You can start on Free without entering card details.',
  },
  {
    question: 'What happens after the Pro trial ends?',
    answer: `After ${PRO_TRIAL_DAYS} days, Pro continues at $${PRO_PRICE_MONTHLY}/month unless you cancel before renewal.`,
  },
  {
    question: 'Can I switch between Free and Pro later?',
    answer:
      'Yes. Upgrade when you need Pro functions and downgrade when you need only core workflows.',
  },
  {
    question: 'Do you charge extra transaction fees?',
    answer:
      'ChefFlow does not add its own transaction surcharge. Your payment processor may still apply standard processing fees.',
  },
  {
    question: 'What is the Scale plan?',
    answer:
      'Scale is a pilot package for teams that need rollout help, migration planning, and implementation support.',
  },
]
