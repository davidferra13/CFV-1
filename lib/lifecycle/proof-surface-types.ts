// Lifecycle Proof Surface Types
// Defines the shape of lifecycle state, stage proof, and health data
// for the Event First Lifecycle Proof Surface.

export type LifecycleStage =
  | 'inquiry'
  | 'quoting'
  | 'contracted'
  | 'planning'
  | 'prep'
  | 'execution'
  | 'closeout'
  | 'archived'

export interface ProofPoint {
  key: string
  label: string
  exists: boolean
  entityType: string
  entityId: string | null
  timestamp: string | null
}

export interface StageProof {
  stage: LifecycleStage
  reached: boolean
  reachedAt: string | null
  proofPoints: ProofPoint[]
  completeness: number
}

export interface EventLifecycleState {
  eventId: string
  eventTitle: string
  currentStage: LifecycleStage
  stages: StageProof[]
  overallProgress: number
  nextActions: string[]
  daysInCurrentStage: number
}

export interface LifecycleOverview {
  byStage: Record<LifecycleStage, number>
  stuckEvents: {
    eventId: string
    title: string
    stage: LifecycleStage
    daysStuck: number
  }[]
  avgDaysPerStage: Record<LifecycleStage, number>
}

export interface LifecycleTimelineEntry {
  stage: LifecycleStage
  enteredAt: string
  exitedAt: string | null
  durationDays: number | null
  proofPoints: ProofPoint[]
}

export interface LifecycleHealthScore {
  totalEvents: number
  activeEvents: number
  stuckCount: number
  progressingCount: number
  healthPercent: number
  avgDaysPerStage: Record<LifecycleStage, number>
  bottleneckStage: LifecycleStage | null
}
