import type { GodModeResolvedItem } from './god-mode-types'

export type RailCategory =
  | 'readiness'
  | 'money'
  | 'people'
  | 'time'
  | 'risk'
  | 'intelligence'
  | 'communication'
  | 'actions'

export const RAIL_CATEGORIES = [
  'readiness',
  'money',
  'people',
  'time',
  'risk',
  'intelligence',
  'communication',
  'actions',
] as const

export type EntityType = 'event' | 'client' | 'menu' | 'recipe' | 'inquiry' | 'page'

export type RailScope = 'chef' | 'public' | 'client' | 'admin' | 'staff' | 'vendor' | 'partner'

export interface EntityContext {
  type: EntityType
  id: string
  parentIds?: Record<string, string>
}

export type CollapsedSummaryType = 'readiness-bar' | 'metric-row' | 'countdown' | 'status-ticker'

export type MetricFormat = 'currency' | 'percent' | 'number' | 'date' | 'countdown'

export type MetricSeverity = 'normal' | 'warn' | 'critical'

export interface CollapsedMetric {
  label: string
  resolverKey: string
  format: MetricFormat
  severity?: MetricSeverity
}

export interface RailProfile {
  id: string
  scope: RailScope
  pattern: RegExp
  entityExtract?: (match: RegExpMatchArray) => EntityContext | null
  categories: RailCategory[]
  primaryCategory: RailCategory
  resolverFilter: string[]
  entityScoped: boolean
  collapsedSummary: CollapsedSummaryType
  collapsedMetrics: CollapsedMetric[]
  layout: 'columns' | 'stack'
  columnCount?: 2 | 3 | 4
  maxItems: number
  refreshInterval?: number
  defaultExpanded: boolean
  stickyOnScroll: boolean
}

export type ClientRailProfile = Omit<RailProfile, 'pattern' | 'entityExtract'>

export interface RailProfileMatch {
  profile: RailProfile
  entityContext: EntityContext | null
}

export interface CategoryGroup {
  category: RailCategory
  items: GodModeResolvedItem[]
}

export interface ResolvedCollapsedMetric extends CollapsedMetric {
  value: string | number | null
}

export type ContextualRailItem = Omit<GodModeResolvedItem, 'expiresAt' | 'escalatesAt' | 'data'> & {
  data?: Record<string, unknown>
  expiresAt?: string
  escalatesAt?: string
}

export interface ContextualRailData {
  profile: ClientRailProfile
  categories: Partial<Record<RailCategory, ContextualRailCategoryData>>
  collapsedMetrics: ResolvedCollapsedMetric[]
  criticalCount: number
  totalItems: number
  assembledAt: string
}

export const CATEGORY_COLORS: Record<RailCategory, { bg: string; text: string; icon: string }> = {
  readiness: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: 'check-circle' },
  money: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: 'dollar-sign' },
  people: { bg: 'bg-violet-500/10', text: 'text-violet-400', icon: 'users' },
  time: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: 'clock' },
  risk: { bg: 'bg-red-500/10', text: 'text-red-400', icon: 'shield' },
  intelligence: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', icon: 'brain' },
  communication: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', icon: 'message-circle' },
  actions: { bg: 'bg-stone-500/10', text: 'text-stone-300', icon: 'check-square' },
}

export function categoryClass(category: RailCategory): string {
  const color = CATEGORY_COLORS[category]
  return `${color.bg} ${color.text}`
}

// ---------------------------------------------------------------------------
// Backward-compatible exports used by downstream components
// ---------------------------------------------------------------------------

export interface ContextualRailCategoryData {
  category: RailCategory
  items: ContextualRailItem[]
  label: string
  colorClass: string
}

export const CATEGORY_ICONS: Record<RailCategory, string> = {
  readiness: 'check-circle',
  money: 'dollar-sign',
  people: 'users',
  time: 'clock',
  risk: 'shield',
  intelligence: 'brain',
  communication: 'message-circle',
  actions: 'check-square',
}

export const CATEGORY_LABELS: Record<RailCategory, string> = {
  readiness: 'Readiness',
  money: 'Money',
  people: 'People',
  time: 'Time',
  risk: 'Risk',
  intelligence: 'Intelligence',
  communication: 'Communication',
  actions: 'Actions',
}

// ---------------------------------------------------------------------------
// Resolver category map
// ---------------------------------------------------------------------------

export const RESOLVER_CATEGORY_MAP: Record<string, RailCategory> = {
  completion: 'readiness',
  events: 'time',
  'menu-approvals': 'readiness',
  'packing-status': 'readiness',
  'prep-status': 'readiness',
  'shopping-lists': 'readiness',
  payments: 'money',
  'revenue-goals': 'money',
  'recurring-invoices': 'money',
  'vendor-invoices': 'money',
  'receipt-capture': 'money',
  'revenue-opportunities': 'money',
  'pie-attention': 'money',
  'dormant-clients': 'people',
  'client-birthdays': 'people',
  followups: 'people',
  'staff-issues': 'people',
  'network-activity': 'people',
  'review-requests': 'people',
  contracts: 'time',
  'cadence-due': 'time',
  'scheduled-messages': 'time',
  'hours-logging': 'time',
  'weather-alerts': 'risk',
  'equipment-conflicts': 'risk',
  'quality-drift': 'risk',
  insurance: 'risk',
  certifications: 'risk',
  'cil-signals': 'intelligence',
  'intelligence-signals': 'intelligence',
  'dish-fatigue': 'intelligence',
  'weather-cooking': 'intelligence',
  'lifecycle-stages': 'intelligence',
  inquiries: 'communication',
  messages: 'communication',
  'communication-feed': 'communication',
  'proposal-activity': 'communication',
  waiting: 'communication',
  handoffs: 'actions',
  resume: 'actions',
  'automation-activity': 'actions',
  onboarding: 'readiness',
  quotes: 'money',
}
