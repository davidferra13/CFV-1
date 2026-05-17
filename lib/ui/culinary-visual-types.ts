// Culinary Visual Language - Type definitions
// UI SYSTEM #17: visual vocabulary for culinary concepts (icons, palettes, tokens)

export type CulinaryVisualCategory =
  | 'technique'
  | 'cuisine'
  | 'ingredient'
  | 'equipment'
  | 'plating'
  | 'season'

export type CulinaryIcon = {
  id: string
  name: string
  category: CulinaryVisualCategory
  svgPath?: string | null
  emoji?: string | null
  description?: string | null
}

export type CulinaryColorPalette = {
  id: string
  tenantId: string
  name: string
  cuisine?: string | null
  primaryColor: string
  secondaryColor?: string | null
  accentColor?: string | null
  textColor?: string | null
  bgColor?: string | null
}

export type CulinaryVisualToken = {
  id: string
  tenantId: string
  category: CulinaryVisualCategory
  key: string
  value: string
  description?: string | null
  createdAt: Date
}

export type CulinaryVisualSummary = {
  totalIcons: number
  totalPalettes: number
  totalTokens: number
  byCategory: Record<CulinaryVisualCategory, number>
}
