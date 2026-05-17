export type VisualState = 'active' | 'inactive' | 'pending' | 'error' | 'success' | 'warning' | 'disabled'

export type AnimationType = 'none' | 'pulse' | 'fade' | 'glow'

export type VisualStateStyle = {
  id: string
  tenantId: string
  state: VisualState
  bgColor: string
  textColor: string
  borderColor: string | null
  borderWidth: number
  opacity: number
  animation: AnimationType
  icon: string | null
  createdAt: Date
}

export type LifecycleStateMapping = {
  id: string
  tenantId: string
  lifecycleStage: string
  visualState: VisualState
  label: string
  description: string | null
  createdAt: Date
}

export type VisualStateSummary = {
  totalStyles: number
  totalMappings: number
  unmappedStages: string[]
  stateDistribution: Record<VisualState, number>
}
