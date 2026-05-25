// Types for the Info Change Detection system (Communication Capture Loop, Deliverable 2)

export type InfoChangeType =
  | 'guest_count'
  | 'date_change'
  | 'dietary_change'
  | 'menu_feedback'
  | 'cancellation'
  | 'payment'
  | 'address_change'

export type SuggestedUpdate = {
  type: InfoChangeType
  confidence: 'high' | 'medium' | 'low'
  /** Human-readable description of the detected change */
  label: string
  /** Extracted value (e.g. "12" for guest count, "pescatarian" for dietary) */
  extractedValue: string | null
  /** Which entity field this would update */
  targetField: string
  /** Entity type to update */
  targetEntity: 'event' | 'client'
}

export type InfoChangeDetectionResult = {
  suggestedUpdates: SuggestedUpdate[]
  rawText: string
}
