// Prep Timeline - Shared Types
// Extracted from server action file to avoid 'use server' export restrictions.

export interface PrepStep {
  time: string
  task: string
  duration: string
  category: 'shopping' | 'prep' | 'cooking' | 'plating' | 'service' | 'cleanup' | 'transport'
  notes?: string
}

export interface PrepTimeline {
  eventName: string
  eventDate: string | null
  guestCount: number | null
  serviceTime: string | null
  steps: PrepStep[]
  totalPrepHours: number
  summary: string
  _aiSource?: string
}
