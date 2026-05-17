// Menu Costing Interrogation Types
// Hierarchical cost breakdown: menu -> course -> dish -> component -> ingredient

// Confidence levels for price data quality
export type CostConfidence = 'high' | 'medium' | 'low' | 'unknown'

// Types of cost data gaps that affect accuracy
export type CostGapType = 'missing_price' | 'stale_price' | 'no_yield_factor'

export interface CostGap {
  ingredientId: string
  ingredientName: string
  gapType: CostGapType
  /** For stale_price: how many days old */
  staleDays?: number
  /** Quantity needed in recipe (higher = more impact) */
  quantityNeeded: number
  unit: string
  /** Which dish(es) use this ingredient */
  affectedDishNames: string[]
  /** Which component(s) use this ingredient */
  affectedComponentNames: string[]
}

// Leaf level: individual ingredient in a recipe
export interface IngredientCostRow {
  ingredientId: string
  ingredientName: string
  quantity: number
  unit: string
  yieldPct: number | null
  /** Raw cost before yield adjustment, in cents */
  rawCostCents: number | null
  /** Cost after yield adjustment, in cents */
  adjustedCostCents: number | null
  confidence: CostConfidence
  priceSource: string | null
  priceFreshness: string | null
  gaps: CostGapType[]
}

// Component level: a recipe component within a dish
export interface ComponentCostRow {
  componentId: string
  componentName: string
  category: string
  recipeId: string | null
  recipeName: string | null
  /** Sum of all ingredient costs in this component, in cents */
  subtotalCents: number | null
  confidence: CostConfidence
  ingredients: IngredientCostRow[]
  gapCount: number
}

// Dish level: a course dish within a menu
export interface DishCostRow {
  dishId: string
  dishName: string
  courseNumber: number
  courseName: string
  /** Sum of all component costs in this dish, in cents */
  subtotalCents: number | null
  confidence: CostConfidence
  components: ComponentCostRow[]
  gapCount: number
}

// Course-level aggregation (groups dishes by course)
export interface CourseCostRow {
  courseNumber: number
  courseName: string
  /** Sum of all dish costs in this course, in cents */
  subtotalCents: number | null
  confidence: CostConfidence
  dishes: DishCostRow[]
  gapCount: number
}

// Top-level menu cost summary stats
export interface MenuCostSummary {
  menuId: string
  menuName: string
  /** Total food cost for the full menu, in cents */
  totalFoodCostCents: number | null
  /** Number of ingredients with prices resolved */
  ingredientsCosted: number
  /** Number of ingredients missing price data */
  ingredientsMissing: number
  /** Overall confidence for the menu */
  overallConfidence: CostConfidence
  /** Total cost gaps across all levels */
  totalGapCount: number
  /** Weighted average confidence (0-1) */
  weightedConfidence: number
}

// Full hierarchical breakdown
export interface MenuCostBreakdown {
  summary: MenuCostSummary
  courses: CourseCostRow[]
  /** All gaps flattened, sorted by impact */
  gaps: CostGap[]
}

// Comparison between two menus
export interface MenuCostComparisonSide {
  menuId: string
  menuName: string
  totalFoodCostCents: number | null
  courseCount: number
  dishCount: number
  ingredientCount: number
  overallConfidence: CostConfidence
  weightedConfidence: number
}

export interface MenuCostComparison {
  menuA: MenuCostComparisonSide
  menuB: MenuCostComparisonSide
  /** Difference in cents (B minus A); null if either side is unknown */
  deltaCents: number | null
  /** Percentage change from A to B; null if A is zero or unknown */
  deltaPct: number | null
  /** Per-course comparison where course numbers match */
  courseDeltas: Array<{
    courseNumber: number
    courseName: string
    aCents: number | null
    bCents: number | null
    deltaCents: number | null
  }>
}

// Profitability preview at a given price point
export interface MenuProfitabilityPreview {
  menuId: string
  menuName: string
  guestCount: number
  pricePerHeadCents: number
  /** Total revenue (guestCount * pricePerHead), in cents */
  totalRevenueCents: number
  /** Total food cost from breakdown, in cents */
  totalFoodCostCents: number | null
  /** Food cost as percentage of revenue */
  foodCostPct: number | null
  /** Estimated labor cost from chef_pricing_config, in cents */
  laborCostCents: number
  /** Overhead from chef_pricing_config, in cents */
  overheadCents: number | null
  /** Revenue minus food, labor, and overhead, in cents */
  estimatedProfitCents: number | null
  /** Profit as percentage of revenue */
  profitMarginPct: number | null
  /** Overall cost confidence */
  confidence: CostConfidence
  /** Warnings (e.g. "12 ingredients have unknown prices") */
  warnings: string[]
}
