// OpenClaw Developer Usage Map
// Static typed source of truth for the internal /admin/openclaw page.
// Content is version-controlled here, not stored in the database.

export type OpenClawStageStatus = 'used' | 'active' | 'planned' | 'potential'

export type OpenClawCategory =
  | 'research'
  | 'planning'
  | 'data'
  | 'development'
  | 'deployment'
  | 'testing'
  | 'monitoring'
  | 'growth'
  | 'documentation'

export type OpenClawUsageStage = {
  id: string
  order: number
  title: string
  category: OpenClawCategory
  status: OpenClawStageStatus
  summary: string
  details: string[]
  separateCategory?: boolean
}

export type OpenClawCapabilityGroup = {
  id: string
  title: string
  summary: string
  items: string[]
}

export const USAGE_STAGES: OpenClawUsageStage[] = [
  {
    id: 'research',
    order: 1,
    title: 'Research and Discovery',
    category: 'research',
    status: 'used',
    summary: 'Gather information, compare options, and shape decisions before building.',
    details: [
      'Compare third-party tools and APIs',
      'Research existing solutions and patterns',
      'Gather pricing, competitor, and market data',
      'Answer open questions before implementation begins',
    ],
  },
  {
    id: 'planning',
    order: 2,
    title: 'Planning and Architecture',
    category: 'planning',
    status: 'used',
    summary:
      'Define priorities, workflows, page structure, feature sequencing, and system direction before implementation.',
    details: [
      'Spec writing and builder prompt generation',
      'Feature sequencing and dependency mapping',
      'Page and component architecture decisions',
      'System direction and scope definition',
    ],
  },
  {
    id: 'database-design',
    order: 3,
    title: 'Database and Data Model Design',
    category: 'data',
    status: 'used',
    summary: 'Define entities, relationships, sources, schemas, and backend data structure.',
    details: [
      'Table and column design for new features',
      'Migration planning and sequencing',
      'Relationship and constraint modeling',
      'Schema review and validation',
    ],
  },
  {
    id: 'data-ingestion',
    order: 4,
    title: 'Data Ingestion and Capture',
    category: 'data',
    status: 'active',
    summary: 'Gather raw source material, scraped inputs, reference datasets, and price data.',
    details: [
      'Price scraping from grocery and retail sources',
      'Store and product catalog capture',
      'Scheduled multi-zip crawl jobs on the Raspberry Pi',
      'Archive ingestion and flyer parsing',
    ],
  },
  {
    id: 'data-cleanup',
    order: 5,
    title: 'Data Cleanup, Normalization, and Deduplication',
    category: 'data',
    status: 'active',
    summary: 'Turn messy raw inputs into usable, consistent, deduplicated records.',
    details: [
      'Ingredient name normalization and alias mapping',
      'Unit standardization across sources',
      'Deduplication of prices and products',
      'Quality scoring and confidence flagging',
    ],
  },
  {
    id: 'data-sync',
    order: 6,
    title: 'Data Sync into the Website',
    category: 'data',
    status: 'active',
    summary: 'Move validated data into the website and confirm it landed correctly.',
    details: [
      'Pi-to-ChefFlow sync pipeline',
      'Price history writes to ingredient_price_history',
      'Normalization map sync and catalog updates',
      'Pipeline audit and completeness checks',
    ],
  },
  {
    id: 'development',
    order: 7,
    title: 'Development Support',
    category: 'development',
    status: 'used',
    summary: 'Support implementation decisions, content structure, tooling, and build execution.',
    details: [
      'Spec-driven builder agent coordination',
      'Code review and pattern guidance',
      'Component and server action scaffolding',
      'Session log and build state tracking',
    ],
  },
  {
    id: 'deployment',
    order: 8,
    title: 'Deployment Readiness',
    category: 'deployment',
    status: 'planned',
    summary: 'Support release prep, launch checks, and transition from development to live.',
    details: [
      'Pre-launch checklist execution',
      'Environment and config validation',
      'Production smoke test coordination',
      'Launch sequence and rollback planning',
    ],
  },
  {
    id: 'testing',
    order: 9,
    title: 'Testing and QA',
    category: 'testing',
    status: 'planned',
    summary: 'Validate the deployed site, verify flows, catch regressions.',
    details: [
      'End-to-end flow verification',
      'Regression detection after deploys',
      'Edge case coverage and boundary testing',
      'Playwright and experiential suite coordination',
    ],
  },
  {
    id: 'monitoring',
    order: 10,
    title: 'Monitoring and Regression Detection',
    category: 'monitoring',
    status: 'planned',
    summary: 'Watch for failures, stale data, broken flows, and system drift after launch.',
    details: [
      'Uptime and error rate monitoring',
      'Stale price and coverage alerts',
      'Post-deploy regression scans',
      'Long-running soak and memory checks',
    ],
  },
  {
    id: 'prospecting',
    order: 11,
    title: 'Prospecting and Lead Discovery',
    category: 'growth',
    status: 'planned',
    separateCategory: true,
    summary:
      'Identify businesses, targets, and lead opportunities. This is a separate growth function, not part of testing.',
    details: [
      'Business directory scraping and enrichment',
      'Target list building by geography and archetype',
      'Lead scoring and tiering',
      'Opportunity qualification criteria',
    ],
  },
  {
    id: 'outreach',
    order: 12,
    title: 'Lead Qualification, Enrichment, and Outreach Support',
    category: 'growth',
    status: 'planned',
    summary:
      'Score leads, enrich records, support messaging, and move opportunities through a pipeline.',
    details: [
      'Contact enrichment from public sources',
      'Outreach message drafting support',
      'Pipeline stage tracking',
      'Follow-up scheduling and cadence logic',
    ],
  },
  {
    id: 'documentation',
    order: 13,
    title: 'Documentation, Decision Memory, and Ongoing Optimization',
    category: 'documentation',
    status: 'active',
    summary: 'Preserve specs, record decisions, support internal memory, and improve the system.',
    details: [
      'Spec and session log maintenance',
      'CLAUDE.md and rule capture',
      'Agent memory and context persistence',
      'System behavior map and audit trail',
    ],
  },
]

export const POTENTIAL_FUTURE_USES: OpenClawCapabilityGroup[] = [
  {
    id: 'competitor-intelligence',
    title: 'Deeper Competitor Intelligence',
    summary: 'Systematic tracking of competitor pricing, positioning, and feature changes.',
    items: [
      'Automated competitor price monitoring',
      'Feature parity tracking',
      'Positioning and messaging analysis',
    ],
  },
  {
    id: 'seo-content',
    title: 'SEO and Content Research',
    summary: 'Keyword research, topic mapping, and content gap analysis.',
    items: [
      'Search intent and keyword data',
      'Content gap identification',
      'Long-tail chef and food service queries',
    ],
  },
  {
    id: 'analytics-interpretation',
    title: 'Analytics Interpretation',
    summary: 'Pattern detection and insight surfacing from platform usage data.',
    items: ['Usage funnel analysis', 'Churn signal detection', 'Feature adoption tracking'],
  },
  {
    id: 'market-expansion',
    title: 'Market Expansion Research',
    summary: 'Geographic and segment expansion analysis for new markets.',
    items: [
      'City and region opportunity scoring',
      'Segment size estimation',
      'Regulatory and logistics landscape research',
    ],
  },
  {
    id: 'advanced-optimization',
    title: 'Advanced Operational Optimization',
    summary: 'Deeper feedback loops between data capture and system behavior.',
    items: [
      'Price resolution tuning based on accuracy signals',
      'Capture schedule optimization by store and region',
      'Automated quality scoring improvements',
    ],
  },
]

export const CATEGORY_DISTINCTIONS: { title: string; description: string }[] = [
  {
    title: 'Research',
    description: 'Information gathering and option comparison before building.',
  },
  {
    title: 'Planning and Architecture',
    description: 'Priorities, sequencing, and system direction before implementation.',
  },
  {
    title: 'Data and Database Work',
    description: 'Schema design, ingestion, cleanup, normalization, and sync.',
  },
  {
    title: 'Engineering Support',
    description: 'Implementation guidance, spec execution, and build tooling.',
  },
  {
    title: 'Deployment Readiness',
    description: 'Release prep, launch checks, and environment validation.',
  },
  {
    title: 'QA and Testing',
    description: 'Flow verification, regression detection, and edge case coverage.',
  },
  {
    title: 'Monitoring',
    description: 'Post-launch drift detection, uptime, and stale data alerts.',
  },
  {
    title: 'Lead Discovery (Growth)',
    description: 'Finding targets and opportunities. Separate from testing.',
  },
  {
    title: 'Lead Qualification and Outreach',
    description: 'Enrichment, scoring, and pipeline support after discovery.',
  },
  {
    title: 'Documentation and Memory',
    description: 'Preserving decisions, specs, and system context.',
  },
]
