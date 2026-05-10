// Menu Intelligence: shared types, constants, and helpers
// Used across all intelligence sub-modules.

export type {
  DietaryConflict,
  MenuClientTasteSummary,
} from '@/lib/clients/client-profile-chef-workflow'

export type MarginAlertLevel = 'ok' | 'warning' | 'critical'

export interface MarginAlert {
  level: MarginAlertLevel
  message: string
  foodCostPercent: number
  targetPercent: number
}

export interface MenuCostBreakdown {
  menuId: string
  menuName: string
  totalCostCents: number
  costPerGuestCents: number
  foodCostPercent: number | null
  guestCount: number
  quotedPriceCents: number | null
  hasAllPrices: boolean
  missingPriceCount: number
  alerts: MarginAlert[]
  courses: CourseBreakdown[]
}

export interface CourseBreakdown {
  courseNumber: number
  courseName: string
  dishId: string
  dishName: string | null
  totalCostCents: number
  components: ComponentBreakdown[]
}

export interface ComponentBreakdown {
  componentId: string
  componentName: string
  category: string
  scaleFactor: number
  recipeId: string | null
  recipeName: string | null
  recipeCostCents: number | null
  scaledCostCents: number | null
  ingredients: IngredientBreakdown[]
}

export interface IngredientBreakdown {
  ingredientId: string
  name: string
  quantity: number
  unit: string
  priceCents: number | null
  scaledQuantity: number
  scaledCostCents: number | null
  hasMissingPrice: boolean
}

export interface PriceAlert {
  ingredientId: string
  ingredientName: string
  currentPriceCents: number
  averagePriceCents: number
  spikePercent: number
  affectedMenus: string[]
}

export interface ScalingSummary {
  menuId: string
  previousGuestCount: number
  newGuestCount: number
  componentsScaled: number
  previousCostPerGuest: number | null
  newCostPerGuest: number | null
  adjustments: ScalingAdjustment[]
}

export interface ScalingAdjustment {
  componentName: string
  previousScale: number
  newScale: number
  note: string | null
}

export type BudgetComplianceResult =
  | {
      noQuoteSet: true
    }
  | {
      noQuoteSet?: false
      quotedPriceCents: number
      totalCostCents: number
      marginPercent: number
      status: 'ok' | 'warning' | 'critical'
    }

export interface MenuIngredientStock {
  ingredientId: string
  ingredientName: string
  neededQuantity: number
  neededUnit: string
  onHandQuantity: number
  onHandUnit: string | null
  status: 'ok' | 'low' | 'out'
}

export interface MenuAllergenWarning {
  dishName: string
  ingredientName: string
  allergen: string
  severity: 'critical' | 'warning'
}

export interface RecipeUsageEntry {
  menuId: string
  menuName: string
  eventId: string | null
  eventDate: string | null
  clientName: string | null
  dishName: string | null
}

export interface SeasonalIngredientWarning {
  ingredientName: string
  dishName: string
  eventMonth: number
  seasonLabel: string
  note: string
}

export interface MenuPerformanceHistory {
  timesUsed: number
  lastUsedDate: string | null
  lastUsedClient: string | null
  lastUsedEventId: string | null
  avgMarginPercent: number | null
  totalRevenueCents: number
}

export interface MenuPrepEstimate {
  estimatedTotalMinutes: number
  estimatedPrepMinutes: number
  estimatedServiceMinutes: number
  confidence: 'high' | 'medium' | 'low'
  basedOnEvents: number
}

export interface MenuVendorHint {
  ingredientName: string
  ingredientId: string
  currentPriceCents: number
  bestVendorName: string
  bestPriceCents: number
  savingsCents: number
  savingsPercent: number
}

export interface AssemblySource {
  id: string
  name: string
  type: 'template' | 'past_menu' | 'recipe'
  serviceStyle: string | null
  guestCount: number | null
  cuisineType: string | null
  eventDate: string | null
  clientName: string | null
  dishCount: number
}

export interface AssemblyDish {
  id: string
  name: string | null
  courseName: string
  courseNumber: number
  description: string | null
  dietaryTags: string[]
  componentCount: number
  hasRecipe: boolean
}

export interface AddDishResult {
  success: boolean
  newDishId: string
  componentsAdded: number
  scaleAdjusted: boolean
  newScaleFactor: number | null
}

// Margin thresholds (deterministic, from design doc)
export const MARGIN_WARNING_THRESHOLD = 35
export const MARGIN_CRITICAL_THRESHOLD = 45
export const PRICE_SPIKE_THRESHOLD = 1.3 // 30% above average
export const BUDGET_WARNING_THRESHOLD = 40 // food cost > 40% of quoted price
export const BUDGET_CRITICAL_THRESHOLD = 50 // food cost > 50% of quoted price

// Culinary scaling adjustments
export const SALT_SPICE_SCALE_FACTOR = 0.7
export const LEAVENING_SCALE_FACTOR = 0.75
export const BATCH_SPLIT_THRESHOLD = 3.0
export const SMALL_BATCH_THRESHOLD = 0.5

// Ingredient categories that get non-linear scaling
export const SALT_SPICE_CATEGORIES = ['spice', 'dry_herb', 'fresh_herb']
export const LEAVENING_NAMES = ['baking powder', 'baking soda', 'yeast', 'cream of tartar']

// Season lookup (deterministic)
export function getSeason(date: Date): string {
  const month = date.getMonth() + 1
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'fall'
  return 'winter'
}

// Guest tier (deterministic)
export function getGuestTier(count: number): string {
  if (count <= 8) return 'intimate'
  if (count <= 20) return 'small'
  if (count <= 50) return 'medium'
  if (count <= 100) return 'large'
  return 'banquet'
}

// Occasion to service style inference (deterministic)
export const OCCASION_SERVICE_MAP: Record<string, string> = {
  'wedding reception': 'buffet',
  wedding: 'plated',
  'rehearsal dinner': 'plated',
  'birthday party': 'family_style',
  birthday: 'plated',
  'dinner party': 'plated',
  'holiday dinner': 'plated',
  'corporate event': 'buffet',
  'cocktail party': 'cocktail',
  brunch: 'family_style',
  'tasting menu': 'tasting_menu',
  'wine dinner': 'tasting_menu',
}

// Shared helper to load the client linked to a menu via event
export async function loadMenuLinkedClientContext(
  menuId: string,
  tenantId: string,
  db: any
): Promise<{ clientId: string; clientName: string | null } | null> {
  const { data: menu } = await db
    .from('menus')
    .select('event_id')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .single()

  if (!menu?.event_id) return null

  const { data: event } = await db
    .from('events')
    .select('client_id')
    .eq('id', menu.event_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!event?.client_id) return null

  const { data: client } = await db
    .from('clients')
    .select('full_name')
    .eq('id', event.client_id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  return {
    clientId: event.client_id,
    clientName: client?.full_name ?? null,
  }
}
