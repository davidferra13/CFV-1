import {
  isAdminRoutePath,
  isChefRoutePath,
  isClientRoutePath,
  isPartnerRoutePath,
  isPublicUnauthenticatedPath,
  isStaffRoutePath,
  isVendorRoutePath,
} from '@/lib/auth/route-policy'

export type UrlCapabilityRole =
  | 'public'
  | 'chef'
  | 'client'
  | 'admin'
  | 'staff'
  | 'partner'
  | 'vendor'

export type UrlCapabilityActionTone = 'primary' | 'secondary' | 'recovery' | 'proof' | 'blocked'

export type UrlCapabilityAction = {
  id: string
  label: string
  description: string
  tone: UrlCapabilityActionTone
  href?: string
  requiresApproval?: boolean
  sensitive?: boolean
  disabledReason?: string
}

export type UrlCapabilityContract = {
  routePattern: string
  title: string
  portal: UrlCapabilityRole
  roles: UrlCapabilityRole[]
  domain: string
  primaryObject: string
  relatedObjects: string[]
  readable: string[]
  writable: string[]
  selectable: string[]
  sensitive: string[]
  shareability: 'none' | 'internal' | 'client_safe' | 'public'
  urlState: 'none' | 'query_state' | 'deep_link' | 'saved_view'
  savedView: boolean
  primaryAction: UrlCapabilityAction
  contextActions: UrlCapabilityAction[]
  recoveryActions: UrlCapabilityAction[]
  proofActions: UrlCapabilityAction[]
  blockedActions: UrlCapabilityAction[]
  remy: {
    canExplain: boolean
    canPrepare: boolean
    approvalRequired: boolean
    prompt: string
  }
  xray: {
    page: string
    routePolicy: string
    railReadiness: 'ready' | 'partial' | 'missing'
    finishGate: string[]
  }
  confidence: {
    source: string
    lastUpdated: string
    freshness: 'fresh' | 'review' | 'stale' | 'unknown'
    confidence: number
    syncStatus: 'synced' | 'delayed' | 'unknown'
  }
}

export type UrlCapabilityXrayReport = {
  route: string
  role: UrlCapabilityRole
  status: 'covered' | 'missing_contract'
  actionCompleteness: 'complete' | 'partial' | 'missing'
  contract?: UrlCapabilityContract
  missing: string[]
  routePolicy: {
    expected: string
    actual: string
    aligned: boolean
  }
}

export type UrlCapabilityConfidenceStrip = {
  routePattern: string
  role: UrlCapabilityRole
  display: 'show' | 'suppress'
  freshness: UrlCapabilityContract['confidence']['freshness']
  permissionState: 'allowed' | 'blocked'
  sourceLabel: string
  lastUpdated: string
  confidence: number
  syncStatus: UrlCapabilityContract['confidence']['syncStatus']
  sensitivityWarning: boolean
  proofLinks: UrlCapabilityAction[]
  reasons: string[]
}

const UPDATED_AT = '2026-05-19T10:11:33.083Z'
const FINISH_GATE = ['route-policy', 'capability-contract', 'confidence-strip', 'wiring-audit']

function action(
  id: string,
  label: string,
  href: string | undefined,
  description: string,
  tone: UrlCapabilityActionTone,
  options: Pick<UrlCapabilityAction, 'requiresApproval' | 'sensitive' | 'disabledReason'> = {}
): UrlCapabilityAction {
  return { id, label, href, description, tone, ...options }
}

function baseContract(
  contract: Omit<UrlCapabilityContract, 'portal' | 'roles' | 'remy' | 'confidence'>
): UrlCapabilityContract {
  return {
    ...contract,
    portal: 'chef',
    roles: ['chef', 'admin'],
    remy: {
      canExplain: true,
      canPrepare: true,
      approvalRequired: true,
      prompt: `Explain what matters on ${contract.title} and prepare the safest next action.`,
    },
    confidence: {
      source: `URL capability registry + ${contract.domain} route policy`,
      lastUpdated: UPDATED_AT,
      freshness: contract.xray.railReadiness === 'ready' ? 'fresh' : 'review',
      confidence: contract.xray.railReadiness === 'ready' ? 0.92 : 0.82,
      syncStatus: 'synced',
    },
  }
}

const CONTRACTS: UrlCapabilityContract[] = [
  baseContract({
    routePattern: '/dashboard',
    title: 'Dashboard Command Center',
    domain: 'dashboard',
    primaryObject: 'operating day',
    relatedObjects: ['events', 'clients', 'inquiries', 'payments', 'rail signals'],
    readable: ['today schedule', 'priority actions', 'client attention', 'revenue pulse'],
    writable: ['quick expense', 'quick note', 'availability', 'task completion'],
    selectable: ['dashboard section', 'rail item', 'priority action'],
    sensitive: ['revenue', 'client names', 'payment status'],
    shareability: 'internal',
    urlState: 'deep_link',
    savedView: true,
    primaryAction: action(
      'dashboard.resolve-next',
      'Resolve next',
      '/queue',
      'Open the highest-confidence action queue for the current operating day.',
      'primary'
    ),
    contextActions: [
      action(
        'dashboard.new-event',
        'New event',
        '/events/new',
        'Create a client event.',
        'secondary'
      ),
      action(
        'dashboard.inbox',
        'Open inbox',
        '/inbox',
        'Review waiting communications.',
        'secondary'
      ),
      action(
        'dashboard.expense',
        'Log expense',
        '/expenses/new',
        'Capture a cost before it goes stale.',
        'secondary'
      ),
      action(
        'dashboard.intel',
        'Intelligence',
        '/intelligence',
        'Review CIL and business signals.',
        'secondary'
      ),
    ],
    recoveryActions: [
      action(
        'dashboard.tune',
        'Tune dashboard',
        '/settings/dashboard',
        'Recover hidden or noisy dashboard widgets.',
        'recovery'
      ),
      action(
        'dashboard.health',
        'Health check',
        '/settings/health',
        'Inspect app and account readiness.',
        'recovery'
      ),
    ],
    proofActions: [
      action(
        'dashboard.xray',
        'Page X-Ray',
        '/settings/developer',
        'Inspect route and finish-gate coverage.',
        'proof'
      ),
      action(
        'dashboard.audit',
        'Audit trail',
        '/activity',
        'Open recent changes for this workspace.',
        'proof'
      ),
    ],
    blockedActions: [
      action(
        'dashboard.bulk-delete',
        'Bulk destructive changes',
        undefined,
        'Use the owning record page.',
        'blocked',
        {
          disabledReason: 'Destructive changes require entity-specific context.',
        }
      ),
    ],
    xray: {
      page: 'docs/xrays/pages/dashboard.md',
      routePolicy: 'CHEF_PROTECTED_PATHS:/dashboard',
      railReadiness: 'ready',
      finishGate: FINISH_GATE,
    },
  }),
  baseContract({
    routePattern: '/features',
    title: 'All Features Directory',
    domain: 'navigation',
    primaryObject: 'feature directory',
    relatedObjects: [
      'sidebar groups',
      'progressive disclosure',
      'module settings',
      'command surfaces',
    ],
    readable: ['feature categories', 'available routes', 'discovery state'],
    writable: ['feature exploration state', 'navigation preferences'],
    selectable: ['feature card', 'category filter', 'navigation destination'],
    sensitive: [],
    shareability: 'internal',
    urlState: 'deep_link',
    savedView: false,
    primaryAction: action(
      'features.open-directory',
      'Show all features',
      '/features',
      'Open the canonical escape hatch for every chef feature surface.',
      'primary'
    ),
    contextActions: [
      action(
        'features.configure-navigation',
        'Navigation settings',
        '/settings/navigation',
        'Choose which shortcuts appear in the chef sidebar.',
        'secondary'
      ),
      action(
        'features.configure-modules',
        'Module settings',
        '/settings/modules',
        'Review enabled feature modules.',
        'secondary'
      ),
      action(
        'features.dashboard',
        'Back to Today',
        '/dashboard',
        'Return to the primary operating surface.',
        'secondary'
      ),
    ],
    recoveryActions: [
      action(
        'features.simplify',
        'Simplify sidebar',
        '/settings/navigation',
        'Recover a simpler sidebar after exploring deeper surfaces.',
        'recovery'
      ),
    ],
    proofActions: [
      action(
        'features.route-proof',
        'Route proof',
        '/settings/developer',
        'Inspect chef route and capability coverage.',
        'proof'
      ),
    ],
    blockedActions: [],
    xray: {
      page: 'docs/xrays/pages/features.md',
      routePolicy: 'CHEF_PROTECTED_PATHS:/features',
      railReadiness: 'ready',
      finishGate: ['route-policy', 'capability-contract', 'progressive-disclosure'],
    },
  }),
  baseContract({
    routePattern: '/onboarding/features',
    title: 'Feature Discovery',
    domain: 'navigation',
    primaryObject: 'feature discovery page',
    relatedObjects: ['feature directory', 'sidebar groups', 'progressive disclosure'],
    readable: ['feature categories', 'feature descriptions', 'exploration progress'],
    writable: ['feature exploration state'],
    selectable: ['feature card', 'category filter', 'navigation destination'],
    sensitive: [],
    shareability: 'internal',
    urlState: 'deep_link',
    savedView: false,
    primaryAction: action(
      'feature-discovery.open-directory',
      'Show all features',
      '/features',
      'Use the stable all-features URL even when the discovery page is the rendered target.',
      'primary'
    ),
    contextActions: [
      action(
        'feature-discovery.navigation',
        'Navigation settings',
        '/settings/navigation',
        'Tune sidebar shortcuts and feature discovery.',
        'secondary'
      ),
      action(
        'feature-discovery.modules',
        'Module settings',
        '/settings/modules',
        'Review enabled feature modules.',
        'secondary'
      ),
      action(
        'feature-discovery.today',
        'Back to Today',
        '/dashboard',
        'Return to the primary chef workspace.',
        'secondary'
      ),
    ],
    recoveryActions: [
      action(
        'feature-discovery.reset-nav',
        'Reset navigation',
        '/settings/navigation',
        'Recover a predictable sidebar configuration.',
        'recovery'
      ),
    ],
    proofActions: [
      action(
        'feature-discovery.route-proof',
        'Route proof',
        '/settings/developer',
        'Inspect chef route and capability coverage.',
        'proof'
      ),
    ],
    blockedActions: [],
    xray: {
      page: 'docs/xrays/pages/onboarding-features.md',
      routePolicy: 'CHEF_PROTECTED_PATHS:/onboarding',
      railReadiness: 'ready',
      finishGate: ['route-policy', 'capability-contract', 'progressive-disclosure'],
    },
  }),
  baseContract({
    routePattern: '/events/[id]',
    title: 'Event Detail',
    domain: 'events',
    primaryObject: 'event',
    relatedObjects: ['client', 'menu', 'quote', 'staffing', 'payments', 'communications'],
    readable: ['status', 'timeline', 'client requirements', 'menu state', 'payments'],
    writable: ['status', 'tasks', 'timeline notes', 'menu approvals', 'staff assignments'],
    selectable: ['task', 'menu item', 'guest', 'payment milestone'],
    sensitive: ['client address', 'dietary restrictions', 'private notes', 'payment status'],
    shareability: 'client_safe',
    urlState: 'deep_link',
    savedView: true,
    primaryAction: action(
      'event.advance',
      'Advance readiness',
      '/events',
      'Move the event to the next verified state.',
      'primary',
      {
        requiresApproval: true,
      }
    ),
    contextActions: [
      action(
        'event.message',
        'Message client',
        '/inbox',
        'Open the event communication thread.',
        'secondary'
      ),
      action(
        'event.menu',
        'Menu work',
        '/menus',
        'Review menu decisions and approvals.',
        'secondary'
      ),
      action('event.quote', 'Quote', '/quotes', 'Inspect pricing and payment state.', 'secondary'),
      action(
        'event.prep',
        'Prep',
        '/prep/consolidation',
        'Open prep and procurement context.',
        'secondary'
      ),
    ],
    recoveryActions: [
      action(
        'event.timeline',
        'Repair timeline',
        '/events',
        'Recover stale lifecycle steps.',
        'recovery'
      ),
      action(
        'event.documents',
        'Documents',
        '/documents',
        'Find proof and deliverables.',
        'recovery'
      ),
    ],
    proofActions: [
      action('event.xray', 'Event X-Ray', '/settings/developer', 'Inspect route gaps.', 'proof'),
      action('event.audit', 'Event audit', '/activity', 'Review event changes.', 'proof'),
    ],
    blockedActions: [
      action(
        'event.auto-send',
        'Auto-send sensitive update',
        undefined,
        'Approval required first.',
        'blocked',
        {
          sensitive: true,
          disabledReason: 'Sensitive client/event data requires approval.',
        }
      ),
    ],
    xray: {
      page: 'docs/xrays/pages/events-id.md',
      routePolicy: 'CHEF_PROTECTED_PATHS:/events',
      railReadiness: 'partial',
      finishGate: ['route-policy', 'tenant-scope', 'capability-contract', 'rail-profile'],
    },
  }),
  baseContract({
    routePattern: '/events',
    title: 'Events',
    domain: 'events',
    primaryObject: 'event list',
    relatedObjects: ['clients', 'menus', 'quotes', 'payments'],
    readable: ['event list', 'statuses', 'dates', 'client names'],
    writable: ['event creation', 'filters', 'bulk triage'],
    selectable: ['event', 'status filter', 'date range'],
    sensitive: ['client names', 'event locations'],
    shareability: 'internal',
    urlState: 'query_state',
    savedView: true,
    primaryAction: action(
      'events.new',
      'New event',
      '/events/new',
      'Create a new event.',
      'primary'
    ),
    contextActions: [
      action('events.calendar', 'Calendar', '/calendar', 'View events by date.', 'secondary'),
      action(
        'events.inquiries',
        'Inquiries',
        '/inquiries',
        'Promote inquiries into events.',
        'secondary'
      ),
      action('events.queue', 'Queue', '/queue', 'Triage event blockers.', 'secondary'),
    ],
    recoveryActions: [
      action(
        'events.import',
        'Import',
        '/imports/business-history',
        'Recover historical events.',
        'recovery'
      ),
    ],
    proofActions: [
      action(
        'events.policy',
        'Route proof',
        '/settings/developer',
        'Inspect capability coverage.',
        'proof'
      ),
    ],
    blockedActions: [],
    xray: {
      page: 'docs/xrays/pages/events.md',
      routePolicy: 'CHEF_PROTECTED_PATHS:/events',
      railReadiness: 'partial',
      finishGate: FINISH_GATE,
    },
  }),
  baseContract({
    routePattern: '/clients/contribution',
    title: 'Client Contribution',
    domain: 'clients',
    primaryObject: 'client contribution portfolio',
    relatedObjects: ['clients', 'events', 'ledger entries', 'expenses', 'review notes'],
    readable: ['contribution score', 'revenue', 'profit', 'margin', 'risk', 'review state'],
    writable: ['review state', 'dismissal', 'pin', 'tier override', 'next review date'],
    selectable: ['client', 'tier', 'risk view', 'missing data repair path'],
    sensitive: ['client names', 'revenue', 'profit', 'private decision notes'],
    shareability: 'none',
    urlState: 'query_state',
    savedView: true,
    primaryAction: action(
      'clients.contribution.review',
      'Review contribution',
      '/clients/contribution?view=review',
      'Open client contribution recommendations that still need review.',
      'primary'
    ),
    contextActions: [
      action(
        'clients.contribution.missing',
        'Repair data',
        '/clients/contribution?view=missing',
        'Find clients with missing evidence.',
        'secondary'
      ),
      action(
        'clients.contribution.risk',
        'At-risk value',
        '/clients/contribution?view=risk',
        'Review high-value dormant clients.',
        'secondary'
      ),
      action(
        'clients.contribution.collections',
        'Collections',
        '/clients/contribution?view=collections',
        'Find clients with outstanding balances.',
        'secondary'
      ),
      action(
        'clients.contribution.export',
        'Export CSV',
        '/clients/contribution/export',
        'Download the tenant-scoped contribution table.',
        'secondary'
      ),
    ],
    recoveryActions: [
      action(
        'clients.contribution.import',
        'Import history',
        '/import',
        'Repair missing event and client history.',
        'recovery'
      ),
      action(
        'clients.contribution.ledger',
        'Open ledger',
        '/finance/ledger',
        'Repair payment and expense evidence.',
        'recovery'
      ),
    ],
    proofActions: [
      action(
        'clients.contribution.xray',
        'Capability proof',
        '/settings/developer',
        'Inspect contribution route coverage.',
        'proof'
      ),
      action(
        'clients.contribution.audit',
        'Activity audit',
        '/activity',
        'Review contribution state changes.',
        'proof'
      ),
    ],
    blockedActions: [
      action(
        'clients.contribution.public-share',
        'Share contribution data',
        undefined,
        'Contribution data is chef-only.',
        'blocked',
        {
          sensitive: true,
          disabledReason: 'Client contribution contains private revenue and decision data.',
        }
      ),
    ],
    xray: {
      page: 'docs/xrays/pages/clients-contribution.md',
      routePolicy: 'CHEF_PROTECTED_PATHS:/clients/contribution',
      railReadiness: 'ready',
      finishGate: [
        'route-policy',
        'tenant-scope',
        'client-intelligence',
        'csv-export',
        'review-state',
      ],
    },
  }),
  baseContract({
    routePattern: '/clients/[id]',
    title: 'Client Detail',
    domain: 'clients',
    primaryObject: 'client',
    relatedObjects: ['household', 'events', 'preferences', 'payments', 'messages'],
    readable: ['profile', 'preferences', 'history', 'relationship signals'],
    writable: ['notes', 'preferences', 'follow-ups', 'household details'],
    selectable: ['client note', 'preference', 'event history'],
    sensitive: ['dietary needs', 'private notes', 'household details', 'contact details'],
    shareability: 'none',
    urlState: 'deep_link',
    savedView: true,
    primaryAction: action(
      'client.follow-up',
      'Plan follow-up',
      '/reminders',
      'Create the next relationship action.',
      'primary'
    ),
    contextActions: [
      action('client.message', 'Message', '/inbox', 'Open client communications.', 'secondary'),
      action('client.event', 'New event', '/events/new', 'Start a new booking.', 'secondary'),
      action('client.prefs', 'Preferences', '/clients', 'Review remembered needs.', 'secondary'),
    ],
    recoveryActions: [
      action(
        'client.dedupe',
        'Review duplicates',
        '/clients',
        'Recover duplicate records.',
        'recovery'
      ),
    ],
    proofActions: [
      action(
        'client.audit',
        'Client audit',
        '/activity',
        'Review relationship data changes.',
        'proof'
      ),
    ],
    blockedActions: [
      action(
        'client.share-private',
        'Share private profile',
        undefined,
        'Private client intelligence is chef-only.',
        'blocked',
        {
          sensitive: true,
          disabledReason: 'Private client data cannot be shared from URL Rail.',
        }
      ),
    ],
    xray: {
      page: 'docs/xrays/pages/clients-id.md',
      routePolicy: 'CHEF_PROTECTED_PATHS:/clients',
      railReadiness: 'partial',
      finishGate: ['route-policy', 'tenant-scope', 'client-intelligence', 'capability-contract'],
    },
  }),
  baseContract({
    routePattern: '/clients',
    title: 'Clients',
    domain: 'clients',
    primaryObject: 'client list',
    relatedObjects: ['households', 'events', 'messages', 'preferences'],
    readable: ['client list', 'segments', 'relationship status'],
    writable: ['client creation', 'import', 'tags', 'follow-ups'],
    selectable: ['client', 'segment', 'table row'],
    sensitive: ['contact details', 'private notes'],
    shareability: 'internal',
    urlState: 'query_state',
    savedView: true,
    primaryAction: action(
      'clients.new',
      'New client',
      '/clients/new',
      'Create a client record.',
      'primary'
    ),
    contextActions: [
      action(
        'clients.import',
        'Import clients',
        '/import',
        'Bring in client history.',
        'secondary'
      ),
      action(
        'clients.retention',
        'Retention',
        '/clients/insights/retention',
        'Inspect relationship risk.',
        'secondary'
      ),
      action('clients.inbox', 'Inbox', '/inbox', 'Open client conversations.', 'secondary'),
    ],
    recoveryActions: [
      action(
        'clients.portal',
        'Portal visibility',
        '/settings/client-preview',
        'Review client-facing visibility.',
        'recovery'
      ),
    ],
    proofActions: [
      action(
        'clients.xray',
        'Capability proof',
        '/settings/developer',
        'Inspect client coverage.',
        'proof'
      ),
    ],
    blockedActions: [],
    xray: {
      page: 'docs/xrays/pages/clients.md',
      routePolicy: 'CHEF_PROTECTED_PATHS:/clients',
      railReadiness: 'partial',
      finishGate: ['route-policy', 'capability-contract', 'client-intelligence'],
    },
  }),
  baseContract({
    routePattern: '/menus/[id]',
    title: 'Menu Detail',
    domain: 'menus',
    primaryObject: 'menu',
    relatedObjects: ['recipes', 'client approvals', 'dietary constraints', 'pricing'],
    readable: ['menu sections', 'dish status', 'dietary flags', 'approval state'],
    writable: ['dish edits', 'approval requests', 'menu notes'],
    selectable: ['dish', 'course', 'approval item'],
    sensitive: ['dietary flags', 'private client feedback', 'margin context'],
    shareability: 'client_safe',
    urlState: 'deep_link',
    savedView: true,
    primaryAction: action(
      'menu.resolve',
      'Resolve menu',
      '/menus',
      'Advance menu decisions safely.',
      'primary'
    ),
    contextActions: [
      action(
        'menu.estimate',
        'Estimate',
        '/menus/estimate',
        'Check cost and pricing.',
        'secondary'
      ),
      action('menu.recipes', 'Recipes', '/recipes', 'Open linked recipe work.', 'secondary'),
      action(
        'menu.client',
        'Client approval',
        '/inbox',
        'Prepare a client-safe update.',
        'secondary'
      ),
    ],
    recoveryActions: [
      action(
        'menu.allergens',
        'Allergen review',
        '/safety',
        'Recover missing allergen checks.',
        'recovery'
      ),
    ],
    proofActions: [
      action('menu.audit', 'Menu proof', '/activity', 'Review menu decision history.', 'proof'),
    ],
    blockedActions: [
      action(
        'menu.ai-recipe',
        'Generate recipe',
        undefined,
        'AI cannot create canonical recipes.',
        'blocked',
        {
          disabledReason: 'Recipe authority stays with the chef.',
        }
      ),
    ],
    xray: {
      page: 'docs/xrays/pages/menus-id.md',
      routePolicy: 'CHEF_PROTECTED_PATHS:/menus',
      railReadiness: 'partial',
      finishGate: ['route-policy', 'menu-intelligence', 'pie', 'capability-contract'],
    },
  }),
  baseContract({
    routePattern: '/inquiries',
    title: 'Inquiries',
    domain: 'inquiries',
    primaryObject: 'inquiry list',
    relatedObjects: ['clients', 'events', 'quotes', 'messages'],
    readable: ['lead details', 'status', 'source', 'requested date'],
    writable: ['status', 'assignment', 'response', 'conversion'],
    selectable: ['inquiry', 'lead source', 'status'],
    sensitive: ['contact details', 'private request notes'],
    shareability: 'internal',
    urlState: 'query_state',
    savedView: true,
    primaryAction: action(
      'inquiries.reply',
      'Reply next',
      '/inbox',
      'Respond to the next waiting inquiry.',
      'primary'
    ),
    contextActions: [
      action(
        'inquiries.new',
        'New inquiry',
        '/inquiries/new',
        'Create or log an inquiry.',
        'secondary'
      ),
      action(
        'inquiries.event',
        'Create event',
        '/events/new',
        'Convert a qualified inquiry.',
        'secondary'
      ),
      action('inquiries.quote', 'Quote', '/quotes/new', 'Start pricing work.', 'secondary'),
    ],
    recoveryActions: [
      action('inquiries.stale', 'Stale leads', '/queue', 'Find unanswered leads.', 'recovery'),
    ],
    proofActions: [
      action(
        'inquiries.source',
        'Source proof',
        '/activity',
        'Inspect lead/source changes.',
        'proof'
      ),
    ],
    blockedActions: [],
    xray: {
      page: 'docs/xrays/pages/inquiries.md',
      routePolicy: 'CHEF_PROTECTED_PATHS:/inquiries',
      railReadiness: 'partial',
      finishGate: ['route-policy', 'communications', 'capability-contract'],
    },
  }),
  baseContract({
    routePattern: '/settings',
    title: 'Settings',
    domain: 'settings',
    primaryObject: 'workspace settings',
    relatedObjects: ['profile', 'payments', 'integrations', 'portal visibility'],
    readable: ['configuration', 'connection state', 'business profile'],
    writable: ['preferences', 'branding', 'integrations', 'visibility'],
    selectable: ['settings section', 'integration', 'preference'],
    sensitive: ['payment connections', 'integration status', 'business identity'],
    shareability: 'none',
    urlState: 'deep_link',
    savedView: false,
    primaryAction: action(
      'settings.review',
      'Review setup',
      '/settings/health',
      'Open setup and health checks.',
      'primary'
    ),
    contextActions: [
      action(
        'settings.profile',
        'Business profile',
        '/settings/business',
        'Edit business identity.',
        'secondary'
      ),
      action(
        'settings.integrations',
        'Integrations',
        '/settings/integrations',
        'Manage providers.',
        'secondary'
      ),
      action(
        'settings.externalContacts',
        'External Contacts',
        '/settings/external-contacts',
        'Bank, lawyer, accountant, commissary links.',
        'secondary'
      ),
      action(
        'settings.dashboard',
        'Dashboard layout',
        '/settings/dashboard',
        'Tune surface density.',
        'secondary'
      ),
    ],
    recoveryActions: [
      action(
        'settings.devices',
        'Devices',
        '/settings/devices',
        'Recover device/session issues.',
        'recovery'
      ),
    ],
    proofActions: [
      action(
        'settings.protection',
        'Protection',
        '/settings/protection',
        'Review safety and legal proof.',
        'proof'
      ),
    ],
    blockedActions: [
      action(
        'settings.secrets',
        'Export secrets',
        undefined,
        'Secrets are never exposed through URL Rail.',
        'blocked',
        {
          sensitive: true,
          disabledReason: 'Secret material is not user-downloadable.',
        }
      ),
    ],
    xray: {
      page: 'docs/xrays/pages/settings.md',
      routePolicy: 'CHEF_PROTECTED_PATHS:/settings',
      railReadiness: 'partial',
      finishGate: ['route-policy', 'security', 'capability-contract'],
    },
  }),
]

function normalizePath(pathname: string): string {
  const pathOnly = pathname.split('?')[0]?.split('#')[0] || '/'
  const normalized = pathOnly.replace(/\/+/g, '/').replace(/\/$/, '')
  return normalized || '/'
}

function patternMatches(pattern: string, pathname: string): boolean {
  const patternParts = normalizePath(pattern).split('/').filter(Boolean)
  const pathParts = normalizePath(pathname).split('/').filter(Boolean)
  if (patternParts.length !== pathParts.length) return false
  return patternParts.every((part, index) => part.startsWith('[') || part === pathParts[index])
}

function routePolicyFor(pathname: string): string {
  const path = normalizePath(pathname)
  if (isChefRoutePath(path)) return 'chef'
  if (isClientRoutePath(path)) return 'client'
  if (isAdminRoutePath(path)) return 'admin'
  if (isStaffRoutePath(path)) return 'staff'
  if (isPartnerRoutePath(path)) return 'partner'
  if (isVendorRoutePath(path)) return 'vendor'
  if (isPublicUnauthenticatedPath(path)) return 'public'
  return 'unknown'
}

export function listUrlCapabilityContracts(): readonly UrlCapabilityContract[] {
  return CONTRACTS
}

export function resolveUrlCapability(
  pathname: string,
  role: UrlCapabilityRole = 'chef'
): UrlCapabilityContract | null {
  const contract =
    CONTRACTS.find((item) => item.routePattern === normalizePath(pathname)) ??
    CONTRACTS.find((item) => patternMatches(item.routePattern, pathname))
  if (!contract || !contract.roles.includes(role)) return null
  return contract
}

export function getUrlCapabilityPaletteItems(
  pathname: string,
  role: UrlCapabilityRole = 'chef'
): UrlCapabilityAction[] {
  const contract = resolveUrlCapability(pathname, role)
  if (!contract) return []
  return [
    contract.primaryAction,
    ...contract.contextActions,
    ...contract.recoveryActions,
    ...contract.proofActions,
  ].filter((item) => item.href)
}

export function buildUrlCapabilityXrayReport(
  pathname: string,
  role: UrlCapabilityRole = 'chef'
): UrlCapabilityXrayReport {
  const contract = resolveUrlCapability(pathname, role)
  const actual = routePolicyFor(pathname)
  const expected = role

  if (!contract) {
    return {
      route: normalizePath(pathname),
      role,
      status: 'missing_contract',
      actionCompleteness: 'missing',
      missing: ['capability contract', 'rail action source', 'confidence strip'],
      routePolicy: { expected, actual, aligned: actual === expected },
    }
  }

  const missing = [
    !contract.primaryAction.href ? 'primary action href' : null,
    contract.contextActions.length === 0 ? 'context actions' : null,
    contract.proofActions.length === 0 ? 'proof actions' : null,
    contract.xray.railReadiness !== 'ready' ? 'fully proven rail profile' : null,
  ].filter((item): item is string => Boolean(item))

  return {
    route: normalizePath(pathname),
    role,
    status: 'covered',
    actionCompleteness: missing.length === 0 ? 'complete' : 'partial',
    contract,
    missing,
    routePolicy: { expected, actual, aligned: actual === expected },
  }
}

export function buildUrlCapabilityConfidenceStrip(
  pathname: string,
  role: UrlCapabilityRole = 'chef'
): UrlCapabilityConfidenceStrip {
  const contract = resolveUrlCapability(pathname, role)
  if (!contract) {
    return {
      routePattern: normalizePath(pathname),
      role,
      display: 'suppress',
      freshness: 'unknown',
      permissionState: 'blocked',
      sourceLabel: 'No capability contract',
      lastUpdated: '',
      confidence: 0,
      syncStatus: 'unknown',
      sensitivityWarning: false,
      proofLinks: [],
      reasons: ['missing_contract'],
    }
  }

  const reasons = [
    contract.sensitive.length > 0 ? 'contains_sensitive_fields' : null,
    contract.confidence.freshness !== 'fresh' ? `freshness_${contract.confidence.freshness}` : null,
    contract.confidence.confidence < 0.75 ? 'low_confidence' : null,
  ].filter((item): item is string => Boolean(item))

  return {
    routePattern: contract.routePattern,
    role,
    display: contract.confidence.confidence < 0.5 ? 'suppress' : 'show',
    freshness: contract.confidence.freshness,
    permissionState: contract.roles.includes(role) ? 'allowed' : 'blocked',
    sourceLabel: contract.confidence.source,
    lastUpdated: contract.confidence.lastUpdated,
    confidence: contract.confidence.confidence,
    syncStatus: contract.confidence.syncStatus,
    sensitivityWarning: contract.sensitive.length > 0,
    proofLinks: contract.proofActions,
    reasons,
  }
}
