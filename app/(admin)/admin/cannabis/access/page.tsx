import { requireAdmin } from '@/lib/auth/admin'
import { getCannabisAccessOverview } from '@/lib/admin/cannabis-age-actions'
import { AdminCannabisAccessClient } from './admin-cannabis-access-client'

export default async function AdminCannabisAccessPage() {
  await requireAdmin()
  const data = await getCannabisAccessOverview()

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Cannabis Access Management</h1>
      <p className="text-muted-foreground text-sm">
        Manage cannabis tier access, age permissions, and dinner requests.
      </p>
      <AdminCannabisAccessClient data={data} />
    </div>
  )
}
