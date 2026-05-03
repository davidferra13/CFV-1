// Menus module - public API

// actions.ts ('use server')
export {
  createMenu,
  createMenuWithCourses,
  getMenus,
  getMenuById,
  updateMenu,
  deleteMenu,
  restoreMenu,
  attachMenuToEvent,
  detachMenuFromEvent,
  getEventMenus,
  getMenuEvent,
  transitionMenu,
  unlockMenu,
  addDishToMenu,
  updateDish,
  deleteDish,
  getAllDishes,
  addComponentToDish,
  updateComponent,
  deleteComponent,
  getAllComponents,
} from './actions'
export type {
  CreateMenuInput,
  UpdateMenuInput,
  CreateDishInput,
  UpdateDishInput,
  CreateComponentInput,
  UpdateComponentInput,
  CourseInput,
  ComponentListItem,
} from './actions'

// allergen-check.ts
export {
  ingredientMatchesAllergen,
  checkDishAgainstAllergens,
  ALLERGEN_INGREDIENT_MAP,
} from './allergen-check'
export type { AllergenConflict } from './allergen-check'

// approval-portal.ts ('use server')
export {
  sendMenuProposal,
  submitDishFeedback,
  approveEntireMenu,
  getMenuRevisions,
} from './approval-portal'

// bulk-actions.ts ('use server')
export {
  archiveMenu,
  restoreMenu as restoreMenuBulk,
  bulkArchiveMenus,
  bulkRestoreMenus,
  bulkDeleteDraftMenus,
} from './bulk-actions'
export type { BulkResult } from './bulk-actions'

// canonical-dish-menu-core.ts
export { materializeCanonicalDishIntoMenu } from './canonical-dish-menu-core'

// constants.ts
export {
  COMPONENT_CATEGORIES,
  TRANSPORT_CATEGORIES,
  PREP_TIMES_OF_DAY,
  PREP_TIME_LABELS,
  PREP_DAY_OPTIONS,
  PREP_STATION_SUGGESTIONS,
} from './constants'
export type { ComponentCategory, TransportCategory, PrepTimeOfDay } from './constants'

// course-utils.ts
export { getNextCourseNumber, hasCourseNumber, getDuplicateCourseError } from './course-utils'

// dish-feedback-query.ts ('use server')
export { getDishFeedbackSummary } from './dish-feedback-query'
export type { DishFeedbackSummary } from './dish-feedback-query'

// dish-index-actions.ts ('use server')
export {
  createDishIndexEntry,
  getDishIndex,
  getDishById,
  updateDishIndexEntry,
  archiveDish,
  restoreDish,
  linkRecipeToDish,
  unlinkRecipeFromDish,
  getDishAppearances,
  getClientDishHistory,
  addDishAppearance,
  addDishFeedback,
  getDishFeedback,
  findPotentialDuplicates,
  mergeDishes,
  getDishIndexStats,
  getSeasonalDistribution,
  getDishPairings,
} from './dish-index-actions'
export type { CreateDishIndexInput, UpdateDishIndexInput } from './dish-index-actions'

// dish-index-bridge.ts ('use server')
export { indexDishesFromMenu, searchDishIndexForMenu } from './dish-index-bridge'

// dish-index-constants.ts
export {
  DISH_COURSES,
  DISH_COURSE_LABELS,
  ROTATION_STATUSES,
  ROTATION_STATUS_LABELS,
  ROTATION_STATUS_COLORS,
  PREP_COMPLEXITIES,
  PLATING_DIFFICULTIES,
  SEASONS,
  DIETARY_TAG_OPTIONS,
  ALLERGEN_FLAG_OPTIONS,
  canonicalizeDishName,
} from './dish-index-constants'
export type {
  DishCourse,
  RotationStatus,
  PrepComplexity,
  PlatingDifficulty,
  Season,
} from './dish-index-constants'

// dish-source-actions.ts ('use server')
export {
  addCanonicalDishToMenu,
  convertReferencedMenuDishToCopy,
  syncReferencedMenuDish,
} from './dish-source-actions'

// editor-actions.ts ('use server')
export {
  notifyClientOfMenuEdit,
  getEditorContext,
  updateMenuMeta,
  updateDishEditorContent,
  addEditorCourse,
  deleteEditorCourse,
  reorderEditorCourse,
  searchRecipesForEditor,
  linkRecipeToEditorDish,
  unlinkRecipeFromEditorDish,
  getEditorClientList,
  getEditorMenuCost,
} from './editor-actions'
export type {
  EditorDish,
  EditorMenu,
  EditorEvent,
  PreviousMenu,
  DirectClient,
  EditorContext,
  ClientPickerOption,
} from './editor-actions'

// estimate-actions.ts ('use server')
export { estimateMenuCost, getEditorDishCostBreakdown } from './estimate-actions'
export type { DishEstimate, MenuEstimate } from './estimate-actions'

// extract-text.ts ('use server')
export {
  extractTextFromPdf,
  extractTextFromDocx,
  extractTextFromTxt,
  extractTextFromImage,
  extractTextFromFile,
} from './extract-text'

// menu-engineering-actions.ts ('use server')
export {
  analyzeMenuEngineering,
  getRecipeProfitability,
  getMenuMixAnalysis,
  getMenuSimulatorData,
} from './menu-engineering-actions'
export type {
  MenuQuadrant,
  RecipeEngineering,
  MenuEngineeringResult,
  QuadrantRecommendation,
  RecipeProfitability,
  MenuMixResult,
  MenuSimulatorData,
} from './menu-engineering-actions'

// menu-history-actions.ts ('use server')
export {
  getClientMenuHistory,
  addMenuHistoryEntry,
  autoLogMenuFromEvent,
  updateMenuFeedback,
  getDishFrequency,
  getNeverServedDishes,
  getMenuHistoryStats,
  searchMenuHistory,
} from './menu-history-actions'

// menu-intelligence-actions.ts
export {
  revalidateMenuIntelligenceCache,
  checkMenuMargins,
  getMenuBreakdown,
  scaleMenuToGuestCount,
  getIngredientPriceAlerts,
  initializeMenuForEvent,
  getMenuContextData,
  getMenuIngredientStock,
  validateMenuAllergens,
  getRecipeUsage,
  checkMenuScaleMismatch,
  getMenuInquiryLink,
  getMenuSeasonalWarnings,
  getMenuPerformance,
} from './menu-intelligence-actions'
export type {
  MarginAlertLevel,
  MarginAlert,
  MenuCostBreakdown,
  CourseBreakdown,
  ComponentBreakdown,
  IngredientBreakdown,
  PriceAlert,
  ScalingSummary,
  ScalingAdjustment,
  BudgetComplianceResult,
  MenuIngredientStock,
  MenuAllergenWarning,
  RecipeUsageEntry,
  SeasonalIngredientWarning,
  MenuPerformanceHistory,
} from './menu-intelligence-actions'

// menu-intelligence-cache.ts
export {
  MENU_CONTEXT_CACHE_TAG,
  MENU_PERF_CACHE_TAG,
  MENU_SEASONAL_CACHE_TAG,
  MENU_TASTE_CACHE_TAG,
} from './menu-intelligence-cache'

// menu-lifecycle.ts
export { transitionMenuWithContext, reopenMenuDraftWithContext } from './menu-lifecycle'
export type { MenuTransitionSideEffects, TransitionMenuWithContextInput } from './menu-lifecycle'

// menu-share-actions.ts ('use server')
export {
  createMenuSelectionToken,
  getMenuSelectionTokens,
  deactivateMenuSelectionToken,
  getTokenMenuSelections,
  getMenuByToken,
  submitTokenMenuSelections,
} from './menu-share-actions'
export type { MenuSelectionToken, PublicMenuData, TokenMenuSelection } from './menu-share-actions'

// menu-simulator.ts
export { simulateDishSwap, formatCentsDelta, formatCents } from './menu-simulator'
export type { SimulatorDish, DishSwapParams, SimulationResult } from './menu-simulator'

// modifications.ts ('use server')
export {
  logMenuModification,
  getEventModifications,
  deleteMenuModification,
  uploadModificationPhoto,
  getModificationStats,
} from './modifications'
export type { LogModificationInput, ModificationPhotoResult } from './modifications'

// parse-menu-text.ts
export { parseMenuText, parseMenuFromPastedText } from './parse-menu-text'
export type { ParsedDish, MenuParseResult } from './parse-menu-text'

// preference-actions.ts ('use server')
export {
  submitMenuPreferences,
  getMenuPreferences,
  markPreferencesViewed,
} from './preference-actions'
export type { SubmitPreferencesInput } from './preference-actions'

// quick-price-actions.ts ('use server')
export { getQuickPriceEstimate, getMenuListForPricing } from './quick-price-actions'
export type { QuickPriceEstimate } from './quick-price-actions'

// repeat-detection.ts ('use server')
export {
  checkRepeatMenu,
  getClientMenuHistory as getClientMenuHistoryRepeat,
} from './repeat-detection'
export type { RepeatMenuResult, ClientMenuHistoryEntry } from './repeat-detection'

// revisions.ts ('use server')
export { getRevisionHistory, compareRevisions } from './revisions'
export type { MenuRevision } from './revisions'

// rotation-guard.ts ('use server')
export {
  getRecentlyServedDishes,
  getRotationSuggestions,
  isDishSafeToServe,
} from './rotation-guard'
export type { RecentDish, RotationSuggestion } from './rotation-guard'

// showcase-actions.ts ('use server')
export {
  toggleShowcase,
  getMenuLibraryForEvent,
  getShowcaseMenus,
  getShowcaseMenuDetail,
} from './showcase-actions'

// tasting-menu-actions.ts ('use server')
export {
  getTastingMenus,
  getTastingMenu,
  createTastingMenu,
  updateTastingMenu,
  deleteTastingMenu,
  linkTastingMenuToEvent,
  unlinkTastingMenuFromEvent,
  addCourse,
  updateCourse,
  removeCourse,
  reorderCourses,
  duplicateTastingMenu,
} from './tasting-menu-actions'
export type {
  CourseType,
  PortionSize,
  TastingMenuInput,
  TastingMenu,
  TastingMenuCourse,
  TastingMenuWithCourses,
} from './tasting-menu-actions'

// tasting-menu-bridge.ts
export {
  syncTastingMenuToEngine,
  syncSingleCourse,
  removeMaterializedDish,
  deleteMaterializedMenu,
} from './tasting-menu-bridge'

// template-actions.ts ('use server')
export {
  createMenuTemplate,
  getMenuTemplates,
  getMenuTemplate,
  updateMenuTemplate,
  deleteMenuTemplate,
  createMenuFromTemplate,
  saveMenuAsTemplate,
  getSeasonalCalendar,
  suggestTemplate,
} from './template-actions'
export type {
  TemplateSeason,
  TemplateDishComponent,
  TemplateDish,
  MenuTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  SeasonalCalendarEntry,
} from './template-actions'

// upload-actions.ts ('use server')
export {
  createUploadJob,
  getUploadJobs,
  getUploadJobById,
  processUploadJob,
  processFromPastedText,
  approveAndIndexDishes,
  checkDuplicateUpload,
  deleteUploadJob,
} from './upload-actions'
