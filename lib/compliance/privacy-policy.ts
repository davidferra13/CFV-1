export const PRIVACY_POLICY_LAST_UPDATED = 'April 29, 2026'

export type PrivacyCommitment = {
  id: string
  title: string
  detail: string
}

export type PrivacyProcessor = {
  id: string
  name: string
  category: string
  purpose: string
  dataShared: string
  privacyUrl: string
  scope: 'core' | 'optional'
  consentGate?: 'cookie-consent'
  notes?: string
}

export type InternalDataPractice = {
  id: string
  title: string
  detail: string
}

export const PRIVACY_COMMITMENTS: PrivacyCommitment[] = [
  {
    id: 'no-sale',
    title: 'We do not sell your personal information.',
    detail:
      'We do not rent, license, trade, or broker personal information to advertisers, data brokers, or other third parties.',
  },
  {
    id: 'no-third-party-ads',
    title: 'We do not use your data for third-party advertising.',
    detail:
      'We do not support cross-context behavioral advertising, remarketing pixels, or enrichment feeds that use ChefFlow data to advertise other products or services.',
  },
  {
    id: 'service-providers-only',
    title: 'We only share personal information with service providers that help operate ChefFlow.',
    detail:
      'Those providers must process data only to deliver the service we request from them, and we limit the data sent to what is necessary for that job.',
  },
]

export const NO_DATA_SALE_BUILD_GUARDRAILS = [
  'Never sell, rent, license, trade, or broker personal information.',
  'Never send ChefFlow personal data to ad networks, remarketing tools, or data brokers.',
  'Only use processors that help deliver ChefFlow functionality.',
  'Minimize the data sent to each processor and strip unnecessary credentials, cookies, and free text whenever possible.',
  'Require user consent before enabling analytics cookies or similar optional tracking.',
  'Keep the public privacy policy aligned with the real runtime processors and optional integrations.',
] as const

export const INTERNAL_DATA_PRACTICES: InternalDataPractice[] = [
  {
    id: 'presence',
    title: 'Live presence and route context',
    detail:
      'ChefFlow records short-lived presence signals such as session ID, login state, current page, referrer, user agent, and time on site so authorized operators can monitor reliability, support, fraud, and active client workflows.',
  },
  {
    id: 'activity',
    title: 'Activity and workflow events',
    detail:
      'ChefFlow records portal events such as page views, quote views, payment page visits, conversation activity, document downloads, and route breadcrumbs. These records help power client activity panels, engagement scoring, support review, and data export.',
  },
  {
    id: 'admin-access',
    title: 'Authorized admin review',
    detail:
      'ChefFlow owners and platform admins may review tenant-scoped records, conversation transcripts, notifications, social posts, hub groups, activity events, and system diagnostics when needed to operate, secure, support, or moderate the platform. Sensitive admin actions and selected sensitive views are audit logged.',
  },
]

export const CORE_DATA_PROCESSORS: PrivacyProcessor[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'Payments',
    purpose: 'Payment processing, checkout, and billing records.',
    dataShared:
      'Payment details are submitted directly to Stripe. ChefFlow receives payment tokens and basic transaction metadata such as amount, status, and the last four digits of a card.',
    privacyUrl: 'https://stripe.com/privacy',
    scope: 'core',
  },
  {
    id: 'resend',
    name: 'Resend',
    category: 'Email delivery',
    purpose: 'Transactional email delivery.',
    dataShared:
      'Recipient email addresses and message content needed to send confirmations, receipts, reminders, and other product emails.',
    privacyUrl: 'https://resend.com/legal/privacy-policy',
    scope: 'core',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    category: 'Traffic delivery and edge security',
    purpose: 'DNS, traffic delivery, bot protection, DDoS protection, and edge security.',
    dataShared:
      'Web traffic and request metadata pass through Cloudflare infrastructure as part of serving and protecting ChefFlow.',
    privacyUrl: 'https://www.cloudflare.com/privacypolicy/',
    scope: 'core',
  },
  {
    id: 'posthog',
    name: 'PostHog',
    category: 'Product analytics',
    purpose: 'Consent-based usage analytics and product improvement.',
    dataShared:
      'Page views, feature usage, and product interaction events used to understand how ChefFlow is performing and what needs improvement.',
    privacyUrl: 'https://posthog.com/privacy',
    scope: 'core',
    consentGate: 'cookie-consent',
    notes: 'PostHog is loaded only after the user accepts analytics cookies.',
  },
  {
    id: 'sentry',
    name: 'Sentry',
    category: 'Error monitoring',
    purpose: 'Crash reporting, performance diagnostics, and reliability monitoring.',
    dataShared:
      'Error metadata and limited diagnostic context. Default PII sending is disabled, cookies and authorization headers are stripped, and masked replay settings are used when diagnostic replay is enabled.',
    privacyUrl: 'https://sentry.io/privacy/',
    scope: 'core',
  },
  {
    id: 'google-maps',
    name: 'Google Maps',
    category: 'Maps and address lookup',
    purpose: 'Address autocomplete, map rendering, and place selection features.',
    dataShared:
      'Address search queries, place lookups, and map requests needed to provide location and mapping features.',
    privacyUrl: 'https://policies.google.com/privacy',
    scope: 'core',
  },
]

export const OPTIONAL_PRIVACY_INTEGRATIONS: PrivacyProcessor[] = [
  {
    id: 'google',
    name: 'Google',
    category: 'Connected accounts',
    purpose: 'Optional Gmail and calendar sync when a chef chooses to connect Google services.',
    dataShared:
      'Mailbox and calendar data required for the specific Google features the chef turns on.',
    privacyUrl: 'https://policies.google.com/privacy',
    scope: 'optional',
  },
  {
    id: 'twilio',
    name: 'Twilio',
    category: 'Messaging and calling',
    purpose: 'Optional SMS, WhatsApp, and calling features, including BYO Twilio setups.',
    dataShared:
      'Phone numbers, message content, call metadata, and recordings only as needed to run the requested communication feature.',
    privacyUrl: 'https://www.twilio.com/en-us/legal/privacy',
    scope: 'optional',
  },
]
