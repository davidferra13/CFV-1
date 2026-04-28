export const DEPENDENCY_IMPORTANCE_VALUES = ['critical', 'high', 'medium', 'low'] as const

export type DependencyImportance = (typeof DEPENDENCY_IMPORTANCE_VALUES)[number]

export type DependencyCatalogItem = {
  id: string
  service: string
  provider: string
  usageCategory: string
  importance: DependencyImportance
  summary: string
  operationalNotes: string
}

const dependencyCatalog = [
  {
    id: 'auth-session',
    service: 'Auth and session',
    provider: 'Auth.js and ChefFlow role records',
    usageCategory: 'Authentication and access control',
    importance: 'critical',
    summary: 'Controls chef, client, staff, partner, and admin access boundaries.',
    operationalNotes:
      'A failure blocks protected app access and can affect tenant scoping decisions.',
  },
  {
    id: 'postgresql',
    service: 'PostgreSQL',
    provider: 'Primary relational database',
    usageCategory: 'Data persistence',
    importance: 'critical',
    summary: 'Stores tenant data, ledger records, events, clients, settings, and operational state.',
    operationalNotes:
      'A failure affects most authenticated workflows and must not be hidden as empty data.',
  },
  {
    id: 'stripe',
    service: 'Stripe',
    provider: 'Stripe',
    usageCategory: 'Payments and billing',
    importance: 'critical',
    summary: 'Handles client payments, subscription billing, Connect flows, and payment webhooks.',
    operationalNotes:
      'Payment lifecycle failures need explicit operator visibility and idempotent handling.',
  },
  {
    id: 'ollama-runtime',
    service: 'Ollama-compatible inference runtime',
    provider: 'ChefFlow inference runtime',
    usageCategory: 'AI inference',
    importance: 'critical',
    summary: 'Powers structured AI parsing and assistant workflows through the central gateway.',
    operationalNotes:
      'Runtime unavailability should fail clearly with no silent fallback or generated facts.',
  },
  {
    id: 'cloudflare',
    service: 'Cloudflare tunnel and DNS',
    provider: 'Cloudflare',
    usageCategory: 'Traffic delivery, routing, and edge protection',
    importance: 'high',
    summary: 'Supports public app routing, tunnel access, email routing, and edge security controls.',
    operationalNotes:
      'Routing or edge failures can block access even when the app and database are healthy.',
  },
  {
    id: 'resend-email',
    service: 'Resend email',
    provider: 'Resend',
    usageCategory: 'Transactional email and delivery events',
    importance: 'high',
    summary: 'Sends and tracks operational email for platform communication workflows.',
    operationalNotes:
      'Email failures should be logged as non-blocking unless the action depends on delivery.',
  },
  {
    id: 'google-apis',
    service: 'Google APIs',
    provider: 'Google',
    usageCategory: 'Calendar, mailbox, reviews, maps, and verification',
    importance: 'medium',
    summary: 'Supports optional connected workflows such as calendar truth, mailbox sync, and reviews.',
    operationalNotes:
      'Failures should degrade the specific connected workflow without inventing availability.',
  },
  {
    id: 'sentry-monitoring',
    service: 'Sentry monitoring',
    provider: 'Sentry',
    usageCategory: 'Error monitoring',
    importance: 'medium',
    summary: 'Captures application errors and release health signals for operators.',
    operationalNotes:
      'Monitoring outages reduce visibility but should not block core chef workflows.',
  },
  {
    id: 'posthog-analytics',
    service: 'PostHog analytics',
    provider: 'PostHog',
    usageCategory: 'Product analytics',
    importance: 'low',
    summary: 'Collects product usage signals that help evaluate app behavior.',
    operationalNotes:
      'Analytics outages should not affect operational workflows or displayed business data.',
  },
] as const satisfies readonly DependencyCatalogItem[]

export function getDependencyCatalog(): DependencyCatalogItem[] {
  return dependencyCatalog.map((dependency) => ({ ...dependency }))
}
