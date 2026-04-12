'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { nextAuthSignOut } from '@/lib/auth'
import { requireAccessSessionSubject } from '@/lib/auth/access-session'
import {
  appendAccountSecurityControlEvent,
  getAccountAccessEventForReview,
  revokeAllSessionsForUser,
} from './account-access'

export async function signOutAllSessions() {
  const user = await requireAccessSessionSubject()

  await revokeAllSessionsForUser(user.authUserId)
  await appendAccountSecurityControlEvent({
    authUserId: user.authUserId,
    tenantId: user.tenantId,
    type: 'sign_out_all_sessions',
    reason: 'User signed out all active sessions from Account & Security.',
  })

  await clearCurrentSessionAfterRevocation()

  return {
    success: true as const,
    redirectTo:
      '/auth/signin?message=All%20sessions%20were%20signed%20out.%20Sign%20in%20again%20if%20needed.',
  }
}

export async function markAccessEventAsSafe(accessEventId: string) {
  const user = await requireAccessSessionSubject()
  const event = await getAccountAccessEventForReview(user.authUserId, accessEventId)

  if (!event) {
    throw new Error('That sign-in could not be found.')
  }

  if (event.riskLevel === 'normal') {
    throw new Error('Only flagged sign-ins can be marked safe.')
  }

  if (event.review?.status === 'confirmed_safe') {
    return { success: true as const, status: 'confirmed_safe' as const }
  }

  if (event.review?.status === 'secured') {
    throw new Error('This sign-in has already been handled by securing the account.')
  }

  await appendAccountSecurityControlEvent({
    authUserId: user.authUserId,
    tenantId: user.tenantId,
    type: 'access_event_confirmed_safe',
    accessEventId,
    reason: `User confirmed a flagged sign-in was expected (${event.device.label} from ${event.locationLabel}).`,
  })

  revalidatePath('/settings/account')
  revalidatePath('/account-security')

  return { success: true as const, status: 'confirmed_safe' as const }
}

export async function secureAccountFromAccessEvent(accessEventId: string) {
  const user = await requireAccessSessionSubject()
  const event = await getAccountAccessEventForReview(user.authUserId, accessEventId)

  if (!event) {
    throw new Error('That sign-in could not be found.')
  }

  if (event.riskLevel === 'normal') {
    throw new Error('Only flagged sign-ins can trigger account containment.')
  }

  if (event.review?.status === 'confirmed_safe') {
    throw new Error(
      'This sign-in was already marked safe. Use sign out all sessions if you still want to contain access.'
    )
  }

  if (event.review?.status === 'secured') {
    return {
      success: true as const,
      redirectTo:
        '/auth/signin?message=Your%20account%20was%20already%20secured.%20Sign%20in%20again%20if%20needed.',
    }
  }

  await revokeAllSessionsForUser(user.authUserId)
  await appendAccountSecurityControlEvent({
    authUserId: user.authUserId,
    tenantId: user.tenantId,
    type: 'access_event_secured',
    accessEventId,
    reason: `User secured the account after a flagged sign-in (${event.device.label} from ${event.locationLabel}).`,
  })

  await clearCurrentSessionAfterRevocation()

  return {
    success: true as const,
    redirectTo:
      '/auth/signin?message=Your%20account%20was%20secured.%20All%20sessions%20were%20signed%20out.',
  }
}

async function clearCurrentSessionAfterRevocation() {
  try {
    await nextAuthSignOut({ redirect: false })
  } catch (error) {
    console.error('[auth] Failed to sign out the current session after global revoke:', error)
  }

  const cookieStore = cookies()
  cookieStore.delete('chefflow-role-cache')
  cookieStore.delete('chefflow-session-only')

  revalidatePath('/', 'layout')
  revalidatePath('/settings/account')
  revalidatePath('/account-security')
}
