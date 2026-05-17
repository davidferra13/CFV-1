import { requireClient } from '@/lib/auth/get-user'
import { getClientCannabisAccessStatus } from '@/lib/cannabis/client-portal-guards'
import { isAdmin } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'

export default async function ClientCannabisLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClient()

  const adminCheck = await isAdmin().catch(() => false)
  if (adminCheck) return <>{children}</>

  const accessStatus = await getClientCannabisAccessStatus(user.id)

  if (!accessStatus.hasTierAccess) {
    redirect('/my-events')
  }

  return <>{children}</>
}
