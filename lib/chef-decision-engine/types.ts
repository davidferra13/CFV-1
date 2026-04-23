import type { ConsolidatedIngredient } from '@/lib/formulas/grocery-consolidation'

export type ChefDecisionSeverity = 'critical' | 'warning' | 'info'

export type ChefDecisionReadinessState = 'ready' | 'risk' | 'not_ready'

export type ChefDecisionConsensusState = 'locked' | 'strong' | 'weak' | 'tie' | 'fallback'

export type ChefDecisionBranchStrategy =
  | 'single_path'
  | 'main_plus_accommodation'
  | 'split_menu'

export type ChefDecisionFactorKey = 'votes' | 'simplicity' | 'cost' | 'history' | 'safety'

export type ChefDecisionConstraintSeverity = 'preference' | 'intolerance' | 'anaphylaxis'

export type ChefDecisionConstraintType = 'dietary' | 'allergy'

export type ChefDecisionCoverage = 'full' | 'partial' | 'missing'

export interface ChefDecisionThresholds {
  weakConsensusVoteShare: number
  weakConsensusMargin: number
  consolidationVoteShareMin: number
  accommodationVoteShareMax: number
  riskPrepMinutes: number
  notReadyPrepMinutes: number
  riskOnSiteComponentCount: number
  notReadyOnSiteComponentCount: number
  riskComponentCount: number
  notReadyComponentCount: number
  riskUniqueIngredientCount: number
  notReadyUniqueIngredientCount: number
  riskUniqueEquipmentCount: number
  redundancyCourseCount: number
}

export interface ChefDecisionEventContext {
  id: string
  clientId: string | null
  clientName: string | null
  eventDate: string | null
  guestCount: number
  serviceStyle: string | null
  specialRequests: string | null
  kitchenConstraints: string | null
  equipmentAvailable: string[]
  equipmentMustBring: string[]
  confirmedEquipment: string[]
  allergies: string[]
  dietaryRestrictions: string[]
}

export interface ChefDecisionClientSignals {
  loved: string[]
  disliked: string[]
  favoriteDishes: string[]
  cuisinePreferences: string[]
  spicePreference: string | null
  pastEventCount: number
}

export interface ChefDecisionGuestConstraint {
  label: string
  type: ChefDecisionConstraintType
  severity: ChefDecisionConstraintSeverity
}

export interface ChefDecisionGuest {
  id: string
  name: string
  attending: boolean
  constraints: ChefDecisionGuestConstraint[]
}

export interface ChefDecisionIngredientPerGuest {
  ingredientId: string | null
  ingredientName: string
  unit: string
  quantityPerGuest: number | null
  allergenFlags: string[]
  dietaryTags: string[]
  sourceRecipeId: string | null
  sourceRecipeName: string | null
}

export interface ChefDecisionDishOperationalMetrics {
  componentCount: number
  makeAheadComponentCount: number
  onSiteComponentCount: number
  totalPrepMinutes: number
  totalCookMinutes: number
  totalTimeMinutes: number
  missingRecipeComponentCount: number
}

export interface ChefDecisionDishCostMetrics {
  costPerPortionCents: number | null
  hasCompleteCostData: boolean
  ingredientCount: number
  lastPriceUpdatedAt: string | null
}

export interface ChefDecisionDishHistoryMetrics {
  avgRating: number | null
  reviewCount: number
  positiveCount: number
  negativeCount: number
  repeatCount: number
  wasRejected: boolean
  recentlyServedOn: string | null
  requestCount: number
  avoidCount: number
}

export interface ChefDecisionDishInput {
  id: string
  menuId: string | null
  courseKey: string
  courseNumber: number | null
  courseName: string
  name: string
  description: string | null
  dietaryTags: string[]
  allergenFlags: string[]
  ingredientNames: string[]
  equipment: string[]
  ingredients: ChefDecisionIngredientPerGuest[]
  operationalMetrics: ChefDecisionDishOperationalMetrics
  costMetrics: ChefDecisionDishCostMetrics
  history: ChefDecisionDishHistoryMetrics
}

export interface ChefDecisionCourseOptionInput {
  dish: ChefDecisionDishInput
  voteCount: number
  selectedGuestIds: string[]
  selectedGuestNames: string[]
  source: 'poll' | 'locked' | 'menu' | 'fallback' | 'external'
  explicitLock: boolean
}

export interface ChefDecisionCourseInput {
  courseKey: string
  courseNumber: number | null
  courseName: string
  pollId: string | null
  totalVotes: number
  lockedDishId: string | null
  lockedReason: string | null
  options: ChefDecisionCourseOptionInput[]
}

export interface ChefDecisionContext {
  referenceDate: string
  generatedAt?: string
  event: ChefDecisionEventContext
  clientSignals: ChefDecisionClientSignals
  guests: ChefDecisionGuest[]
  courses: ChefDecisionCourseInput[]
  thresholds?: Partial<ChefDecisionThresholds>
}

export interface ChefDecisionSelectionSignals {
  courses: Array<{
    courseKey?: string | null
    courseNumber?: number | null
    courseName?: string | null
    pollId?: string | null
    totalVotes?: number | null
    lockedDishId?: string | null
    lockedReason?: string | null
    options: Array<{
      dishId: string
      voteCount?: number | null
      selectedGuestIds?: string[] | null
      selectedGuestNames?: string[] | null
      source?: 'poll' | 'locked' | 'menu' | 'fallback' | 'external' | null
      explicitLock?: boolean | null
      metadata?: Record<string, unknown> | null
    }>
  }>
}

export interface ChefDecisionFactorScore {
  key: ChefDecisionFactorKey
  weight: number
  score: number
  contribution: number
  detail: string
}

export interface ChefDecisionRiskFlag {
  code: string
  severity: ChefDecisionSeverity
  scope: 'event' | 'course' | 'dish' | 'guest'
  courseKey?: string
  dishId?: string | null
  guestIds?: string[]
  message: string
  suggestedResolution: string | null
}

export interface ChefDecisionAccommodationPlan {
  dishId: string
  dishName: string
  guestCount: number
  guestIds: string[]
  guestNames: string[]
  reason: string
}

export interface ChefDecisionCourseRecommendation {
  courseKey: string
  courseNumber: number | null
  courseName: string
  resolution: 'locked' | 'recommended'
  consensus: ChefDecisionConsensusState
  selectedDishId: string | null
  selectedDishName: string | null
  selectedMenuId: string | null
  totalVotes: number
  voteShare: number | null
  marginOverNext: number | null
  branchStrategy: ChefDecisionBranchStrategy
  allocatedGuestCount: number
  accommodation: ChefDecisionAccommodationPlan | null
  warnings: string[]
  factorScores: ChefDecisionFactorScore[]
}

export interface ChefDecisionPrepPlan {
  totalPrepMinutes: number
  totalCookMinutes: number
  totalTimeMinutes: number
  componentCount: number
  makeAheadComponentCount: number
  onSiteComponentCount: number
  branchCount: number
  uniqueEquipment: string[]
  steps: string[]
}

export interface ChefDecisionIngredientPlan {
  coverage: ChefDecisionCoverage
  servingsPlanned: number
  ingredients: ConsolidatedIngredient[]
  bySection: Record<string, ConsolidatedIngredient[]>
  dietaryFlags: string[]
  shoppingNotes: string
  missingDishIds: string[]
}

export interface ChefDecisionExecutionReadiness {
  state: ChefDecisionReadinessState
  reasons: string[]
  blockers: string[]
  warnings: string[]
  metrics: {
    selectedCourseCount: number
    totalCourseCount: number
    branchCount: number
    criticalConflictCount: number
    warningConflictCount: number
    missingRecipeComponentCount: number
    missingIngredientDishCount: number
    unmatchedEquipment: string[]
    totalPrepMinutes: number
    onSiteComponentCount: number
    uniqueIngredientCount: number
  }
}

export interface ChefDecisionTraceEntry {
  scope: 'course' | 'event'
  courseKey?: string
  title: string
  explanation: string
  evidence: string[]
}

export interface ChefDecisionEngineResult {
  generatedAt: string
  summary: string
  finalMenu: {
    status: 'locked' | 'recommended'
    courses: ChefDecisionCourseRecommendation[]
  }
  ingredientPlan: ChefDecisionIngredientPlan
  prepPlan: ChefDecisionPrepPlan
  riskFlags: ChefDecisionRiskFlag[]
  decisionTrace: ChefDecisionTraceEntry[]
  executionReadiness: ChefDecisionExecutionReadiness
}
