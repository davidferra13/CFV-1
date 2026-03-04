const GOOGLE_OAUTH_GENERIC_ERROR =
  'Google sign-in is temporarily unavailable. Please use email and password.'

const NETWORK_ERROR_MESSAGE =
  'Connection issue while reaching Google sign-in. Please check your network and try again.'

export function normalizeGoogleOAuthErrorMessage(message: string): string {
  const normalized = message.toLowerCase()

  if (
    normalized.includes('invalid next_public_site_url') ||
    normalized.includes('must be set for google oauth') ||
    normalized.includes('unable to determine oauth callback origin')
  ) {
    return GOOGLE_OAUTH_GENERIC_ERROR
  }

  if (
    normalized.includes('provider is not enabled') ||
    normalized.includes('unsupported provider') ||
    normalized.includes('oauth provider not supported') ||
    normalized.includes('oauth provider not enabled')
  ) {
    return GOOGLE_OAUTH_GENERIC_ERROR
  }

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('fetch failed') ||
    normalized.includes('networkerror') ||
    normalized.includes('network request failed') ||
    normalized.includes('load failed')
  ) {
    return NETWORK_ERROR_MESSAGE
  }

  return message || GOOGLE_OAUTH_GENERIC_ERROR
}

export function isGoogleAuthButtonEnabled(envValue = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH) {
  const normalized = (envValue ?? '').trim().toLowerCase()
  if (!normalized) return true
  return normalized !== '0' && normalized !== 'false' && normalized !== 'off'
}
