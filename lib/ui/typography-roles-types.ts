export type TypographyRole = 'page_title' | 'section_heading' | 'card_title' | 'body' | 'caption' | 'label' | 'metric' | 'overline'

export type TypographyConfig = {
  id: string
  tenantId: string
  role: TypographyRole
  fontFamily: string
  fontSize: string
  fontWeight: string
  lineHeight: string
  letterSpacing: string | null
  color: string | null
  textTransform: string | null
  createdAt: Date
}

export type TextHierarchyRule = {
  id: string
  tenantId: string
  parentRole: TypographyRole
  childRole: TypographyRole
  maxNesting: number
  description: string | null
  createdAt: Date
}

export type TypographySummary = {
  totalConfigs: number
  byRole: Record<TypographyRole, number>
  totalRules: number
  coverage: number
}
