// Chef Collaboration System — Shared Types
// Defines roles, statuses, and permissions for cross-chef event collaboration.

export type CollaboratorRole =
  | 'primary' // Runs the event — full permissions (what new primary gets on handoff)
  | 'co_host' // Equal partner — most permissions, configurable
  | 'sous_chef' // Supports primary — limited to kitchen-side actions
  | 'observer' // Read-only — typically the original chef after handoff

export type CollaboratorStatus =
  | 'pending' // Invitation sent, awaiting response
  | 'accepted' // Actively collaborating
  | 'declined' // Chef declined the invitation
  | 'removed' // Removed by event owner after accepting

export interface CollaboratorPermissions {
  can_modify_menu: boolean // Edit menu items, quantities, and descriptions
  can_assign_staff: boolean // Assign staff from the chef's own roster to this event
  can_view_financials: boolean // See ledger entries, expenses, and pricing
  can_communicate_with_client: boolean // Send messages to the client directly
  can_close_event: boolean // Mark event completed or initiate cancellation
}

// Default permission sets per role
export const ROLE_DEFAULTS: Record<CollaboratorRole, CollaboratorPermissions> = {
  primary: {
    can_modify_menu: true,
    can_assign_staff: true,
    can_view_financials: true,
    can_communicate_with_client: true,
    can_close_event: true,
  },
  co_host: {
    can_modify_menu: true,
    can_assign_staff: true,
    can_view_financials: true,
    can_communicate_with_client: true,
    can_close_event: false,
  },
  sous_chef: {
    can_modify_menu: false,
    can_assign_staff: true,
    can_view_financials: false,
    can_communicate_with_client: false,
    can_close_event: false,
  },
  observer: {
    can_modify_menu: false,
    can_assign_staff: false,
    can_view_financials: true, // Observers can see financials (e.g. original chef after handoff)
    can_communicate_with_client: false,
    can_close_event: false,
  },
}

export type RecipeShareStatus = 'pending' | 'accepted' | 'declined'

// Lightweight chef profile for display in collaboration UI
export interface CollaboratorChefProfile {
  id: string
  business_name: string
  display_name: string | null
  profile_image_url: string | null
  email: string
}

export interface EventCollaborator {
  id: string
  event_id: string
  chef_id: string
  invited_by_chef_id: string
  role: CollaboratorRole
  status: CollaboratorStatus
  permissions: CollaboratorPermissions
  note: string | null
  responded_at: string | null
  created_at: string
  chef: CollaboratorChefProfile
  invited_by: CollaboratorChefProfile
}

export interface RecipeShare {
  id: string
  original_recipe_id: string
  from_chef_id: string
  to_chef_id: string
  status: RecipeShareStatus
  note: string | null
  created_recipe_id: string | null
  responded_at: string | null
  created_at: string
  from_chef: CollaboratorChefProfile
  to_chef: CollaboratorChefProfile
}
