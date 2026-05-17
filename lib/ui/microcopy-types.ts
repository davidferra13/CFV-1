export type MicrocopyCategory =
  | 'button'
  | 'label'
  | 'placeholder'
  | 'tooltip'
  | 'error'
  | 'success'
  | 'empty_state'
  | 'confirmation'

export interface MicrocopyEntry {
  id: string
  tenantId: string
  key: string
  category: MicrocopyCategory
  text: string
  context: string | null
  route: string | null
  tone: 'professional' | 'friendly' | 'urgent'
  maxLength: number | null
  createdAt: Date
  updatedAt: Date
}

export interface MicrocopyGlossary {
  id: string
  tenantId: string
  term: string
  definition: string
  preferredUsage: string | null
  avoidUsage: string | null
  createdAt: Date
}

export interface MicrocopySummary {
  totalEntries: number
  byCategory: Record<MicrocopyCategory, number>
  totalGlossary: number
  coverageByRoute: Record<string, number>
}
