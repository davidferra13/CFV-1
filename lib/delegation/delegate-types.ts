// ---------------------------------------------------------------------------
// Delegate Access: shared types
// ---------------------------------------------------------------------------

/** Permission level for a delegate */
export type DelegateRole = 'full_delegate' | 'view_coordinate'

/** Granular permission flags */
export type DelegatePermission =
  | 'view_events'
  | 'view_finances'
  | 'manage_guests'
  | 'approve_menus'
  | 'handle_payments'
  | 'answer_logistics'
  | 'post_updates'

/** Delegate status in lifecycle */
export type DelegateStatus = 'invited' | 'active' | 'revoked'

/** A delegate record (chef_delegates row) */
export type DelegateRecord = {
  id: string
  chefTenantId: string
  delegateUserId: string | null
  delegateEmail: string
  delegateName: string | null
  delegatePhone: string | null
  role: DelegateRole
  permissions: DelegatePermission[]
  status: DelegateStatus
  inviteToken: string
  invitedAt: string
  acceptedAt: string | null
  revokedAt: string | null
}

/** Input for creating a delegate invite */
export type DelegateInviteInput = {
  email: string
  name?: string
  phone?: string
  role: DelegateRole
  permissions: DelegatePermission[]
}

/** Activity log entry for delegate actions */
export type DelegateActivityLogEntry = {
  id: string
  delegateId: string
  action: string
  resourceType: string | null
  resourceId: string | null
  detailsJson: Record<string, unknown> | null
  createdAt: string
}

/** Default permissions by role */
export const DEFAULT_PERMISSIONS: Record<DelegateRole, DelegatePermission[]> = {
  full_delegate: [
    'view_events',
    'view_finances',
    'manage_guests',
    'approve_menus',
    'handle_payments',
    'answer_logistics',
    'post_updates',
  ],
  view_coordinate: [
    'view_events',
    'manage_guests',
    'answer_logistics',
  ],
}
