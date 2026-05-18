import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'

import { getClientCannabisAccessStatus } from '@/lib/cannabis/client-portal-guards'
import { getClientCannabisPortalData } from '@/lib/cannabis/client-portal-actions'
import { CannabisPortalDashboard } from './cannabis-portal-dashboard'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Cannabis Preferences' }

export default async function ClientCannabisPage() {
  const user = await requireClient()
  const accessStatus = await getClientCannabisAccessStatus(user.id)

  if (!accessStatus.hasAgePermission) {
    redirect('/my-cannabis/age-required')
  }

  const data = await getClientCannabisPortalData()

  if (!data.authorized) {
    return null
  }

  return <CannabisPortalDashboard data={data} />
}
