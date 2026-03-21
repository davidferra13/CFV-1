// Pricing catalog - public-facing pricing data.
// All features are free. This catalog drives the public /pricing page
// and structured data. Scale tier retained for enterprise/team onboarding.

export type PricingPlanId = 'free' | 'scale'

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

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'ChefFlow',
    tag: 'Everything included',
    price: '$0',
    cadence: 'forever',
    highlighted: true,
    summary: 'The full operating platform for private chefs and food businesses.',
    ctaLabel: 'Get Started Free',
    ctaHref: '/auth/signup',
    points: [
      'Unlimited events, quotes, clients, menus, and recipes',
      'AI assistant (Remy) for business operations',
      'Commerce engine, marketing tools, and analytics',
      'Integrations, automations, and custom reporting',
      'Chef community, professional development, and protection tools',
      'Client portal, booking pages, invoicing, and payment collection',
      'No credit card required. No limits. No paywalls.',
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
      'Everything in ChefFlow',
      'Migration and rollout planning across chefs or locations',
      'Hands-on implementation support for workflows and change management',
      'Reserved for pilot customers today',
    ],
    finePrint: 'Scale is a guided onboarding package, not a self-serve checkout flow.',
  },
]

export const PRICING_FAQS = [
  {
    question: 'Is ChefFlow really free?',
    answer:
      'Yes. Every feature is included at no cost. No credit card, no trial period, no locked features.',
  },
  {
    question: 'How does ChefFlow make money?',
    answer:
      'We offer an optional voluntary supporter contribution for chefs who want to help fund ongoing development. It is entirely optional and does not unlock any additional features.',
  },
  {
    question: 'Do you charge transaction fees?',
    answer:
      'ChefFlow does not add its own transaction surcharge. Your payment processor (Stripe) applies standard processing fees.',
  },
  {
    question: 'What is the Scale plan?',
    answer:
      'Scale is a pilot package for teams that need rollout help, migration planning, and implementation support. Contact us for details.',
  },
  {
    question: 'Will features ever become paid?',
    answer:
      'We have no plans to lock existing features behind a paywall. Our goal is to keep the full platform free for every chef.',
  },
]
