import type { CulinaryProfileAnswer } from '@/lib/ai/chef-profile-constants'
import type { MemoryCategory, RemyMemory } from '@/lib/ai/remy-memory-types'
import type { ChefPreferences } from '@/lib/scheduling/types'

export type KnowledgeSource =
  | 'chef_preferences'
  | 'chef_culinary_profiles'
  | 'remy_memories'
  | 'derived'

export type KnowledgeDomainId =
  | 'scheduling'
  | 'pricing'
  | 'communication'
  | 'culinary'
  | 'operations'
  | 'clients'
  | 'portal'

export type KnowledgeSurfaceId =
  | 'remy'
  | 'scheduling'
  | 'quotes'
  | 'client_drafts'
  | 'menu_intelligence'
  | 'event_readiness'
  | 'dashboard'
  | 'client_portal'

export interface KnowledgeFact {
  id: string
  label: string
  value: string
  domain: KnowledgeDomainId
  source: KnowledgeSource
  href: string
  category?: MemoryCategory
  status: 'known' | 'missing'
}

export interface CoverageDomain {
  id: KnowledgeDomainId
  label: string
  known: number
  total: number
  score: number
  missing: string[]
}

export interface RestatementMatch {
  factId: string
  label: string
  value: string
  source: KnowledgeSource
  category?: MemoryCategory
  confidence: number
}

export interface KnowledgeConflict {
  id: string
  label: string
  severity: 'review' | 'important'
  details: string[]
  resolutionPrompt: string
}

export interface SourceLedgerEntry {
  source: KnowledgeSource
  label: string
  count: number
  editable: boolean
}

export interface SurfaceMatrixRow {
  category: MemoryCategory
  label: string
  cells: Array<{
    surface: KnowledgeSurfaceId
    label: string
    status: 'applies' | 'review' | 'not_applied'
    reason: string
  }>
}

export interface ApplyDefaultsPreview {
  surface: KnowledgeSurfaceId
  label: string
  facts: Array<{ label: string; value: string; source: KnowledgeSource }>
}

export interface QuickCapturePrompt {
  id: string
  label: string
  category: MemoryCategory
  importance: number
  template: string
}

export interface MissingDefaultPrompt {
  id: string
  trigger: string
  prompt: string
  category: MemoryCategory
}

export interface ScenarioPreview {
  input: string
  matches: RestatementMatch[]
  appliedSurfaces: ApplyDefaultsPreview[]
  missingPrompts: MissingDefaultPrompt[]
}

export interface DefaultKnowledgeModel {
  facts: KnowledgeFact[]
  coverage: CoverageDomain[]
  coverageScore: number
  conflicts: KnowledgeConflict[]
  sourceLedger: SourceLedgerEntry[]
  surfaceMatrix: SurfaceMatrixRow[]
  applyDefaultsPreview: ApplyDefaultsPreview[]
  quickCapturePrompts: QuickCapturePrompt[]
  missingDefaultPrompts: MissingDefaultPrompt[]
}

const DOMAIN_LABELS: Record<KnowledgeDomainId, string> = {
  scheduling: 'Scheduling',
  pricing: 'Pricing',
  communication: 'Communication',
  culinary: 'Culinary Identity',
  operations: 'Operations',
  clients: 'Client Knowledge',
  portal: 'Portal Quality of Life',
}

const SURFACE_LABELS: Record<KnowledgeSurfaceId, string> = {
  remy: 'Remy',
  scheduling: 'Scheduling',
  quotes: 'Quotes',
  client_drafts: 'Client Drafts',
  menu_intelligence: 'Menu Intelligence',
  event_readiness: 'Event Readiness',
  dashboard: 'Dashboard',
  client_portal: 'Client Portal',
}

const MEMORY_CATEGORY_LABELS: Record<MemoryCategory, string> = {
  chef_preference: 'Chef Preference',
  client_insight: 'Client Insight',
  business_rule: 'Business Rule',
  communication_style: 'Communication Style',
  culinary_note: 'Culinary Note',
  scheduling_pattern: 'Scheduling Pattern',
  pricing_pattern: 'Pricing Pattern',
  workflow_preference: 'Workflow Preference',
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'i',
  'in',
  'is',
  'it',
  'my',
  'of',
  'on',
  'or',
  'our',
  'that',
  'the',
  'this',
  'to',
  'we',
  'with',
])

export const MEMORY_CATEGORY_SURFACES: Record<MemoryCategory, KnowledgeSurfaceId[]> = {
  chef_preference: ['remy', 'dashboard', 'event_readiness'],
  client_insight: ['remy', 'client_drafts', 'menu_intelligence', 'client_portal'],
  business_rule: ['remy', 'scheduling', 'quotes', 'client_drafts', 'event_readiness'],
  communication_style: ['remy', 'client_drafts'],
  culinary_note: ['remy', 'menu_intelligence', 'client_portal'],
  scheduling_pattern: ['remy', 'scheduling', 'event_readiness'],
  pricing_pattern: ['remy', 'quotes', 'event_readiness'],
  workflow_preference: ['remy', 'dashboard', 'scheduling'],
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim())
}

function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return 'Not set'
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

function addFact(facts: KnowledgeFact[], fact: Omit<KnowledgeFact, 'status'>) {
  facts.push({
    ...fact,
    status: fact.value.trim() && fact.value !== 'Not set' ? 'known' : 'missing',
  })
}

export function buildKnowledgeFacts(input: {
  preferences: ChefPreferences
  culinaryProfile: CulinaryProfileAnswer[]
  memories: RemyMemory[]
}): KnowledgeFact[] {
  const { preferences, culinaryProfile, memories } = input
  const facts: KnowledgeFact[] = []
  const homeBase = [preferences.home_city, preferences.home_state, preferences.home_zip]
    .filter(Boolean)
    .join(', ')
  const stores =
    preferences.default_stores.length > 0
      ? preferences.default_stores.map((store) => store.name).join(', ')
      : 'Not set'

  addFact(facts, {
    id: 'preference.home_base',
    label: 'Home base',
    value: homeBase || 'Not set',
    domain: 'scheduling',
    source: 'chef_preferences',
    href: '/settings',
  })
  addFact(facts, {
    id: 'preference.default_stores',
    label: 'Default stores',
    value: stores,
    domain: 'operations',
    source: 'chef_preferences',
    href: '/settings',
  })
  addFact(facts, {
    id: 'preference.prep_timing',
    label: 'Prep timing',
    value: `${preferences.default_prep_hours} hours prep, ${preferences.default_shopping_minutes} minutes shopping, ${preferences.default_packing_minutes} minutes packing`,
    domain: 'scheduling',
    source: 'chef_preferences',
    href: '/settings',
  })
  addFact(facts, {
    id: 'preference.profit_target',
    label: 'Profit target',
    value: `${preferences.target_margin_percent}% target margin`,
    domain: 'pricing',
    source: 'chef_preferences',
    href: '/settings',
  })
  addFact(facts, {
    id: 'preference.revenue_goal',
    label: 'Monthly revenue goal',
    value: formatMoney(preferences.target_monthly_revenue_cents),
    domain: 'pricing',
    source: 'chef_preferences',
    href: '/settings',
  })
  addFact(facts, {
    id: 'preference.shop_day_before',
    label: 'Shopping cadence',
    value: preferences.shop_day_before
      ? 'Shop the day before events'
      : 'Shop day-before default off',
    domain: 'scheduling',
    source: 'chef_preferences',
    href: '/settings',
  })
  addFact(facts, {
    id: 'preference.event_readiness',
    label: 'Event readiness',
    value: preferences.event_readiness_assistant_enabled
      ? `Enabled in ${preferences.event_readiness_assistant_default_mode} mode`
      : 'Not set',
    domain: 'operations',
    source: 'chef_preferences',
    href: '/settings',
  })
  addFact(facts, {
    id: 'preference.menu_intelligence',
    label: 'Menu intelligence',
    value: `${Object.values(preferences.menu_engine_features).filter(Boolean).length} menu checks enabled`,
    domain: 'operations',
    source: 'chef_preferences',
    href: '/settings/menu-engine',
  })

  for (const answer of culinaryProfile) {
    addFact(facts, {
      id: `culinary.${answer.questionKey}`,
      label: answer.question,
      value: answer.answer.trim() || 'Not set',
      domain: 'culinary',
      source: 'chef_culinary_profiles',
      href: '/settings/culinary-profile',
    })
  }

  for (const memory of memories) {
    addFact(facts, {
      id: `memory.${memory.id}`,
      label: MEMORY_CATEGORY_LABELS[memory.category],
      value: memory.content,
      domain: memoryCategoryToDomain(memory.category),
      source: 'remy_memories',
      href: '/settings/default-knowledge',
      category: memory.category,
    })
  }

  return facts
}

function memoryCategoryToDomain(category: MemoryCategory): KnowledgeDomainId {
  switch (category) {
    case 'client_insight':
      return 'clients'
    case 'communication_style':
      return 'communication'
    case 'culinary_note':
      return 'culinary'
    case 'pricing_pattern':
      return 'pricing'
    case 'scheduling_pattern':
      return 'scheduling'
    case 'workflow_preference':
      return 'portal'
    case 'business_rule':
    case 'chef_preference':
    default:
      return 'operations'
  }
}

function buildCoverage(facts: KnowledgeFact[]): CoverageDomain[] {
  const requirements: Record<KnowledgeDomainId, string[]> = {
    scheduling: ['preference.home_base', 'preference.prep_timing', 'preference.shop_day_before'],
    pricing: ['preference.profit_target', 'preference.revenue_goal'],
    communication: ['memory.communication_style'],
    culinary: ['culinary.any', 'memory.culinary_note'],
    operations: [
      'preference.default_stores',
      'preference.event_readiness',
      'preference.menu_intelligence',
    ],
    clients: ['memory.client_insight'],
    portal: ['memory.workflow_preference'],
  }

  return (Object.keys(requirements) as KnowledgeDomainId[]).map((domain) => {
    const required = requirements[domain]
    const missing: string[] = []
    let known = 0

    for (const requirement of required) {
      const matches = facts.filter((fact) =>
        requirement.startsWith('memory.')
          ? fact.source === 'remy_memories' && fact.category === requirement.replace('memory.', '')
          : requirement.endsWith('.any')
            ? fact.id.startsWith(requirement.replace('.any', '.'))
            : fact.id === requirement || fact.id.startsWith(`${requirement}.`)
      )
      const hasKnown = matches.some((fact) => fact.status === 'known')
      if (hasKnown) {
        known += 1
      } else {
        missing.push(labelRequirement(requirement))
      }
    }

    return {
      id: domain,
      label: DOMAIN_LABELS[domain],
      known,
      total: required.length,
      score: Math.round((known / required.length) * 100),
      missing,
    }
  })
}

function labelRequirement(requirement: string): string {
  const labels: Record<string, string> = {
    'preference.home_base': 'Home base',
    'preference.prep_timing': 'Prep timing',
    'preference.shop_day_before': 'Shopping cadence',
    'preference.profit_target': 'Profit target',
    'preference.revenue_goal': 'Revenue goal',
    'memory.communication_style': 'Communication style memory',
    'culinary.any': 'At least one culinary profile answer',
    'memory.culinary_note': 'Culinary note memory',
    'preference.default_stores': 'Default stores',
    'preference.event_readiness': 'Event readiness controls',
    'preference.menu_intelligence': 'Menu intelligence controls',
    'memory.client_insight': 'Client insight memory',
    'memory.workflow_preference': 'Workflow preference memory',
  }
  return labels[requirement] ?? requirement
}

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
}

export function detectRestatedKnowledge(
  input: string,
  facts: KnowledgeFact[],
  limit = 5
): RestatementMatch[] {
  const inputTokens = new Set(tokens(input))
  if (inputTokens.size === 0) return []

  return facts
    .filter((fact) => fact.status === 'known')
    .map((fact) => {
      const factTokens = tokens(`${fact.label} ${fact.value}`)
      const overlap = factTokens.filter((token) => inputTokens.has(token)).length
      const confidence = Math.max(
        fact.value.length > 12 && input.toLowerCase().includes(fact.value.toLowerCase()) ? 100 : 0,
        Math.round((overlap / Math.max(factTokens.length, 1)) * 100)
      )
      return {
        factId: fact.id,
        label: fact.label,
        value: fact.value,
        source: fact.source,
        category: fact.category,
        confidence,
      }
    })
    .filter((match) => match.confidence >= 35)
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, limit)
}

function memoryText(memories: RemyMemory[], category?: MemoryCategory): string[] {
  return memories
    .filter((memory) => !category || memory.category === category)
    .map((memory) => memory.content.toLowerCase())
}

function hasAny(values: string[], patterns: RegExp[]): boolean {
  return values.some((value) => patterns.some((pattern) => pattern.test(value)))
}

function buildConflicts(preferences: ChefPreferences, memories: RemyMemory[]): KnowledgeConflict[] {
  const conflicts: KnowledgeConflict[] = []
  const scheduling = memoryText(memories, 'scheduling_pattern')
  const communication = memoryText(memories, 'communication_style')
  const pricing = memoryText(memories, 'pricing_pattern')

  const saysShopDayBefore = hasAny(scheduling, [/day before/, /prior day/, /shop ahead/])
  const saysShopDayOf = hasAny(scheduling, [/day of/, /morning of/, /same day/])
  if (saysShopDayBefore && saysShopDayOf) {
    conflicts.push({
      id: 'shopping-cadence-conflict',
      label: 'Shopping cadence conflict',
      severity: 'important',
      details: [
        'One memory prefers shopping before the event.',
        'Another memory prefers same-day shopping.',
      ],
      resolutionPrompt: 'Use one durable shopping rule unless an event explicitly overrides it.',
    })
  }
  if (!preferences.shop_day_before && saysShopDayBefore) {
    conflicts.push({
      id: 'shop-day-before-setting-memory',
      label: 'Shopping setting conflicts with memory',
      severity: 'review',
      details: [
        'Settings have day-before shopping turned off.',
        'A memory says the chef prefers shopping ahead.',
      ],
      resolutionPrompt: 'Turn the setting on or rewrite the memory with the true default.',
    })
  }

  if (
    hasAny(communication, [/short/, /concise/, /brief/]) &&
    hasAny(communication, [/detailed/, /longer/, /more detail/])
  ) {
    conflicts.push({
      id: 'communication-length-conflict',
      label: 'Communication length conflict',
      severity: 'review',
      details: [
        'One memory prefers concise drafts.',
        'Another memory prefers more detailed drafts.',
      ],
      resolutionPrompt: 'Specify when drafts should be concise and when detail is expected.',
    })
  }

  if (
    hasAny(pricing, [/premium/, /high end/, /luxury/]) &&
    hasAny(pricing, [/budget/, /affordable/, /low cost/])
  ) {
    conflicts.push({
      id: 'pricing-position-conflict',
      label: 'Pricing position conflict',
      severity: 'review',
      details: [
        'One memory points to premium positioning.',
        'Another memory points to budget-sensitive pricing.',
      ],
      resolutionPrompt: 'Clarify the default pricing posture and the exception cases.',
    })
  }

  return conflicts
}

function buildSourceLedger(facts: KnowledgeFact[], memories: RemyMemory[]): SourceLedgerEntry[] {
  const rows: SourceLedgerEntry[] = [
    {
      source: 'chef_preferences',
      label: 'Business preferences',
      count: facts.filter((fact) => fact.source === 'chef_preferences' && fact.status === 'known')
        .length,
      editable: true,
    },
    {
      source: 'chef_culinary_profiles',
      label: 'Culinary profile',
      count: facts.filter(
        (fact) => fact.source === 'chef_culinary_profiles' && fact.status === 'known'
      ).length,
      editable: true,
    },
    {
      source: 'remy_memories',
      label: 'Memory bank',
      count: memories.length,
      editable: true,
    },
    {
      source: 'derived',
      label: 'Derived checks',
      count: 0,
      editable: false,
    },
  ]
  return rows
}

function surfaceStatus(
  category: MemoryCategory,
  surface: KnowledgeSurfaceId,
  preferences: ChefPreferences
): 'applies' | 'review' | 'not_applied' {
  if (!MEMORY_CATEGORY_SURFACES[category].includes(surface)) return 'not_applied'
  if (surface === 'event_readiness' && !preferences.event_readiness_assistant_enabled)
    return 'review'
  if (surface === 'menu_intelligence') {
    const anyMenuFeatureEnabled = Object.values(preferences.menu_engine_features).some(Boolean)
    if (!anyMenuFeatureEnabled) return 'review'
  }
  if (surface === 'client_portal') return 'review'
  return 'applies'
}

function buildSurfaceMatrix(preferences: ChefPreferences): SurfaceMatrixRow[] {
  const surfaces = Object.keys(SURFACE_LABELS) as KnowledgeSurfaceId[]
  return (Object.keys(MEMORY_CATEGORY_LABELS) as MemoryCategory[]).map((category) => ({
    category,
    label: MEMORY_CATEGORY_LABELS[category],
    cells: surfaces.map((surface) => {
      const status = surfaceStatus(category, surface, preferences)
      return {
        surface,
        label: SURFACE_LABELS[surface],
        status,
        reason:
          status === 'applies'
            ? 'Applied from current knowledge'
            : status === 'review'
              ? 'Available, but gated by controls or client visibility'
              : 'Not used for this category',
      }
    }),
  }))
}

function buildApplyDefaultsPreview(facts: KnowledgeFact[]): ApplyDefaultsPreview[] {
  const surfaces = Object.keys(SURFACE_LABELS) as KnowledgeSurfaceId[]
  const surfaceDomains: Record<KnowledgeSurfaceId, KnowledgeDomainId[]> = {
    remy: ['scheduling', 'pricing', 'communication', 'culinary', 'operations', 'clients', 'portal'],
    scheduling: ['scheduling', 'operations', 'portal'],
    quotes: ['pricing', 'operations'],
    client_drafts: ['communication', 'clients', 'operations'],
    menu_intelligence: ['culinary', 'clients', 'operations'],
    event_readiness: ['scheduling', 'pricing', 'operations'],
    dashboard: ['portal', 'scheduling', 'pricing', 'operations'],
    client_portal: ['clients', 'culinary', 'communication'],
  }

  return surfaces.map((surface) => ({
    surface,
    label: SURFACE_LABELS[surface],
    facts: facts
      .filter((fact) => fact.status === 'known' && surfaceDomains[surface].includes(fact.domain))
      .slice(0, 6)
      .map((fact) => ({ label: fact.label, value: fact.value, source: fact.source })),
  }))
}

function buildQuickCapturePrompts(): QuickCapturePrompt[] {
  return [
    {
      id: 'communication-tone',
      label: 'Client draft tone',
      category: 'communication_style',
      importance: 7,
      template: 'Default client drafts should be ',
    },
    {
      id: 'scheduling-default',
      label: 'Scheduling rule',
      category: 'scheduling_pattern',
      importance: 8,
      template: 'Default scheduling rule: ',
    },
    {
      id: 'pricing-rule',
      label: 'Pricing rule',
      category: 'pricing_pattern',
      importance: 8,
      template: 'Default pricing rule: ',
    },
    {
      id: 'workflow-rule',
      label: 'Portal workflow',
      category: 'workflow_preference',
      importance: 7,
      template: 'Default portal workflow preference: ',
    },
    {
      id: 'business-boundary',
      label: 'Business boundary',
      category: 'business_rule',
      importance: 9,
      template: 'Business rule: ',
    },
  ]
}

function buildMissingDefaultPrompts(coverage: CoverageDomain[]): MissingDefaultPrompt[] {
  return coverage.flatMap((domain) =>
    domain.missing.map((missing) => ({
      id: `${domain.id}.${missing.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      trigger: `${DOMAIN_LABELS[domain.id]} coverage is missing ${missing.toLowerCase()}.`,
      prompt: `Should ChefFlow remember a default for ${missing.toLowerCase()}?`,
      category: domainToMemoryCategory(domain.id),
    }))
  )
}

function domainToMemoryCategory(domain: KnowledgeDomainId): MemoryCategory {
  switch (domain) {
    case 'scheduling':
      return 'scheduling_pattern'
    case 'pricing':
      return 'pricing_pattern'
    case 'communication':
      return 'communication_style'
    case 'culinary':
      return 'culinary_note'
    case 'clients':
      return 'client_insight'
    case 'portal':
      return 'workflow_preference'
    case 'operations':
    default:
      return 'chef_preference'
  }
}

export function buildDefaultKnowledgeModel(input: {
  preferences: ChefPreferences
  culinaryProfile: CulinaryProfileAnswer[]
  memories: RemyMemory[]
}): DefaultKnowledgeModel {
  const facts = buildKnowledgeFacts(input)
  const coverage = buildCoverage(facts)
  const coverageScore = Math.round(
    coverage.reduce((sum, domain) => sum + domain.score, 0) / coverage.length
  )
  const missingDefaultPrompts = buildMissingDefaultPrompts(coverage)

  return {
    facts,
    coverage,
    coverageScore,
    conflicts: buildConflicts(input.preferences, input.memories),
    sourceLedger: buildSourceLedger(facts, input.memories),
    surfaceMatrix: buildSurfaceMatrix(input.preferences),
    applyDefaultsPreview: buildApplyDefaultsPreview(facts),
    quickCapturePrompts: buildQuickCapturePrompts(),
    missingDefaultPrompts,
  }
}

export function previewKnowledgeScenario(
  input: string,
  model: DefaultKnowledgeModel
): ScenarioPreview {
  const matches = detectRestatedKnowledge(input, model.facts)
  const matchedDomains = new Set(
    model.facts
      .filter((fact) => matches.some((match) => match.factId === fact.id))
      .map((fact) => fact.domain)
  )
  const appliedSurfaces = model.applyDefaultsPreview
    .map((surface) => ({
      ...surface,
      facts: surface.facts.filter((fact) =>
        model.facts.some(
          (knownFact) =>
            knownFact.label === fact.label &&
            knownFact.value === fact.value &&
            matchedDomains.has(knownFact.domain)
        )
      ),
    }))
    .filter((surface) => surface.facts.length > 0)

  return {
    input,
    matches,
    appliedSurfaces,
    missingPrompts: matches.length === 0 ? model.missingDefaultPrompts.slice(0, 3) : [],
  }
}
