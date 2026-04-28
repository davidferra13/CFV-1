export type CulinaryUsageRanking = {
  id: string
  name: string
  category?: string | null
  useCount: number
  eventCount: number
  revenueCents: number
  lastUsedAt: string | null
  detail?: string
}

export type CulinaryUsageTrendPoint = {
  period: string
  menuUses: number
  recipeUses: number
  ingredientUses: number
}

export type CulinaryUsageCoverage = {
  activeMenus: number
  linkedEventMenus: number
  linkedRecipes: number
  ingredientsInActiveRecipes: number
  eventsWithMenus: number
  trackedEvents: number
}

export type CulinaryUsageStats = {
  generatedAt: string
  coverage: CulinaryUsageCoverage
  topIngredients: CulinaryUsageRanking[]
  topRecipes: CulinaryUsageRanking[]
  topMenus: CulinaryUsageRanking[]
  recentTrend: CulinaryUsageTrendPoint[]
}
