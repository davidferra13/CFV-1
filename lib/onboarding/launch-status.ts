import type { ChefFullProfile } from '@/lib/chef/profile-actions'
import type { ConnectAccountStatus } from '@/lib/stripe/connect'

export type LaunchStatus = {
  profileDone: boolean
  publicUrlDone: boolean
  paymentsDone: boolean
  completedSteps: number
  totalSteps: number
  displayName: string | null
  slug: string | null
}

export function getLaunchStatus(
  profile: ChefFullProfile | null,
  connectStatus: ConnectAccountStatus
): LaunchStatus {
  const displayName = profile?.display_name?.trim() || profile?.business_name?.trim() || null
  const slug = profile?.slug?.trim() || null

  const profileDone = !!displayName
  const publicUrlDone = !!slug
  const paymentsDone = connectStatus.connected

  return {
    profileDone,
    publicUrlDone,
    paymentsDone,
    completedSteps: [profileDone, publicUrlDone, paymentsDone].filter(Boolean).length,
    totalSteps: 3,
    displayName,
    slug,
  }
}
