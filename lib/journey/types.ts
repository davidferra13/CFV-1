export type ChefJourneyStatus = 'planning' | 'in_progress' | 'completed' | 'archived'

export type ChefJourneyEntryType =
  | 'destination'
  | 'meal'
  | 'lesson'
  | 'experience'
  | 'idea'
  | 'reflection'
  | 'technique'
  | 'ingredient'

export type ChefJourneyIdeaStatus = 'backlog' | 'testing' | 'adopted' | 'parked'

export type ChefJourneyIdeaArea =
  | 'menu'
  | 'technique'
  | 'service'
  | 'sourcing'
  | 'team'
  | 'operations'

export type ChefJournalMediaType = 'photo' | 'video' | 'document'

export type ChefJourney = {
  id: string
  tenant_id: string
  created_by: string
  title: string
  destination_city: string | null
  destination_region: string | null
  destination_country: string | null
  started_on: string | null
  ended_on: string | null
  status: ChefJourneyStatus
  trip_summary: string
  favorite_meal: string
  favorite_experience: string
  key_learnings: string[]
  inspiration_ideas: string[]
  culinary_focus_tags: string[]
  collaborators: string[]
  cover_image_url: string | null
  created_at: string
  updated_at: string
}

export type ChefJourneyWithStats = ChefJourney & {
  entry_count: number
  highlight_count: number
  idea_count: number
  adopted_idea_count: number
  media_count: number
  recipe_link_count: number
}

export type ChefJourneyEntry = {
  id: string
  journey_id: string
  tenant_id: string
  created_by: string
  entry_type: ChefJourneyEntryType
  entry_date: string
  location_label: string
  formatted_address: string
  latitude: number | null
  longitude: number | null
  title: string
  narrative: string
  favorite_meal: string
  favorite_experience: string
  what_i_learned: string[]
  inspiration_taken: string[]
  dishes_to_explore: string[]
  mistakes_made: string[]
  proud_moments: string[]
  what_to_change_next_time: string[]
  source_links: string[]
  is_highlight: boolean
  created_at: string
  updated_at: string
}

export type ChefJourneyMedia = {
  id: string
  journey_id: string
  entry_id: string | null
  tenant_id: string
  created_by: string
  media_type: ChefJournalMediaType
  media_url: string
  caption: string
  taken_on: string | null
  location_label: string
  latitude: number | null
  longitude: number | null
  is_cover: boolean
  created_at: string
  updated_at: string
}

export type ChefJourneyRecipeLink = {
  id: string
  journey_id: string
  entry_id: string | null
  tenant_id: string
  created_by: string
  recipe_id: string
  recipe_name: string | null
  adaptation_notes: string
  outcome_notes: string
  outcome_rating: number | null
  first_tested_on: string | null
  would_repeat: boolean
  created_at: string
  updated_at: string
}

export type ChefJourneyIdea = {
  id: string
  journey_id: string
  tenant_id: string
  source_entry_id: string | null
  created_by: string
  title: string
  concept_notes: string
  application_area: ChefJourneyIdeaArea
  status: ChefJourneyIdeaStatus
  priority: number
  expected_impact: string
  test_plan: string
  first_test_date: string | null
  adopted_on: string | null
  adopted_recipe_id: string | null
  created_at: string
  updated_at: string
}

export type JourneyLocationSummary = {
  destination: string
  count: number
}

export type JourneyTopicSummary = {
  topic: string
  count: number
}

export type ChefJourneyInsights = {
  total_journeys: number
  completed_journeys: number
  active_journeys: number
  total_entries: number
  highlights: number
  total_ideas: number
  adopted_ideas: number
  total_media: number
  total_recipe_links: number
  mapped_entries: number
  documented_mistakes: number
  top_destinations: JourneyLocationSummary[]
  top_learning_topics: JourneyTopicSummary[]
}

export const JOURNEY_STATUSES: ChefJourneyStatus[] = [
  'planning',
  'in_progress',
  'completed',
  'archived',
]

export const JOURNEY_ENTRY_TYPES: ChefJourneyEntryType[] = [
  'destination',
  'meal',
  'lesson',
  'experience',
  'idea',
  'reflection',
  'technique',
  'ingredient',
]

export const JOURNEY_IDEA_STATUSES: ChefJourneyIdeaStatus[] = [
  'backlog',
  'testing',
  'adopted',
  'parked',
]

export const JOURNEY_IDEA_AREAS: ChefJourneyIdeaArea[] = [
  'menu',
  'technique',
  'service',
  'sourcing',
  'team',
  'operations',
]
