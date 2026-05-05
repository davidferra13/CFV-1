'use server'

import { auth } from '@/lib/auth'
import { performReauth } from './reauth'

/**
 * Server action: verify password for re-authentication.
 */
export async function reauthenticateAction(
  password: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!password || password.length < 1) {
    return { success: false, error: 'Password is required' }
  }

  return performReauth(session.user.id, password)
}
