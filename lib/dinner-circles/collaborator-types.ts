// Circle Collaborator Types
// Defines roles, statuses, and shapes for circle-level collaboration.

export type CircleCollaboratorRole =
  | 'co_host'    // Equal partner in the circle, can manage guests and post updates
  | 'sous_chef'  // Kitchen-side collaborator, can view circle and post updates
  | 'server'     // Front-of-house staff, can view guest info and post updates
  | 'observer'   // Read-only access to the circle

export type CircleCollaboratorStatus =
  | 'pending'    // Invitation sent, awaiting response
  | 'active'     // Accepted and participating
  | 'removed'    // Removed by circle owner

export interface CircleCollaborator {
  id: string
  circle_id: string
  user_id: string
  role: CircleCollaboratorRole
  status: CircleCollaboratorStatus
  invited_by: string
  invited_at: string
  accepted_at: string | null
  // Joined profile fields (populated by queries)
  display_name?: string | null
  email?: string | null
  profile_image_url?: string | null
}

export interface CollaborationInvite {
  id: string
  circle_id: string
  circle_name: string
  role: CircleCollaboratorRole
  status: CircleCollaboratorStatus
  invited_by: string
  invited_by_name: string | null
  invited_at: string
}
