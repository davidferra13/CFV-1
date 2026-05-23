// Configuration Engine - Types
// Adaptive onboarding questionnaire that tailors workspace defaults per tenant.

export type ServiceType =
  | 'private-chef'
  | 'catering'
  | 'meal-prep'
  | 'food-truck'
  | 'restaurant'
  | 'multi'

export type ClientVolume = 'solo' | 'small' | 'medium' | 'large'

export type PricingStyle = 'per-head' | 'flat-rate' | 'hourly' | 'mixed'

export type TeamSize = 'solo' | 'with-sous' | 'small-team' | 'large-team'

export type TechComfort = 'beginner' | 'intermediate' | 'advanced'

export type ConfigQuestion = {
  id: string
  label: string
  description: string
  field: keyof ConfigAnswers
  options: { value: string; label: string; description?: string }[]
  /** When true, this question adapts based on prior answers. */
  adaptive: boolean
}

export type ConfigAnswers = {
  serviceType: ServiceType
  clientVolume: ClientVolume
  pricingStyle: PricingStyle
  teamSize: TeamSize
  techComfort: TechComfort
}

export type ConfigAnswer = {
  questionId: string
  field: keyof ConfigAnswers
  value: string
  answeredAt: string
}

export type WorkspaceConfig = {
  /** Which nav sections are visible by default. */
  enabledModules: string[]
  /** Default pricing mode for new events/quotes. */
  defaultPricingMode: PricingStyle
  /** Whether staff management is shown. */
  showStaffManagement: boolean
  /** Whether multi-event calendar views are prominent. */
  showCalendarOverview: boolean
  /** Feature disclosure level (controls progressive disclosure). */
  featureDisclosure: 'minimal' | 'standard' | 'full'
  /** Whether meal-prep specific views are enabled. */
  showMealPrepViews: boolean
  /** Whether food-truck/POS features are visible. */
  showPosFeatures: boolean
  /** Default service style for new events. */
  defaultServiceStyle: string
}

export type TenantConfiguration = {
  id: string
  tenantId: string
  questionResponses: ConfigAnswer[]
  appliedConfig: WorkspaceConfig
  createdAt: string
  updatedAt: string
}
