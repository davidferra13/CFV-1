// Client-Provided Menus: types for client menu submissions and chef review workflow.
// Clients submit menu ideas (token-based, no login). Chefs review, accept, modify, or counter-propose.

export type SubmissionStatus =
  | 'pending'
  | 'accepted'
  | 'modified'
  | 'rejected'
  | 'counter_proposed'

export type ChefReviewAction = 'accept' | 'reject' | 'modify' | 'counter_propose'

export type ClientMenuInput = {
  text_description: string
  dish_list: string[]
  dietary_notes?: string
  inspiration_urls?: string[]
}

export type ClientMenuSubmission = {
  id: string
  event_id: string
  tenant_id: string
  submitted_by_token: string
  status: SubmissionStatus
  raw_text: string
  parsed_dishes: string[]
  dietary_notes: string | null
  inspiration_urls: string[] | null
  chef_notes: string | null
  counter_menu_id: string | null
  reviewed_at: string | null
  created_at: string
}

export type CounterProposal = {
  submission_id: string
  menu_id: string
  notes: string
}
