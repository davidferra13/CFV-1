export type ProductionStageState = 'ready' | 'attention' | 'blocked' | 'waiting' | 'done'

export type ProductionStage = {
  key: 'scale' | 'buy' | 'prep' | 'reconcile'
  label: string
  state: ProductionStageState
  status: string
  nextStep: string
}

export type ProductionLoopSignals = {
  eventStatus: string
  hasMenu: boolean
  recipeCount: number
  incompleteRecipeCount: number
  shoppingEligible: boolean
  shortageCount: number
  projectedPurchaseCents: number
  vendorCount: number
  prepBlockCount: number
  purchaseOrderCount: number
  openPurchaseOrderCount: number
  actualFoodCostCents: number
  unmatchedReceiptItems: number
  revenueCents: number
  totalCostCents: number
}

export type ProductionRecipeInput = {
  id: string
  name: string
  servings?: number | null
  yieldQuantity?: number | null
}

export type ProductionComponentInput = {
  recipeId: string
  scaleFactor?: number | null
}

export type ScaledProductionRecipe = {
  recipeId: string
  name: string
  baseServings: number
  batches: number
  targetServings: number
}

function round(value: number, places = 2) {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

export function computeScaledProductionRecipes(input: {
  guestCount: number
  serviceStyleMultiplier?: number
  recipes: ProductionRecipeInput[]
  components: ProductionComponentInput[]
}): ScaledProductionRecipe[] {
  const recipeMap = new Map(input.recipes.map((recipe) => [recipe.id, recipe]))
  const batchByRecipe = new Map<string, number>()
  const styleMultiplier = input.serviceStyleMultiplier ?? 1

  for (const component of input.components) {
    const recipe = recipeMap.get(component.recipeId)
    if (!recipe) continue
    const baseServings = Number(recipe.servings) || Number(recipe.yieldQuantity) || 4
    const componentScale = Number(component.scaleFactor) || 1
    const batches = (input.guestCount / baseServings) * componentScale * styleMultiplier
    batchByRecipe.set(component.recipeId, (batchByRecipe.get(component.recipeId) ?? 0) + batches)
  }

  return [...batchByRecipe.entries()]
    .map(([recipeId, batches]) => {
      const recipe = recipeMap.get(recipeId)!
      const baseServings = Number(recipe.servings) || Number(recipe.yieldQuantity) || 4
      return {
        recipeId,
        name: recipe.name,
        baseServings,
        batches: round(batches),
        targetServings: round(baseServings * batches, 1),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

const COMPLETE_STATUSES = new Set(['completed'])
export function buildProductionStages(signals: ProductionLoopSignals): ProductionStage[] {
  const scale: ProductionStage = !signals.hasMenu
    ? { key: 'scale', label: '1. Scale', state: 'blocked', status: 'Menu needed', nextStep: 'Attach the event menu.' }
    : signals.recipeCount === 0
      ? { key: 'scale', label: '1. Scale', state: 'blocked', status: 'Recipes needed', nextStep: 'Link menu components to recipes.' }
      : signals.incompleteRecipeCount > 0
        ? { key: 'scale', label: '1. Scale', state: 'attention', status: 'Recipe gaps', nextStep: `Fix ${signals.incompleteRecipeCount} incomplete recipe item${signals.incompleteRecipeCount === 1 ? '' : 's'}.` }
        : { key: 'scale', label: '1. Scale', state: 'ready', status: `${signals.recipeCount} recipes scaled`, nextStep: 'Quantities are scaled to this guest count.' }

  const eventComplete = COMPLETE_STATUSES.has(signals.eventStatus)
  const buy: ProductionStage = eventComplete
    ? { key: 'buy', label: '2. Buy', state: 'done', status: 'Purchasing closed', nextStep: 'Use captured receipts for final actual cost.' }
    : scale.state === 'blocked'
      ? { key: 'buy', label: '2. Buy', state: 'blocked', status: 'Waiting on recipes', nextStep: 'Finish the menu and recipe links first.' }
    : !signals.shoppingEligible
      ? { key: 'buy', label: '2. Buy', state: 'waiting', status: 'Waiting on booking', nextStep: 'Purchasing activates when the event is accepted or confirmed.' }
      : signals.shortageCount > 0
      ? { key: 'buy', label: '2. Buy', state: 'attention', status: `${signals.shortageCount} shortages`, nextStep: `Buy the shortages across ${signals.vendorCount || 1} vendor${signals.vendorCount === 1 ? '' : 's'}.` }
      : { key: 'buy', label: '2. Buy', state: 'ready', status: 'Stock covered', nextStep: 'No current ingredient shortages.' }
  const prep: ProductionStage = eventComplete
    ? { key: 'prep', label: '3. Prep', state: 'done', status: 'Service complete', nextStep: 'Prep history is retained with the event.' }
    : scale.state === 'blocked'
      ? { key: 'prep', label: '3. Prep', state: 'blocked', status: 'Waiting on menu', nextStep: 'Prep becomes reliable after recipes are linked.' }
    : signals.prepBlockCount === 0
      ? { key: 'prep', label: '3. Prep', state: 'attention', status: 'Plan not scheduled', nextStep: 'Generate or confirm prep blocks.' }
      : { key: 'prep', label: '3. Prep', state: 'ready', status: `${signals.prepBlockCount} prep block${signals.prepBlockCount === 1 ? '' : 's'}`, nextStep: 'Work the prep plan to completion.' }

  const reconcile: ProductionStage = !eventComplete && signals.actualFoodCostCents === 0
    ? { key: 'reconcile', label: '4. Reconcile', state: 'waiting', status: 'After purchasing', nextStep: 'Capture receipts as purchases happen.' }
    : signals.actualFoodCostCents === 0
      ? { key: 'reconcile', label: '4. Reconcile', state: 'attention', status: 'Actual cost missing', nextStep: 'Capture and approve event receipts.' }
      : signals.unmatchedReceiptItems > 0
        ? { key: 'reconcile', label: '4. Reconcile', state: 'attention', status: `${signals.unmatchedReceiptItems} unmatched`, nextStep: 'Match receipt items to ingredients.' }
        : eventComplete
          ? { key: 'reconcile', label: '4. Reconcile', state: 'done', status: 'Actuals captured', nextStep: 'Review final event profit and variance.' }
          : { key: 'reconcile', label: '4. Reconcile', state: 'ready', status: 'Actuals updating', nextStep: 'Keep capturing receipts through the event.' }

  return [scale, buy, prep, reconcile]
}
