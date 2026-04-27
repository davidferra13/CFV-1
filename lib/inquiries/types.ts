export type LostReasonStat = { reason: string; count: number }

export interface FirstContactInquiry {
  id: string
  clientName: string
  channel: string
  confirmedDate: string | null
  confirmedOccasion: string | null
  confirmedLocation: string | null
  firstContactAt: string
  clientId: string | null
}

export type ReadinessScore = {
  score: number
  total: number
  percent: number
  filled: string[]
  missing: string[]
  level: 'ready' | 'almost' | 'partial' | 'minimal'
}

export type ResponseQueueItem = {
  id: string
  clientName: string
  occasion: string | null
  confirmedDate: string | null
  guestCount: number | null
  waitingHours: number
  updatedAt: string
  readiness: ReadinessScore
  status: string
}
