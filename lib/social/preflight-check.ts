// Social Post Pre-Flight Check
// Pure computation - no server action, no PII leaving the machine.
// Run before publishing any social post to catch NDA/permission violations.

export type PreflightWarning = {
  type: 'hard_block' | 'requires_confirmation' | 'soft_warning'
  message: string
  clientId?: string
  clientName?: string
}

export type PreflightResult = {
  canPost: boolean // false if any hard_block exists
  warnings: PreflightWarning[]
}

export function runPreflightChecks(params: {
  postText: string
  clientsInPhotos: Array<{ id: string; name: string; photo_permission: string }>
  mentionedClientNames: string[]
  locationTag?: string
  clientAddresses: Array<{ clientId: string; address: string }>
}): PreflightResult {
  const { postText, clientsInPhotos, mentionedClientNames } = params
  const warnings: PreflightWarning[] = []

  // Check photo permissions for each client in photos
  for (const client of clientsInPhotos) {
    if (client.photo_permission === 'none') {
      warnings.push({
        type: 'hard_block',
        message: `Photos of ${client.name}'s event cannot be posted - NDA/no-photo agreement in effect`,
        clientId: client.id,
        clientName: client.name,
      })
    } else if (client.photo_permission === 'public_with_approval') {
      warnings.push({
        type: 'requires_confirmation',
        message: `Confirm ${client.name} approved this post`,
        clientId: client.id,
        clientName: client.name,
      })
    }
  }

  // Check if post text mentions any client names
  for (const name of mentionedClientNames) {
    if (postText.toLowerCase().includes(name.toLowerCase())) {
      warnings.push({
        type: 'soft_warning',
        message: `Post may reference client ${name} - confirm they're okay being mentioned publicly`,
        clientName: name,
      })
    }
  }

  return {
    canPost: !warnings.some((w) => w.type === 'hard_block'),
    warnings,
  }
}
