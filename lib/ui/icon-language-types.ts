export type IconCategory = 'navigation' | 'action' | 'status' | 'entity' | 'culinary' | 'finance' | 'communication'

export type IconDefinition = {
  id: string
  tenantId: string
  name: string
  category: IconCategory
  svgContent?: string | null
  lucideIcon?: string | null
  emoji?: string | null
  meaning: string
  usageGuidelines?: string | null
  createdAt: Date
}

export type IconMapping = {
  id: string
  tenantId: string
  context: string
  iconName: string
  purpose?: string | null
  createdAt: Date
}

export type IconLanguageSummary = {
  totalIcons: number
  byCategory: Record<IconCategory, number>
  totalMappings: number
  unmappedContexts: string[]
}
