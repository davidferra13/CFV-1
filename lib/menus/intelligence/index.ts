// Menu Intelligence barrel export
// All sub-modules re-exported for unified access.

// Shared types, constants, and helpers
export {
  // Types (re-exported from clients domain)
  type DietaryConflict,
  type MenuClientTasteSummary,
  // Local types
  type MarginAlertLevel,
  type MarginAlert,
  type MenuCostBreakdown,
  type CourseBreakdown,
  type ComponentBreakdown,
  type IngredientBreakdown,
  type PriceAlert,
  type ScalingSummary,
  type ScalingAdjustment,
  type BudgetComplianceResult,
  type MenuIngredientStock,
  type MenuAllergenWarning,
  type RecipeUsageEntry,
  type SeasonalIngredientWarning,
  type MenuPerformanceHistory,
  type MenuPrepEstimate,
  type MenuVendorHint,
  type AssemblySource,
  type AssemblyDish,
  type AddDishResult,
  // Constants
  MARGIN_WARNING_THRESHOLD,
  MARGIN_CRITICAL_THRESHOLD,
  PRICE_SPIKE_THRESHOLD,
  BUDGET_WARNING_THRESHOLD,
  BUDGET_CRITICAL_THRESHOLD,
  SALT_SPICE_SCALE_FACTOR,
  LEAVENING_SCALE_FACTOR,
  BATCH_SPLIT_THRESHOLD,
  SMALL_BATCH_THRESHOLD,
  SALT_SPICE_CATEGORIES,
  LEAVENING_NAMES,
  OCCASION_SERVICE_MAP,
  // Helpers
  getSeason,
  getGuestTier,
  loadMenuLinkedClientContext,
} from './shared'

// Cache utilities
export { revalidateMenuIntelligenceCache } from './cache-utils'

// Cost and margin analysis
export {
  checkMenuMargins,
  getMenuBreakdown,
  getIngredientPriceAlerts,
  getMenuVendorHints,
  checkMenuBudgetCompliance,
} from './cost-margin'

// Scaling and event initialization
export { scaleMenuToGuestCount, initializeMenuForEvent } from './scaling-init'

// Cross-referencing queries
export {
  getMenuContextData,
  getMenuIngredientStock,
  validateMenuAllergens,
  getRecipeUsage,
  checkMenuScaleMismatch,
  getMenuInquiryLink,
  getMenuSeasonalWarnings,
  getMenuPerformance,
  getMenuClientTaste,
  getMenuPrepEstimate,
  detectMenuDietaryConflicts,
} from './cross-reference'

// Assembly (Phase 2)
export {
  getAssemblySources,
  getDishesFromMenu,
  addDishFromSource,
  addRecipeAsComponent,
  quickAddDish,
} from './assembly'
