import type { PageInfoEntry } from '../page-info-types'

export const AUTH_PAGES_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/auth/signin': {
    title: 'Sign In',
    description: 'Sign in to your ChefFlow account.',
    features: [
      'Email and password login',
      'Google sign-in',
      'Forgot password link',
      'Links to signup',
    ],
  },

  '/auth/signup': {
    title: 'Sign Up',
    description: 'Create your ChefFlow account — start managing your private chef business.',
    features: ['Chef or client signup', 'Invitation token support', 'Business name and phone'],
  },

  '/auth/client-signup': {
    title: 'Client Sign Up',
    description: "Create a client account — access your chef's portal.",
    features: ['Client-specific form', 'Invitation pre-fill', 'Name, phone, password'],
  },

  '/auth/partner-signup': {
    title: 'Partner Claim',
    description: 'Claim your referral partner account via invitation link.',
    features: ['Invitation verification', 'Account creation', 'Auto-redirect to partner dashboard'],
  },

  '/auth/role-selection': {
    title: 'Choose Your Role',
    description: "Select whether you're a chef or a client.",
    features: ['Two-button role choice', 'Clear role descriptions'],
  },

  '/auth/verify-email': {
    title: 'Verify Email',
    description: 'Check your email for a verification link.',
    features: ['Verification instructions', 'Link to sign in if verified'],
  },

  '/auth/forgot-password': {
    title: 'Forgot Password',
    description: 'Request a password reset link via email.',
    features: ['Email input', 'Success confirmation', 'Try again option'],
  },

  '/auth/reset-password': {
    title: 'Reset Password',
    description: 'Set a new password after clicking the reset link.',
    features: ['New password entry', 'Confirmation field', 'Strength requirements'],
  },
}
