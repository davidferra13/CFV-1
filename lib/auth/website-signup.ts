const INVALID_EMAIL_MESSAGE = 'Please enter a valid email address.'
const PASSWORD_MIN_LENGTH_MESSAGE = 'Password must be at least 8 characters.'
const PASSWORD_MAX_LENGTH_MESSAGE = 'Password must be 128 characters or fewer.'
const FULL_NAME_REQUIRED_MESSAGE = 'Full name is required.'
const INVITATION_EMAIL_MISMATCH_MESSAGE =
  'Please use the same email address that received the invitation.'
const WEBSITE_SIGNUP_NETWORK_ERROR_MESSAGE =
  'Connection issue while creating your account. Please check your network and try again.'
const WEBSITE_SIGNUP_FALLBACK_ERROR_MESSAGE = 'Account creation failed. Please try again.'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type WebsiteSignupValidationInput = {
  email: string
  password: string
  fullName?: string
  invitationEmail?: string
}

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function validateWebsiteSignupInput(input: WebsiteSignupValidationInput): string | null {
  const email = normalizeAuthEmail(input.email)
  if (!EMAIL_PATTERN.test(email)) {
    return INVALID_EMAIL_MESSAGE
  }

  if (input.password.length < 8) {
    return PASSWORD_MIN_LENGTH_MESSAGE
  }

  if (input.password.length > 128) {
    return PASSWORD_MAX_LENGTH_MESSAGE
  }

  if (input.fullName !== undefined && !input.fullName.trim()) {
    return FULL_NAME_REQUIRED_MESSAGE
  }

  if (input.invitationEmail) {
    const invitedEmail = normalizeAuthEmail(input.invitationEmail)
    if (email !== invitedEmail) {
      return INVITATION_EMAIL_MISMATCH_MESSAGE
    }
  }

  return null
}

export function normalizeWebsiteSignupErrorMessage(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes('too many attempts')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('fetch failed') ||
    normalized.includes('networkerror') ||
    normalized.includes('network request failed') ||
    normalized.includes('load failed')
  ) {
    return WEBSITE_SIGNUP_NETWORK_ERROR_MESSAGE
  }

  if (normalized.includes('invalid or expired invitation')) {
    return 'This invitation link is invalid or expired.'
  }

  if (normalized.includes('email does not match invitation')) {
    return INVITATION_EMAIL_MISMATCH_MESSAGE
  }

  if (normalized.includes('account creation failed')) {
    return 'Account creation failed. If you already have an account, try signing in instead.'
  }

  return message || WEBSITE_SIGNUP_FALLBACK_ERROR_MESSAGE
}
