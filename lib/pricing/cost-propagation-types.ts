// Cost Propagation Types
// Used by cost-propagation-actions.ts for cascading cost updates

export interface CostImpact {
  ingredientId: string
  ingredientName: string
  currentCents: number | null
  newCents: number | null
  deltaCents: number
  affectedRecipeCount: number
  affectedMenuCount: number
  affectedEventCount: number
}

export interface AffectedRecipe {
  recipeId: string
  recipeName: string
  currentTotalCostCents: number | null
  estimatedNewCostCents: number | null
}

export interface AffectedMenu {
  menuId: string
  menuName: string
  eventId: string | null
  eventName: string | null
  recipeCount: number
}

export interface AffectedEvent {
  eventId: string
  eventDate: string | null
  clientName: string | null
  menuId: string | null
  menuName: string | null
  costNeedsRefresh: boolean
}

export interface PropagationResult {
  ingredientIds: string[]
  recipesUpdated: number
  menusAffected: number
  eventsFlagged: number
  errors: string[]
  elapsedMs: number
}

export interface CostImpactPreview {
  ingredient: CostImpact
  affectedRecipes: AffectedRecipe[]
  affectedMenus: AffectedMenu[]
  affectedEvents: AffectedEvent[]
}
