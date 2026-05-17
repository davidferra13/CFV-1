export type FixtureScenario = 'new_chef' | 'busy_week' | 'first_event' | 'returning_client' | 'multi_event' | 'overdue_payments' | 'empty_state'

export interface FixtureSet {
  id: string
  scenario: FixtureScenario
  name: string
  description: string
  data: FixtureData
  createdAt: string
}

export interface FixtureData {
  events: Record<string, unknown>[]
  clients: Record<string, unknown>[]
  menus: Record<string, unknown>[]
  recipes: Record<string, unknown>[]
  invoices: Record<string, unknown>[]
  quotes: Record<string, unknown>[]
}

export interface FixtureTemplate {
  scenario: FixtureScenario
  name: string
  description: string
  eventCount: number
  clientCount: number
  menuCount: number
  recipeCount: number
}
