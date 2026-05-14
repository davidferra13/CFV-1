import type { DerivedPreferenceProfile } from '@/lib/discovery/preference-contract'
import {
  filterShareableCulinaryProfileSignals,
  toSharedProfileReportItems,
  type CulinaryProfileAccessContext,
  type CulinaryProfileShareCategory,
  type CulinaryProfileSharingGrantRecord,
  type SharingDenialReason,
  type SharedProfileReportItem,
} from '@/lib/discovery/profile-sharing-contracts'

export interface ChefFacingCulinaryProfileReportSection {
  category: CulinaryProfileShareCategory
  title: string
  items: SharedProfileReportItem[]
}

export interface ChefFacingCulinaryProfileReport {
  ownerId: string
  viewerChefId: string | null
  status: 'visible' | 'limited' | 'blocked'
  generatedAt: string
  visibleCategories: CulinaryProfileShareCategory[]
  sections: ChefFacingCulinaryProfileReportSection[]
  suggestedChefActions: string[]
  redactions: Record<SharingDenialReason, number>
  freshness: {
    profileGeneratedAt: string
    latestSignalAt: string | null
    signalCount: number
  }
}

const SECTION_TITLES: Record<CulinaryProfileShareCategory, string> = {
  cuisines: 'Cuisines',
  ingredients: 'Ingredients',
  dietary: 'Dietary and Allergens',
  dislikes: 'Dislikes and Do Not Repeat',
  restaurants: 'Restaurants',
  dishes: 'Dishes',
  budget: 'Budget Tendencies',
  cravings: 'Recent Cravings',
  fatigue: 'Fatigue and Repeat Warnings',
  service_style: 'Service Style',
}

function latestObservedAt(items: Array<{ observedAt: string }>): string | null {
  const latest = items
    .map((item) => Date.parse(item.observedAt))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => right - left)[0]

  return latest ? new Date(latest).toISOString() : null
}

function buildSections(items: SharedProfileReportItem[]): ChefFacingCulinaryProfileReportSection[] {
  const byCategory = new Map<CulinaryProfileShareCategory, SharedProfileReportItem[]>()

  for (const item of items) {
    byCategory.set(item.category, [...(byCategory.get(item.category) ?? []), item])
  }

  return [...byCategory.entries()].map(([category, categoryItems]) => ({
    category,
    title: SECTION_TITLES[category],
    items: categoryItems,
  }))
}

function suggestedActions(
  categories: CulinaryProfileShareCategory[],
  hasRedactions: boolean
): string[] {
  const actions: string[] = []

  if (categories.includes('dietary')) {
    actions.push('Confirm constraints before proposing substitutions.')
  }
  if (categories.includes('dislikes') || categories.includes('fatigue')) {
    actions.push('Avoid repeating recently rejected or fatigued directions.')
  }
  if (categories.includes('cravings') || categories.includes('dishes')) {
    actions.push('Use recent cravings as menu direction, not as a fixed order.')
  }
  if (categories.includes('budget')) {
    actions.push('Keep proposal options inside the shared budget tendency.')
  }
  if (hasRedactions) {
    actions.push('Ask the client if more detail is needed instead of inferring hidden preferences.')
  }

  return actions.length > 0 ? actions : ['Start with a short taste check-in before planning.']
}

export function buildChefFacingCulinaryProfileReport(input: {
  profile: DerivedPreferenceProfile
  grants: CulinaryProfileSharingGrantRecord[]
  access: CulinaryProfileAccessContext
  generatedAt?: string
}): ChefFacingCulinaryProfileReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString()
  const filtered = filterShareableCulinaryProfileSignals({
    signals: input.profile.resolved,
    grants: input.grants,
    context: input.access,
  })
  const items = toSharedProfileReportItems(filtered.allowedSignals)
  const sections = buildSections(items)
  const visibleCategories = [...new Set(items.map((item) => item.category))]
  const redactionTotal = Object.values(filtered.redactionCounts).reduce(
    (total, count) => total + count,
    0
  )

  return {
    ownerId: input.profile.ownerId,
    viewerChefId: input.access.requestingChefId ?? null,
    status: items.length > 0 ? 'visible' : redactionTotal > 0 ? 'limited' : 'blocked',
    generatedAt,
    visibleCategories,
    sections,
    suggestedChefActions: suggestedActions(visibleCategories, redactionTotal > 0),
    redactions: filtered.redactionCounts,
    freshness: {
      profileGeneratedAt: input.profile.generatedAt,
      latestSignalAt: latestObservedAt(input.profile.resolved),
      signalCount: input.profile.resolved.length,
    },
  }
}
