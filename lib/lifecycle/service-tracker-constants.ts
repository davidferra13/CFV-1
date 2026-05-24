export type ServiceStage = 'prep' | 'cooking' | 'plating' | 'serving' | 'cleanup'

export type ServiceStageInfo = {
  key: ServiceStage
  label: string
  description: string
}

export const SERVICE_STAGES: ServiceStageInfo[] = [
  { key: 'prep', label: 'Prep', description: 'Mise en place, station setup' },
  { key: 'cooking', label: 'Cooking', description: 'Active cooking, sauces, proteins' },
  { key: 'plating', label: 'Plating', description: 'Assembling plates, garnish' },
  { key: 'serving', label: 'Serving', description: 'Courses going out to guests' },
  { key: 'cleanup', label: 'Cleanup', description: 'Breakdown, packing, reset' },
]

export type GuestInfo = {
  id: string
  name: string | null
  rsvp_status: string | null
  dietary_restrictions: string[] | null
  allergies: string[] | null
}

export type ServiceTrackerState = {
  currentStage: ServiceStage
  serviceStartedAt: string | null
  serviceCompletedAt: string | null
  guestCount: number
  guests: GuestInfo[]
  guestsAttending: number
  guestsDeclined: number
  activeDietaryRestrictions: string[]
  activeAllergies: string[]
  carPacked: boolean
  groceryListReady: boolean
  prepListReady: boolean
  executionSheetReady: boolean
  resetComplete: boolean
  resetCompletedAt: string | null
}
