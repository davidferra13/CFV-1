import {
  type BuildCapabilityDefinition,
  type BuildCapabilityPriority,
  getBuildCapabilityCoverageSummary,
  listBuildCapabilities,
} from './capability-registry'

export interface BuildCapabilityPromptItem {
  id: string
  title: string
  category: string
  queuePath: string
}

export interface BuildCapabilityPromptContext {
  total: number
  categoryCount: number
  priorityCounts: Record<BuildCapabilityPriority, number>
  selectedCapabilities: readonly BuildCapabilityPromptItem[]
}

const DEFAULT_PROMPT_LIMIT = 12

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_PROMPT_LIMIT
  if (!Number.isFinite(limit) || limit <= 0) return 0

  return Math.floor(limit)
}

export function getBuildCapabilityPromptContext(
  limit?: number,
  definitions: readonly BuildCapabilityDefinition[] = listBuildCapabilities()
): BuildCapabilityPromptContext {
  if (definitions.length === 0) {
    return {
      total: 0,
      categoryCount: 0,
      priorityCounts: { high: 0, medium: 0, low: 0 },
      selectedCapabilities: [],
    }
  }

  const summary = getBuildCapabilityCoverageSummary(definitions)
  const selectedCapabilities = definitions.slice(0, normalizeLimit(limit)).map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    queuePath: item.queuePath,
  }))

  return {
    total: summary.total,
    categoryCount: summary.categories.length,
    priorityCounts: summary.priorityCounts,
    selectedCapabilities,
  }
}

export function formatBuildCapabilityPromptContext(
  context: BuildCapabilityPromptContext = getBuildCapabilityPromptContext()
): string {
  const lines = [
    'Build capability first-pass coverage',
    `Total capabilities: ${context.total}`,
    `Categories: ${context.categoryCount}`,
    `Priorities: high=${context.priorityCounts.high}, medium=${context.priorityCounts.medium}, low=${context.priorityCounts.low}`,
    'Selected capabilities:',
  ]

  if (context.total === 0 || context.selectedCapabilities.length === 0) {
    return [...lines, '- none'].join('\n')
  }

  return [
    ...lines,
    ...context.selectedCapabilities.map(
      (item) => `- ${item.id} | ${item.title} | ${item.category} | ${item.queuePath}`
    ),
  ].join('\n')
}
