import { requireChef } from '@/lib/auth/get-user'
import { isAdmin } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'
import { getHubStats, getStubsSeekingChef } from '@/lib/hub/integration-actions'
import { HubOverviewClient } from './hub-overview-client'

export default async function HubOverviewPage() {
  const user = await requireChef()
  const admin = await isAdmin()

  if (!admin) {
    redirect('/dashboard')
  }

  const [stats, stubs] = await Promise.all([getHubStats(), getStubsSeekingChef()])

  return <HubOverviewClient stats={stats} stubs={stubs} tenantId={user.tenantId!} />
}

export const dynamic = 'force-dynamic'
