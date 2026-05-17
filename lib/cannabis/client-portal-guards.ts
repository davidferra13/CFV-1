import 'server-only'

import { redirect } from 'next/navigation'
import { requireClient, type AuthUser } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { isAdmin } from '@/lib/auth/admin'

export type CannabisAccessStatus = {
  hasTierAccess: boolean
  tierStatus: string | null
  hasAgePermission: boolean
  ageStatus: string | null
  ageExpired: boolean
  canAccessPortal: boolean
}

export async function getClientCannabisAccessStatus(
  authUserId: string
): Promise<CannabisAccessStatus> {
  const db: any = createServerClient()

  const [tierResult, ageResult] = await Promise.all([
    db.from('cannabis_tier_users').select('status').eq('auth_user_id', authUserId).maybeSingle(),
    db
      .from('cannabis_age_permissions')
      .select('status, expires_at')
      .eq('auth_user_id', authUserId)
      .maybeSingle(),
  ])

  const tierStatus = tierResult.data?.status ?? null
  const hasTierAccess = tierStatus === 'active'

  const ageRecord = ageResult.data
  const ageStatus = ageRecord?.status ?? 'not_submitted'
  const ageExpired =
    ['approved', 'self_attested', 'manually_verified'].includes(ageStatus) &&
    ageRecord?.expires_at &&
    new Date(ageRecord.expires_at) < new Date()
  const hasAgePermission =
    !ageExpired &&
    (ageStatus === 'approved' || ageStatus === 'manually_verified' || ageStatus === 'self_attested')

  return {
    hasTierAccess,
    tierStatus,
    hasAgePermission,
    ageStatus,
    ageExpired: !!ageExpired,
    canAccessPortal: hasTierAccess && hasAgePermission,
  }
}

export async function requireClientCannabisAccess(): Promise<
  AuthUser & { accessStatus: CannabisAccessStatus }
> {
  const user = await requireClient()

  const adminCheck = await isAdmin().catch(() => false)
  if (adminCheck) {
    return {
      ...user,
      accessStatus: {
        hasTierAccess: true,
        tierStatus: 'active',
        hasAgePermission: true,
        ageStatus: 'manually_verified',
        ageExpired: false,
        canAccessPortal: true,
      },
    }
  }

  const accessStatus = await getClientCannabisAccessStatus(user.id)

  if (!accessStatus.canAccessPortal) {
    redirect('/my-events')
  }

  return { ...user, accessStatus }
}
