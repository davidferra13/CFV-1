export type HubInviteCopyRole = 'chef' | 'client' | 'member'

export function deriveInviteCopyRole(input: {
  membershipRole: string
  clientId?: string | null
  authUserId?: string | null
  roleHint?: HubInviteCopyRole | null
}): HubInviteCopyRole {
  if (input.roleHint) return input.roleHint
  if (input.membershipRole === 'chef') return 'chef'
  if (input.clientId) return 'client'
  if (input.authUserId) return 'chef'
  return 'member'
}

export function getInviteRoleLabel(copyRole: HubInviteCopyRole): string {
  switch (copyRole) {
    case 'chef':
      return 'Chef Invite'
    case 'client':
      return 'Host Invite'
    default:
      return 'Member Invite'
  }
}

export function formatInviteSenderLabel(copyRole: HubInviteCopyRole, displayName: string): string {
  if (copyRole === 'chef') {
    return `Chef ${displayName}`
  }
  return displayName
}

export function buildCircleInviteShareMessage(input: {
  copyRole: HubInviteCopyRole
  occasion?: string | null
  inviteUrl: string
}): string {
  const circleLabel = input.occasion ? ` for ${input.occasion}` : ''

  switch (input.copyRole) {
    case 'chef':
      return `I set up our Dinner Circle${circleLabel}. Use this link for updates, dietary notes, and the full plan: ${input.inviteUrl}`
    case 'client':
      return `I started a Dinner Circle${circleLabel} so everyone stays in sync. Use this link for updates, dietary notes, and the plan: ${input.inviteUrl}`
    default:
      return `Join our Dinner Circle${circleLabel}. This is where we are keeping updates and dietary notes: ${input.inviteUrl}`
  }
}
