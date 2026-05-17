export type ProofStage = 'before' | 'after'

export type ProofSnapshot = {
  id: string
  tenantId: string
  eventId: string
  route: string
  stage: ProofStage
  screenshotUrl: string | null
  metadata: Record<string, unknown> | null
  capturedAt: Date
}

export type ProofComparison = {
  id: string
  tenantId: string
  eventId: string
  beforeSnapshotId: string
  afterSnapshotId: string
  diffScore: number
  changedFields: string[]
  notes: string | null
  createdAt: Date
}

export type ProofSummary = {
  eventId: string
  totalSnapshots: number
  totalComparisons: number
  avgDiffScore: number
  lastCaptured: Date | null
}
