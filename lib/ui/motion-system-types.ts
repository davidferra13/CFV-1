export type MotionIntensity = 'none' | 'subtle' | 'moderate' | 'full'

export type TransitionType = 'fade' | 'slide' | 'scale' | 'collapse' | 'morph'

export interface MotionToken {
  name: string
  duration: number
  easing: string
  transitionType: TransitionType
  description?: string
}

export interface MotionPreference {
  id: string
  tenantId: string
  chefId: string
  intensity: MotionIntensity
  reducedMotion: boolean
  customTokens: MotionToken[]
  updatedAt: string
}

export interface StateTransitionRule {
  id: string
  tenantId: string
  fromState: string
  toState: string
  transitionType: TransitionType
  duration: number
  easing: string
  component?: string | null
  createdAt: string
}

export interface MotionSummary {
  totalRules: number
  byTransitionType: Record<TransitionType, number>
  preferenceDistribution: Record<MotionIntensity, number>
  reducedMotionCount: number
}
