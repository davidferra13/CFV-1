'use server'

import type { HubInviteCopyRole } from './invite-copy'
import { getHubInviteLinkContext } from './invite-links'

export async function getCircleInviteLinkContext(input: {
  groupToken: string
  profileToken: string
  roleHint?: HubInviteCopyRole | null
}) {
  return getHubInviteLinkContext(input)
}
