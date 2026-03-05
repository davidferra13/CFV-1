export type CompareRow = {
  capability: string
  chefflow: string
  alternative: string
}

export type CompareFaq = {
  question: string
  answer: string
}

export type ComparePage = {
  slug: string
  alternativeName: string
  title: string
  summary: string
  heroDescription: string
  idealFor: string[]
  notIdealFor: string[]
  migrationSteps: string[]
  rows: CompareRow[]
  faqs: CompareFaq[]
}

export const COMPARE_PAGES: ComparePage[] = [
  {
    slug: 'honeybook',
    alternativeName: 'HoneyBook',
    title: 'ChefFlow vs HoneyBook for Private Chefs',
    summary:
      'HoneyBook is strong for generic service businesses. ChefFlow is purpose-built for private chef workflows from inquiry to event execution.',
    heroDescription:
      'Use this breakdown if you need to decide whether a broad CRM stack is enough or if your operation needs chef-specific workflow depth.',
    idealFor: [
      'Private chefs handling menu approvals and event logistics weekly.',
      'Operators who want inquiry, quote, event, and payment status in one flow.',
      'Teams that need less manual handoff between CRM and production tasks.',
    ],
    notIdealFor: [
      'Agencies that only need contract + invoice workflow.',
      'Teams that do not run recurring private dining operations.',
      'Businesses with no need for event menu and prep visibility.',
    ],
    migrationSteps: [
      'Map your current inquiry and proposal steps into one baseline workflow.',
      'Import active leads and upcoming events, then lock stage definitions.',
      'Launch payment and event tracking in parallel for one billing cycle.',
      'Retire duplicate spreadsheets once event status and margin visibility are stable.',
    ],
    rows: [
      {
        capability: 'Private-chef workflow depth',
        chefflow: 'Inquiry -> quote -> event -> payout in one operating path.',
        alternative: 'General project CRM with custom setup required for chef workflows.',
      },
      {
        capability: 'Event operations visibility',
        chefflow: 'Built-in event and execution context tied to client records.',
        alternative: 'Requires manual linking across jobs, notes, and documents.',
      },
      {
        capability: 'Menu and service context',
        chefflow: 'Menu approvals and event context stay attached to the same record.',
        alternative: 'Often managed through external docs and attachments.',
      },
      {
        capability: 'Deployment speed',
        chefflow: 'Faster launch for chef-specific operations.',
        alternative: 'Longer setup due to generalized templates.',
      },
    ],
    faqs: [
      {
        question: 'Can ChefFlow replace both CRM and event-tracking spreadsheets?',
        answer:
          'Yes. The core workflow is designed to keep client, event, and payment context in one place.',
      },
      {
        question: 'Is HoneyBook still useful for some chef businesses?',
        answer:
          'Yes. If your workflow is mostly proposals + invoices, a generalized stack can still be enough.',
      },
    ],
  },
  {
    slug: 'dubsado',
    alternativeName: 'Dubsado',
    title: 'ChefFlow vs Dubsado for Private Chef Operations',
    summary:
      'Dubsado offers strong automation primitives, but ChefFlow is tuned for private-chef operations where event execution context matters every week.',
    heroDescription:
      'This page focuses on where generalized workflow automation works well and where chef-specific operating context becomes critical.',
    idealFor: [
      'Chefs running multi-event weeks who need predictable stage visibility.',
      'Businesses that want less custom workflow maintenance.',
      'Operators standardizing the handoff from sales to execution.',
    ],
    notIdealFor: [
      'Users who want unlimited custom CRM schemas for non-chef industries.',
      'Teams with no event operations layer.',
      'Organizations already committed to heavy Dubsado-specific automation investments.',
    ],
    migrationSteps: [
      'Define your current automation triggers by stage and owner.',
      'Replicate only high-value automations inside ChefFlow first.',
      'Run both systems for one cycle and compare response times and handoffs.',
      'Turn off duplicate automations once the new baseline is stable.',
    ],
    rows: [
      {
        capability: 'Automation model',
        chefflow: 'Chef-centric workflows with standardized lifecycle actions.',
        alternative: 'Flexible automation engine requiring more custom design.',
      },
      {
        capability: 'Sales-to-execution continuity',
        chefflow: 'Built for handoff between inquiry and event operations.',
        alternative: 'Possible, but often configured manually through workflows.',
      },
      {
        capability: 'Operational reporting',
        chefflow: 'Designed around private chef operating metrics.',
        alternative: 'Requires custom reporting layers for chef-specific KPIs.',
      },
      {
        capability: 'Long-term maintenance',
        chefflow: 'Lower config overhead for chef-focused teams.',
        alternative: 'Higher upkeep if workflows are heavily customized.',
      },
    ],
    faqs: [
      {
        question: 'Do I lose flexibility by moving from Dubsado to ChefFlow?',
        answer:
          'You trade some open-ended workflow design for faster chef-specific execution and less maintenance.',
      },
      {
        question: 'How should I migrate safely?',
        answer:
          'Migrate live opportunities first, keep legacy automations in read-only mode, then deprecate after one clean cycle.',
      },
    ],
  },
  {
    slug: 'spreadsheets',
    alternativeName: 'Spreadsheets + Docs',
    title: 'ChefFlow vs Spreadsheets for Private Chef Teams',
    summary:
      'Spreadsheets are flexible at the start but break under multi-event complexity. ChefFlow centralizes client, event, and payment state so nothing slips.',
    heroDescription:
      'If your operation still runs through sheets, docs, and chat threads, this comparison shows when the manual stack starts costing real margin.',
    idealFor: [
      'Chefs booking repeat events and needing less admin drag.',
      'Teams that want one source of truth for client and event status.',
      'Operators who need clear accountability across handoffs.',
    ],
    notIdealFor: [
      'Single-event hobby workflows with low operational complexity.',
      'Teams unwilling to standardize process terminology and stages.',
      'Operations with no near-term need for workflow consistency.',
    ],
    migrationSteps: [
      'Audit every spreadsheet and identify one owner per data domain.',
      'Migrate active inquiries/events first, then archive old records.',
      'Define one stage model and require updates in-system only.',
      'Remove duplicate trackers after two clean reporting cycles.',
    ],
    rows: [
      {
        capability: 'System of record',
        chefflow: 'Unified source of truth for pipeline, events, and payment status.',
        alternative: 'Data spread across files, tabs, and message threads.',
      },
      {
        capability: 'Error risk',
        chefflow: 'Lower risk through standardized state transitions.',
        alternative: 'Higher manual copy/paste and stale-data risk.',
      },
      {
        capability: 'Team collaboration',
        chefflow: 'Shared workflow context with role-aware access.',
        alternative: 'Version drift and unclear ownership across files.',
      },
      {
        capability: 'Scalability',
        chefflow: 'Operationally stable as event volume grows.',
        alternative: 'Manual overhead grows quickly with each new event.',
      },
    ],
    faqs: [
      {
        question: 'When should I leave spreadsheets?',
        answer:
          'Usually when event volume or client complexity causes repeated follow-up misses and margin confusion.',
      },
      {
        question: 'Can I still export data if I move to ChefFlow?',
        answer:
          'Yes. You can still pull structured records while maintaining one live operating baseline.',
      },
    ],
  },
]

export function getComparePage(slug: string): ComparePage | null {
  return COMPARE_PAGES.find((page) => page.slug === slug) ?? null
}
