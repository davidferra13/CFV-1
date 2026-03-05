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
  {
    slug: 'bonsai',
    alternativeName: 'Bonsai',
    title: 'ChefFlow vs Bonsai for Private Chef Businesses',
    summary:
      'Bonsai is solid for freelancers, but ChefFlow is tailored to recurring private-chef operations where event and kitchen context must stay connected.',
    heroDescription:
      'Use this comparison when your current freelance stack handles contracts but fails at operational event execution.',
    idealFor: [
      'Chefs who need booking and event delivery in one workflow.',
      'Operators replacing scattered freelance tooling with one system.',
      'Teams that need stronger visibility from lead to payout.',
    ],
    notIdealFor: [
      'Consulting-first workflows with no recurring event complexity.',
      'Teams that only need proposal and invoice documents.',
      'Businesses that do not manage menu or service execution details.',
    ],
    migrationSteps: [
      'Capture your active contracts and map them to pipeline stages.',
      'Migrate upcoming paid events first, then move historical records.',
      'Standardize event statuses for team-level visibility.',
      'Retire duplicate process docs after one full payment cycle.',
    ],
    rows: [
      {
        capability: 'Freelance admin coverage',
        chefflow: 'Covers admin and chef-specific event operations together.',
        alternative: 'Strong freelance admin, weaker chef execution context.',
      },
      {
        capability: 'Operational handoff',
        chefflow: 'Client and event context stay linked end-to-end.',
        alternative: 'Handoffs often move to separate docs or boards.',
      },
      {
        capability: 'Chef workflow fit',
        chefflow: 'Built for recurring private dining processes.',
        alternative: 'Designed for broader freelancer use cases.',
      },
      {
        capability: 'Scaling events',
        chefflow: 'Better visibility as event volume rises.',
        alternative: 'Process debt grows as complexity increases.',
      },
    ],
    faqs: [
      {
        question: 'Can I move from Bonsai without breaking contracts?',
        answer:
          'Yes. Most teams keep legal terms while moving operational execution into a new workflow baseline.',
      },
      {
        question: 'Is this only for large chef teams?',
        answer: 'No. Solo chefs often benefit first because admin overhead drops quickly.',
      },
    ],
  },
  {
    slug: '17hats',
    alternativeName: '17hats',
    title: 'ChefFlow vs 17hats for Private Chef Workflows',
    summary:
      '17hats handles small-business admin, but ChefFlow is designed for the real operational cadence of private chef events and client service.',
    heroDescription:
      'Compare these options if your current CRM handles forms well but still leaves execution in separate systems.',
    idealFor: [
      'Chefs with frequent event bookings and menu coordination needs.',
      'Operations that need tighter status control from inquiry to payment.',
      'Teams moving from general small-business CRM to chef-specific workflows.',
    ],
    notIdealFor: [
      'Very low-volume workflows with minimal operational depth.',
      'Businesses that do not need event-level delivery visibility.',
      'Teams already fully satisfied with a document-centric process.',
    ],
    migrationSteps: [
      'Map current forms and inquiries to a unified intake process.',
      'Move active opportunities into a single stage model.',
      'Track one month of event execution and payment outcomes.',
      'Remove duplicated checklist and spreadsheet steps.',
    ],
    rows: [
      {
        capability: 'Intake and follow-up',
        chefflow: 'Intake directly tied to downstream event execution.',
        alternative: 'Intake is strong, but execution often external.',
      },
      {
        capability: 'Stage visibility',
        chefflow: 'Workflow stages built for chef operations.',
        alternative: 'Stages are more generic and require custom mapping.',
      },
      {
        capability: 'Data continuity',
        chefflow: 'Client, event, and payment context stay connected.',
        alternative: 'Context can fragment across modules and files.',
      },
      {
        capability: 'Operational reporting',
        chefflow: 'Focused on chef-specific workflow outcomes.',
        alternative: 'General business reporting with less chef focus.',
      },
    ],
    faqs: [
      {
        question: 'Will my team need retraining?',
        answer:
          'A brief rollout is typically enough if you standardize stage names and owner responsibilities early.',
      },
      {
        question: 'Can I run both systems during migration?',
        answer: 'Yes. Keep old records read-only while active events shift to ChefFlow.',
      },
    ],
  },
  {
    slug: 'hubspot',
    alternativeName: 'HubSpot',
    title: 'ChefFlow vs HubSpot for Private Chef Teams',
    summary:
      'HubSpot is powerful but broad. ChefFlow is narrower and faster for private chef operators who need delivery workflow, not just sales pipeline depth.',
    heroDescription:
      'Use this page when comparing enterprise-grade CRM flexibility against a chef-first operating workflow.',
    idealFor: [
      'Chef teams that want quick adoption and less CRM administration.',
      'Operators prioritizing operational continuity over broad marketing tooling.',
      'Businesses that need one place for event lifecycle clarity.',
    ],
    notIdealFor: [
      'Large multi-department organizations needing enterprise marketing suites.',
      'Teams heavily invested in custom HubSpot objects and automations.',
      'Organizations requiring broad non-chef CRM use cases.',
    ],
    migrationSteps: [
      'Identify the smallest set of active deals tied to upcoming events.',
      'Migrate only critical records and stage definitions first.',
      'Validate event and payment handoffs for one full cycle.',
      'Move legacy reporting only after workflow stability is confirmed.',
    ],
    rows: [
      {
        capability: 'CRM flexibility',
        chefflow: 'Focused flexibility for chef operations.',
        alternative: 'Very high flexibility with higher setup overhead.',
      },
      {
        capability: 'Operational fit',
        chefflow: 'Built around private chef execution workflows.',
        alternative: 'Requires adaptation from a broad CRM model.',
      },
      {
        capability: 'Time to value',
        chefflow: 'Faster for chef teams with standard lifecycle needs.',
        alternative: 'Longer onboarding for full value realization.',
      },
      {
        capability: 'Maintenance burden',
        chefflow: 'Lower for focused private chef workflows.',
        alternative: 'Higher when managing broad CRM customization.',
      },
    ],
    faqs: [
      {
        question: 'Is HubSpot overkill for most chef teams?',
        answer:
          'For many private-chef operators, yes. The broader suite can add complexity beyond core workflow needs.',
      },
      {
        question: 'Can we still keep HubSpot for marketing?',
        answer:
          'Yes. Some teams keep marketing workflows separate while operational delivery runs in ChefFlow.',
      },
    ],
  },
  {
    slug: 'zoho-crm',
    alternativeName: 'Zoho CRM',
    title: 'ChefFlow vs Zoho CRM for Private Chef Operations',
    summary:
      'Zoho CRM offers broad configurability. ChefFlow trades some breadth for chef-focused execution and lower operational friction.',
    heroDescription:
      'This comparison is for teams deciding between broad CRM customization and a purpose-built chef workflow model.',
    idealFor: [
      'Private chefs who want less system administration.',
      'Teams needing consistent event handoff across roles.',
      'Operators that prioritize day-to-day execution clarity.',
    ],
    notIdealFor: [
      'Organizations with highly customized non-chef CRM use cases.',
      'Teams requiring deep Zoho ecosystem integrations as a core requirement.',
      'Businesses that prefer broad tooling over focused workflows.',
    ],
    migrationSteps: [
      'Reduce your current process to one operational lifecycle map.',
      'Migrate active leads and all upcoming events first.',
      'Assign ownership for every stage to avoid ambiguity.',
      'Retire duplicate Zoho-side operations tracking once stable.',
    ],
    rows: [
      {
        capability: 'Customization breadth',
        chefflow: 'Focused around chef workflows with less setup.',
        alternative: 'Broad customization requires more operational overhead.',
      },
      {
        capability: 'Operational model',
        chefflow: 'Built around inquiry-to-event execution continuity.',
        alternative: 'General CRM model adapted through configuration.',
      },
      {
        capability: 'Team clarity',
        chefflow: 'Clear stage ownership for event workflows.',
        alternative: 'Can vary depending on custom setup quality.',
      },
      {
        capability: 'Ramp speed',
        chefflow: 'Quicker for chef teams focused on execution.',
        alternative: 'Can be slower due to broader CRM configuration.',
      },
    ],
    faqs: [
      {
        question: 'Do we lose reporting detail when leaving Zoho?',
        answer:
          'You may lose some generic CRM flexibility but gain more actionable chef-focused workflow reporting.',
      },
      {
        question: 'What should migrate first from Zoho?',
        answer:
          'Active opportunities and all upcoming events should move first for immediate continuity.',
      },
    ],
  },
  {
    slug: 'notion-airtable',
    alternativeName: 'Notion + Airtable',
    title: 'ChefFlow vs Notion and Airtable for Chef Ops',
    summary:
      'Notion and Airtable are flexible builders, but ChefFlow removes template maintenance by shipping a chef-specific operating baseline out of the box.',
    heroDescription:
      'If your team is tired of maintaining internal templates and automations, this is the practical tradeoff analysis.',
    idealFor: [
      'Teams with growing event volume and template fatigue.',
      'Chefs who want less no-code upkeep and fewer manual checks.',
      'Operators that need clearer accountability in daily workflow.',
    ],
    notIdealFor: [
      'Teams that love building and maintaining custom no-code systems.',
      'Organizations needing fully open schema design for many domains.',
      'Very early workflows where process is still undefined.',
    ],
    migrationSteps: [
      'Audit current databases, views, and automations.',
      'Map each high-use board to a single lifecycle stage.',
      'Move live workflows first and freeze old templates.',
      'Archive or retire no-code stacks after stability checks.',
    ],
    rows: [
      {
        capability: 'Setup flexibility',
        chefflow: 'Purpose-built default workflows for chefs.',
        alternative: 'Maximum flexibility with higher design burden.',
      },
      {
        capability: 'Maintenance overhead',
        chefflow: 'Lower ongoing maintenance for core operations.',
        alternative: 'Continuous template and automation upkeep.',
      },
      {
        capability: 'Process consistency',
        chefflow: 'Higher consistency across team members.',
        alternative: 'Consistency depends on internal governance.',
      },
      {
        capability: 'Execution speed',
        chefflow: 'Faster for recurring event operations.',
        alternative: 'Can slow as custom systems evolve.',
      },
    ],
    faqs: [
      {
        question: 'Can we keep Notion for internal docs?',
        answer:
          'Yes. Many teams keep docs in Notion while operational execution lives in ChefFlow.',
      },
      {
        question: 'What is the biggest win after migration?',
        answer: 'Reduced operational drift from team members following different custom templates.',
      },
    ],
  },
  {
    slug: 'acuity-quickbooks',
    alternativeName: 'Acuity + QuickBooks',
    title: 'ChefFlow vs Acuity and QuickBooks Stack',
    summary:
      'Acuity and QuickBooks can cover scheduling plus accounting, but ChefFlow connects booking, event execution, and payment status in one operating flow.',
    heroDescription:
      'This is for teams piecing together appointment scheduling and accounting tools without a shared event workflow layer.',
    idealFor: [
      'Chefs who need tighter booking-to-event handoff.',
      'Operators wanting fewer system transitions during active events.',
      'Teams that need better visibility than a schedule + ledger split.',
    ],
    notIdealFor: [
      'Businesses that only need appointment scheduling and accounting logs.',
      'Teams with no need for event-level delivery workflow tracking.',
      'Organizations already running stable custom integration pipelines.',
    ],
    migrationSteps: [
      'Map booking fields to pipeline and event stages.',
      'Move upcoming bookings and open balances first.',
      'Validate payment state visibility with one billing cycle.',
      'Deprecate duplicated handoff sheets and reminders.',
    ],
    rows: [
      {
        capability: 'Workflow continuity',
        chefflow: 'Booking, execution, and payment visibility in one system.',
        alternative: 'Workflow split between scheduler and accounting tools.',
      },
      {
        capability: 'Operational context',
        chefflow: 'Event context attached to client and revenue records.',
        alternative: 'Context can be fragmented between systems.',
      },
      {
        capability: 'Manual coordination',
        chefflow: 'Less manual syncing and status reconciliation.',
        alternative: 'Higher handoff overhead across disconnected tools.',
      },
      {
        capability: 'Scaling readiness',
        chefflow: 'Better foundation for growing event volume.',
        alternative: 'Complexity rises as schedules and invoices grow.',
      },
    ],
    faqs: [
      {
        question: 'Can ChefFlow replace both tools immediately?',
        answer:
          'Most teams phase migration. Move active operations first, then retire redundant scheduler and tracking steps.',
      },
      {
        question: 'Do we lose accounting exports?',
        answer: 'No. You can keep structured exports while consolidating operational workflow.',
      },
    ],
  },
  {
    slug: 'trello-asana',
    alternativeName: 'Trello or Asana',
    title: 'ChefFlow vs Trello or Asana for Event Delivery',
    summary:
      'Project boards are flexible for tasks, but ChefFlow adds private-chef workflow semantics so client, event, and payment state do not drift apart.',
    heroDescription:
      'Use this comparison if your team currently runs operations on generic boards and experiences stage confusion or missed handoffs.',
    idealFor: [
      'Chefs using boards today but needing stronger lifecycle control.',
      'Teams that need client and revenue context tied to tasks.',
      'Operations looking for fewer status mismatches.',
    ],
    notIdealFor: [
      'Teams using boards only for lightweight internal to-dos.',
      'Organizations without recurring client-event workflows.',
      'Workflows that intentionally avoid lifecycle standardization.',
    ],
    migrationSteps: [
      'Export open boards and classify tasks by lifecycle stage.',
      'Create one standard stage model for all active events.',
      'Migrate current events and test team update discipline.',
      'Archive generic boards once operational metrics are stable.',
    ],
    rows: [
      {
        capability: 'Task management',
        chefflow: 'Task flow tied to chef lifecycle states.',
        alternative: 'Strong generic task management without chef semantics.',
      },
      {
        capability: 'Client/event linkage',
        chefflow: 'Native linkage across client, event, and payment context.',
        alternative: 'Often requires manual board conventions.',
      },
      {
        capability: 'Workflow discipline',
        chefflow: 'Standardized operational stages reduce drift.',
        alternative: 'Discipline depends on team process hygiene.',
      },
      {
        capability: 'Decision speed',
        chefflow: 'Faster when context is centralized.',
        alternative: 'Slower when data lives in multiple tools.',
      },
    ],
    faqs: [
      {
        question: 'Can we keep Trello or Asana for side projects?',
        answer: 'Yes. Many teams keep boards for non-core projects while events run in ChefFlow.',
      },
      {
        question: 'What causes the biggest failures on generic boards?',
        answer: 'Unclear stage ownership and missing handoff context between sales and execution.',
      },
    ],
  },
  {
    slug: 'paper-and-email',
    alternativeName: 'Paper Contracts + Email',
    title: 'ChefFlow vs Paper and Email Operations',
    summary:
      'Manual paper-and-email workflows can work early, but they create blind spots as booking volume rises. ChefFlow centralizes decision-critical status data.',
    heroDescription:
      'This page is for teams still relying on inbox threads, PDF attachments, and manual reminders as their primary operating system.',
    idealFor: [
      'Chefs with increasing inbound volume and repeat clients.',
      'Teams losing time in inbox and attachment searches.',
      'Operators needing stronger accountability for follow-through.',
    ],
    notIdealFor: [
      'Low-frequency workflows with little operational pressure.',
      'Teams that intentionally avoid digital workflow systems.',
      'Operations that do not require predictable handoff tracking.',
    ],
    migrationSteps: [
      'Collect active contracts, inquiries, and upcoming bookings.',
      'Create one operating baseline for all live opportunities.',
      'Require status updates in-system, not in email only.',
      'Retire manual reminder chains after two stable cycles.',
    ],
    rows: [
      {
        capability: 'Information retrieval',
        chefflow: 'Centralized and searchable workflow records.',
        alternative: 'Fragmented across inboxes and files.',
      },
      {
        capability: 'Status visibility',
        chefflow: 'Real-time stage clarity across operations.',
        alternative: 'Status hidden in threads and manual notes.',
      },
      {
        capability: 'Follow-up reliability',
        chefflow: 'Structured lifecycle reduces missed actions.',
        alternative: 'High dependency on memory and manual reminders.',
      },
      {
        capability: 'Operational resilience',
        chefflow: 'Less key-person dependency for daily execution.',
        alternative: 'High dependency on one person owning context.',
      },
    ],
    faqs: [
      {
        question: 'Is this overkill for a small chef business?',
        answer:
          'Not if volume is growing. Most small teams benefit from predictable lifecycle visibility early.',
      },
      {
        question: 'Can we still use email for communication?',
        answer:
          'Yes. Email remains a channel, but workflow state should live in one system of record.',
      },
    ],
  },
]

export function getComparePage(slug: string): ComparePage | null {
  return COMPARE_PAGES.find((page) => page.slug === slug) ?? null
}
