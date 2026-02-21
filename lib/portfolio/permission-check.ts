// Portfolio photo permission check — pure computation

export type PhotoPermissionStatus = {
  effectivePermission: 'none' | 'portfolio_only' | 'public_with_approval' | 'public_freely'
  canUseInSocialPost: boolean
  requiresApproval: boolean
  source: 'client_setting' | 'photo_override' | 'default'
}

export function getPhotoPermissionStatus(params: {
  clientPhotoPermission: string | null
  photoPermissionOverride: string | null
}): PhotoPermissionStatus {
  const { clientPhotoPermission, photoPermissionOverride } = params

  let effectivePermission: PhotoPermissionStatus['effectivePermission'] = 'none'
  let source: PhotoPermissionStatus['source'] = 'default'

  if (photoPermissionOverride) {
    effectivePermission = photoPermissionOverride as PhotoPermissionStatus['effectivePermission']
    source = 'photo_override'
  } else if (clientPhotoPermission) {
    effectivePermission = clientPhotoPermission as PhotoPermissionStatus['effectivePermission']
    source = 'client_setting'
  }

  return {
    effectivePermission,
    canUseInSocialPost: effectivePermission !== 'none',
    requiresApproval: effectivePermission === 'public_with_approval',
    source,
  }
}
