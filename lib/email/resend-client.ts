// Resend Client - Singleton initialization
// Used by all email sending functions

import { Resend } from 'resend'

let resendClient: Resend | null = null

export function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured')
    }
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'info@cheflowhq.com'
export const FROM_NAME = 'ChefFlow'
